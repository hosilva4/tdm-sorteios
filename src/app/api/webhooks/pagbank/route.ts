import { NextResponse } from "next/server";
import { pagbankConfigurado } from "@/lib/pagbank";
import {
  conciliarPedidoAvulso,
  sincronizarAssinatura,
} from "@/lib/conciliacao";

/**
 * Webhook do PagBank (pedidos e assinaturas). Autenticidade: em vez de
 * validar a assinatura do corpo, extraímos os ids e reconsultamos a API
 * oficial; só o que a API confirmar altera o banco.
 */
export async function POST(req: Request) {
  if (!pagbankConfigurado()) {
    return NextResponse.json({ ok: false }, { status: 503 });
  }

  const texto = await req.text().catch(() => "");
  const orderId = texto.match(/ORDE_[A-Z0-9-]+/i)?.[0];
  const subsId = texto.match(/SUBS_[A-Z0-9-]+/i)?.[0];

  try {
    if (orderId) await conciliarPedidoAvulso(orderId);
    if (subsId) await sincronizarAssinatura(subsId);
  } catch (e) {
    // Falha temporária (rede/API): 500 faz o PagBank reenviar a notificação.
    console.error("webhook pagbank:", e);
    return NextResponse.json({ ok: false }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
