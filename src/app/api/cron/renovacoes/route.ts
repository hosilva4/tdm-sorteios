import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  ErroPagbank,
  cobrarAssinaturaRecorrente,
  estornarCobranca,
  pagbankConfigurado,
} from "@/lib/pagbank";
import { umMesDepois } from "@/lib/datas";
import { PRECO_ASSINATURA_CENTAVOS } from "@/lib/precos";

export const maxDuration = 300;

/**
 * Renovação mensal das assinaturas (chamado pelo cron da Vercel, ver
 * vercel.json). Cobra o cartão armazenado (Orders API, recurring
 * SUBSEQUENT) de cada assinatura ativa vencida; recusa vira "suspensa".
 * Protegido por CRON_SECRET (a Vercel envia o header automaticamente).
 */
export async function GET(req: Request) {
  const segredo = process.env.CRON_SECRET;
  if (!segredo || req.headers.get("authorization") !== `Bearer ${segredo}`) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  if (!pagbankConfigurado()) {
    return NextResponse.json({ ok: false, motivo: "pagbank" }, { status: 503 });
  }

  const agora = new Date();
  const vencidas = await db.assinatura.findMany({
    where: { status: "ativa", proximaCobrancaEm: { lte: agora } },
    include: { usuario: true },
    take: 100,
  });

  let renovadas = 0;
  let suspensas = 0;

  for (const assinatura of vencidas) {
    // Sem cartão armazenado ou CPF não há como renovar: suspende.
    if (!assinatura.pagbankCartaoId || !assinatura.cpfTitular) {
      await db.assinatura.update({
        where: { id: assinatura.id },
        data: { status: "suspensa" },
      });
      suspensas++;
      continue;
    }

    const pagamento = await db.pagamento.create({
      data: {
        usuarioId: assinatura.usuarioId,
        tipo: "assinatura",
        valorCentavos: PRECO_ASSINATURA_CENTAVOS,
        metodo: "cartao",
      },
    });

    try {
      const cobranca = await cobrarAssinaturaRecorrente({
        pagamentoId: pagamento.id,
        nome: assinatura.usuario.nome,
        email: assinatura.usuario.email,
        cpf: assinatura.cpfTitular,
        cartaoId: assinatura.pagbankCartaoId,
      });

      await db.pagamento.update({
        where: { id: pagamento.id },
        data: {
          pagbankOrderId: cobranca.orderId,
          pagbankChargeId: cobranca.chargeId,
          status: cobranca.pago ? "aprovado" : "recusado",
        },
      });

      if (cobranca.pago) {
        await db.assinatura.update({
          where: { id: assinatura.id },
          data: {
            // Conta a partir do vencimento, não de hoje, para não "andar" a data.
            proximaCobrancaEm: umMesDepois(
              assinatura.proximaCobrancaEm ?? agora
            ),
          },
        });
        renovadas++;
      } else {
        await db.assinatura.update({
          where: { id: assinatura.id },
          data: { status: "suspensa" },
        });
        suspensas++;
      }
    } catch (e) {
      console.error("cron renovacoes:", assinatura.id, e);
      if (e instanceof ErroPagbank && e.status >= 400 && e.status < 500) {
        // Erro definitivo (cartão inválido/expirado): suspende.
        await db.pagamento.update({
          where: { id: pagamento.id },
          data: { status: "recusado" },
        });
        await db.assinatura.update({
          where: { id: assinatura.id },
          data: { status: "suspensa" },
        });
        suspensas++;
      } else {
        // Erro temporário: mantém ativa; a próxima execução tenta de novo.
        await db.pagamento.update({
          where: { id: pagamento.id },
          data: { status: "cancelado" },
        });
      }
    }
  }

  // Estornos pendentes de validação de cartão: o estorno logo após a
  // cobrança pode falhar (refund_temporarily_unavailable); reprocessa aqui
  // até concluir, garantindo que a validação de R$ 1,00 nunca fica cobrada.
  const validacoesPendentes = await db.pagamento.findMany({
    where: {
      tipo: "validacao",
      status: "aprovado",
      pagbankChargeId: { not: null },
    },
    take: 50,
  });

  let estornadas = 0;
  for (const pendente of validacoesPendentes) {
    try {
      await estornarCobranca(pendente.pagbankChargeId!, pendente.valorCentavos);
      await db.pagamento.update({
        where: { id: pendente.id },
        data: { status: "estornado" },
      });
      estornadas++;
    } catch (e) {
      console.error("cron renovacoes: estorno de validação:", pendente.id, e);
    }
  }

  return NextResponse.json({
    ok: true,
    vencidas: vencidas.length,
    renovadas,
    suspensas,
    estornadas,
  });
}
