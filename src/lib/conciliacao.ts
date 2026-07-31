import "server-only";

// Conciliação com o PagBank: usada pelo webhook e pela verificação manual.
// Nunca confiamos no corpo da notificação; sempre reconsultamos a API antes
// de mudar qualquer coisa no banco.

import { db } from "@/lib/db";
import { consultarPedido, pedidoPago } from "@/lib/pagbank";

export type ResultadoConciliacao = "aprovado" | "pendente" | "nao-encontrado";

/**
 * Reconsulta um pedido avulso e, se estiver pago, aprova o Pagamento e
 * credita 1 sorteio. Idempotente: um pagamento já aprovado não credita de novo.
 */
export async function conciliarPedidoAvulso(
  orderId: string
): Promise<ResultadoConciliacao> {
  const ordem = await consultarPedido(orderId);

  const pagamento = await db.pagamento.findFirst({
    where: { OR: [{ pagbankOrderId: ordem.id }, { id: ordem.reference_id ?? "" }] },
  });
  if (!pagamento) return "nao-encontrado";

  if (!pedidoPago(ordem)) return "pendente";

  const charge = ordem.charges?.find((c) => c.status === "PAID");

  await db.$transaction(async (tx) => {
    const atualizados = await tx.pagamento.updateMany({
      where: { id: pagamento.id, status: { not: "aprovado" } },
      data: {
        status: "aprovado",
        metodo: "pix",
        pagbankChargeId: charge?.id,
      },
    });
    // updateMany retorna 0 se outra notificação já aprovou: não credita duas vezes.
    if (atualizados.count > 0 && pagamento.tipo === "avulso") {
      await tx.usuario.update({
        where: { id: pagamento.usuarioId },
        data: { creditos: { increment: 1 } },
      });
    }
  });

  return "aprovado";
}

