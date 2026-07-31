"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { exigirUsuario } from "@/lib/usuario-atual";
import {
  ErroPagbank,
  criarAssinaturaPagbank,
  criarPedidoPix,
  pagbankConfigurado,
  statusAssinaturaLocal,
} from "@/lib/pagbank";
import { conciliarPedidoAvulso } from "@/lib/conciliacao";
import { soDigitos } from "@/dominio/telefone";
import { PRECO_ASSINATURA_CENTAVOS, PRECO_AVULSO_CENTAVOS } from "@/lib/precos";

const MSG_NAO_CONFIGURADO =
  "O pagamento ainda não está configurado neste ambiente. " +
  "Defina PAGBANK_TOKEN no servidor (ver docs/DEPLOY.md, seção 4).";

// ---------- compra avulsa via PIX ----------

export interface EstadoCompraPix {
  erro?: string;
  pix?: {
    pagamentoId: string;
    copiaECola: string;
    qrImagemUrl: string | null;
    expiraEm: string;
  };
}

const esquemaCpf = z
  .string()
  .transform(soDigitos)
  .refine((d) => d.length === 11, "Informe um CPF válido (11 dígitos).");

/** Gera um pedido PIX de 1 crédito e devolve o QR Code para a tela. */
export async function comprarAvulso(
  _anterior: EstadoCompraPix,
  formData: FormData
): Promise<EstadoCompraPix> {
  const usuario = await exigirUsuario();
  if (!pagbankConfigurado()) return { erro: MSG_NAO_CONFIGURADO };

  const cpf = esquemaCpf.safeParse(String(formData.get("cpf") ?? ""));
  if (!cpf.success) return { erro: cpf.error.issues[0].message };

  const pagamento = await db.pagamento.create({
    data: {
      usuarioId: usuario.id,
      tipo: "avulso",
      valorCentavos: PRECO_AVULSO_CENTAVOS,
    },
  });

  try {
    const pix = await criarPedidoPix({
      referenceId: pagamento.id,
      nomeCliente: usuario.nome,
      emailCliente: usuario.email,
      cpf: cpf.data,
    });
    await db.pagamento.update({
      where: { id: pagamento.id },
      data: { pagbankOrderId: pix.orderId, metodo: "pix" },
    });
    return {
      pix: {
        pagamentoId: pagamento.id,
        copiaECola: pix.copiaECola,
        qrImagemUrl: pix.qrImagemUrl,
        expiraEm: pix.expiraEm,
      },
    };
  } catch (e) {
    await db.pagamento.update({
      where: { id: pagamento.id },
      data: { status: "cancelado" },
    });
    console.error("comprarAvulso:", e);
    return {
      erro: "Não foi possível gerar o PIX agora. Tente novamente em instantes.",
    };
  }
}

export interface EstadoVerificacao {
  status?: "aprovado" | "pendente";
  erro?: string;
}

/** Botão "Já paguei": reconsulta o pedido no PagBank e credita se estiver pago. */
export async function verificarPagamentoAvulso(
  pagamentoId: string
): Promise<EstadoVerificacao> {
  const usuario = await exigirUsuario();
  const pagamento = await db.pagamento.findUnique({
    where: { id: pagamentoId },
  });
  if (!pagamento || pagamento.usuarioId !== usuario.id) {
    return { erro: "Pagamento não encontrado." };
  }
  if (pagamento.status === "aprovado") {
    return { status: "aprovado" };
  }
  if (!pagamento.pagbankOrderId) {
    return { erro: "Esse pagamento não tem pedido PagBank associado." };
  }

  try {
    const resultado = await conciliarPedidoAvulso(pagamento.pagbankOrderId);
    if (resultado === "aprovado") {
      revalidatePath("/app", "layout");
      return { status: "aprovado" };
    }
    return { status: "pendente" };
  } catch (e) {
    console.error("verificarPagamentoAvulso:", e);
    return { erro: "Não foi possível consultar o pagamento. Tente de novo." };
  }
}

// ---------- assinatura mensal no cartão ----------

export interface EstadoAssinatura {
  ok?: boolean;
  erro?: string;
}

const esquemaAssinatura = z.object({
  titular: z.string().trim().min(2, "Informe o nome impresso no cartão.").max(100),
  cpf: esquemaCpf,
  celular: z
    .string()
    .transform(soDigitos)
    .refine((d) => d.length === 10 || d.length === 11, "Informe o celular com DDD."),
  cartaoCriptografado: z
    .string()
    .min(10, "Não foi possível ler os dados do cartão. Confira e tente de novo."),
  cvv: z.string().regex(/^\d{3,4}$/, "CVV inválido."),
  ultimos4: z.string().regex(/^\d{4}$/).catch(""),
  bandeira: z.string().max(20).catch(""),
});

/**
 * Cria a assinatura mensal (renovação automática: o PagBank cobra o cartão
 * todo mês na data de aniversário; espelhamos a validade em proximaCobrancaEm).
 */
export async function assinarPlano(
  _anterior: EstadoAssinatura,
  formData: FormData
): Promise<EstadoAssinatura> {
  const usuario = await exigirUsuario();
  if (!pagbankConfigurado()) return { erro: MSG_NAO_CONFIGURADO };
  if (usuario.assinaturaAtiva) {
    return { erro: "Você já tem uma assinatura ativa." };
  }

  const dados = esquemaAssinatura.safeParse({
    titular: formData.get("titular") ?? "",
    cpf: String(formData.get("cpf") ?? ""),
    celular: String(formData.get("celular") ?? ""),
    cartaoCriptografado: String(formData.get("cartaoCriptografado") ?? ""),
    cvv: String(formData.get("cvv") ?? ""),
    ultimos4: String(formData.get("ultimos4") ?? ""),
    bandeira: String(formData.get("bandeira") ?? ""),
  });
  if (!dados.success) return { erro: dados.error.issues[0].message };

  const celular = dados.data.celular;

  try {
    const remota = await criarAssinaturaPagbank({
      usuarioId: usuario.id,
      nome: usuario.nome,
      email: usuario.email,
      cpf: dados.data.cpf,
      telefone: { ddd: celular.slice(0, 2), numero: celular.slice(2) },
      cartaoCriptografado: dados.data.cartaoCriptografado,
      cvv: dados.data.cvv,
      titularCartao: dados.data.titular,
    });

    const cartaoRemoto = remota.payment_method?.find((m) => m.card)?.card;
    await db.$transaction(async (tx) => {
      await tx.assinatura.upsert({
        where: { usuarioId: usuario.id },
        create: {
          usuarioId: usuario.id,
          status: statusAssinaturaLocal(remota.status),
          pagbankId: remota.id,
          proximaCobrancaEm: remota.next_invoice_at
            ? new Date(remota.next_invoice_at)
            : null,
          cartaoBandeira: cartaoRemoto?.brand ?? dados.data.bandeira ?? null,
          cartaoUltimos4: cartaoRemoto?.last_digits ?? dados.data.ultimos4 ?? null,
        },
        update: {
          status: statusAssinaturaLocal(remota.status),
          pagbankId: remota.id,
          proximaCobrancaEm: remota.next_invoice_at
            ? new Date(remota.next_invoice_at)
            : null,
          cartaoBandeira: cartaoRemoto?.brand ?? dados.data.bandeira ?? null,
          cartaoUltimos4: cartaoRemoto?.last_digits ?? dados.data.ultimos4 ?? null,
        },
      });
      await tx.pagamento.create({
        data: {
          usuarioId: usuario.id,
          tipo: "assinatura",
          status:
            statusAssinaturaLocal(remota.status) === "ativa"
              ? "aprovado"
              : "pendente",
          valorCentavos: PRECO_ASSINATURA_CENTAVOS,
          metodo: "cartao",
        },
      });
    });

    revalidatePath("/app", "layout");
    return { ok: true };
  } catch (e) {
    console.error("assinarPlano:", e);
    if (e instanceof ErroPagbank && e.status >= 400 && e.status < 500) {
      const detalhe = e.descricao();
      return {
        erro: detalhe
          ? `O PagBank recusou a assinatura: ${detalhe}`
          : "O PagBank recusou os dados do cartão. Confira as informações e tente novamente.",
      };
    }
    return { erro: "Não foi possível criar a assinatura agora. Tente de novo em instantes." };
  }
}
