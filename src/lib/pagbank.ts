// Cliente da API PagBank (avaliada em developer.pagbank.com.br/reference).
// Duas famílias de endpoints:
//  - Orders API (pedidos avulsos, PIX): {api|sandbox.api}.pagseguro.com
//  - Assinaturas (planos + subscriptions): {api|sandbox.api}.assinaturas.pagseguro.com
// Autenticação: Authorization: Bearer <PAGBANK_TOKEN>.

import { db } from "@/lib/db";
import { PRECO_ASSINATURA_CENTAVOS, PRECO_AVULSO_CENTAVOS } from "@/lib/precos";

const CHAVE_PLANO = "pagbank_plano_mensal_id";

export function pagbankConfigurado(): boolean {
  return Boolean(process.env.PAGBANK_TOKEN);
}

export function pagbankBaseUrl(): string {
  return process.env.PAGBANK_ENV === "production"
    ? "https://api.pagseguro.com"
    : "https://sandbox.api.pagseguro.com";
}

export function pagbankAssinaturasBaseUrl(): string {
  return process.env.PAGBANK_ENV === "production"
    ? "https://api.assinaturas.pagseguro.com"
    : "https://sandbox.api.assinaturas.pagseguro.com";
}

function urlWebhook(): string {
  return `${process.env.NEXT_PUBLIC_URL ?? "http://localhost:3000"}/api/webhooks/pagbank`;
}

export class ErroPagbank extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly corpo: unknown
  ) {
    super(message);
  }
}

async function chamar<T>(
  base: string,
  caminho: string,
  init?: RequestInit & { idempotencia?: string }
): Promise<T> {
  const token = process.env.PAGBANK_TOKEN;
  if (!token) throw new ErroPagbank("PAGBANK_TOKEN não configurado", 0, null);

  const resposta = await fetch(`${base}${caminho}`, {
    ...init,
    cache: "no-store",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(init?.idempotencia ? { "x-idempotency-key": init.idempotencia } : {}),
    },
  });

  const corpo = await resposta.json().catch(() => null);
  if (!resposta.ok) {
    throw new ErroPagbank(
      `PagBank ${caminho} respondeu ${resposta.status}`,
      resposta.status,
      corpo
    );
  }
  return corpo as T;
}

// ---------- Orders API: compra avulsa via PIX ----------

export interface PedidoPix {
  orderId: string;
  copiaECola: string;
  qrImagemUrl: string | null;
  expiraEm: string;
}

interface RespostaOrder {
  id: string;
  reference_id?: string;
  charges?: Array<{ id: string; status: string; payment_method?: { type?: string } }>;
  qr_codes?: Array<{
    text: string;
    expiration_date?: string;
    links?: Array<{ rel: string; href: string; media?: string }>;
  }>;
}

/** Cria um pedido com QR Code PIX para 1 sorteio avulso. */
export async function criarPedidoPix(dados: {
  referenceId: string;
  nomeCliente: string;
  emailCliente: string;
  cpf: string;
}): Promise<PedidoPix> {
  const expiraEm = new Date(Date.now() + 60 * 60 * 1000).toISOString();

  const ordem = await chamar<RespostaOrder>(pagbankBaseUrl(), "/orders", {
    method: "POST",
    idempotencia: dados.referenceId,
    body: JSON.stringify({
      reference_id: dados.referenceId,
      customer: {
        name: dados.nomeCliente,
        email: dados.emailCliente,
        tax_id: dados.cpf,
      },
      items: [
        {
          name: "TDM Sorteios: 1 sorteio de inauguração",
          quantity: 1,
          unit_amount: PRECO_AVULSO_CENTAVOS,
        },
      ],
      qr_codes: [
        { amount: { value: PRECO_AVULSO_CENTAVOS }, expiration_date: expiraEm },
      ],
      notification_urls: [urlWebhook()],
    }),
  });

  const qr = ordem.qr_codes?.[0];
  if (!qr) {
    throw new ErroPagbank("Pedido criado sem QR Code na resposta", 200, ordem);
  }
  const imagem =
    qr.links?.find((l) => l.rel?.toUpperCase().includes("QRCODE") || l.media === "image/png")
      ?.href ?? null;

  return {
    orderId: ordem.id,
    copiaECola: qr.text,
    qrImagemUrl: imagem,
    expiraEm: qr.expiration_date ?? expiraEm,
  };
}

export async function consultarPedido(orderId: string): Promise<RespostaOrder> {
  return chamar<RespostaOrder>(pagbankBaseUrl(), `/orders/${orderId}`, {
    method: "GET",
  });
}

/** true se alguma charge do pedido está paga. */
export function pedidoPago(ordem: RespostaOrder): boolean {
  return Boolean(ordem.charges?.some((c) => c.status === "PAID"));
}

// ---------- Assinaturas: plano mensal + subscription ----------

interface RespostaPlano {
  id: string;
}

/**
 * Garante o plano mensal no PagBank (cria uma única vez e guarda o id na
 * tabela Config). Se o preço mudar em precos.ts, crie um plano novo apagando
 * a chave "pagbank_plano_mensal_id".
 */
export async function garantirPlanoMensal(): Promise<string> {
  const existente = await db.config.findUnique({ where: { chave: CHAVE_PLANO } });
  if (existente) return existente.valor;

  const plano = await chamar<RespostaPlano>(
    pagbankAssinaturasBaseUrl(),
    "/plans",
    {
      method: "POST",
      idempotencia: "tdm-plano-mensal-v1",
      body: JSON.stringify({
        reference_id: "tdm-plano-mensal-v1",
        name: "TDM Sorteios: plano mensal ilimitado",
        description:
          "Sorteios ilimitados de inauguração enquanto a assinatura estiver ativa.",
        amount: { value: PRECO_ASSINATURA_CENTAVOS, currency: "BRL" },
        interval: { unit: "MONTH", length: 1 },
        payment_method: ["CREDIT_CARD"],
      }),
    }
  );

  await db.config.create({ data: { chave: CHAVE_PLANO, valor: plano.id } });
  return plano.id;
}

export interface RespostaAssinatura {
  id: string;
  status?: string;
  next_invoice_at?: string;
  payment_method?: Array<{
    type?: string;
    card?: { brand?: string; last_digits?: string };
  }>;
}

/** Cria a assinatura mensal com cartão criptografado no navegador. */
export async function criarAssinaturaPagbank(dados: {
  usuarioId: string;
  nome: string;
  email: string;
  cpf: string;
  telefone: { ddd: string; numero: string };
  cartaoCriptografado: string;
  titularCartao: string;
}): Promise<RespostaAssinatura> {
  const planoId = await garantirPlanoMensal();
  const cartao = {
    type: "CREDIT_CARD",
    card: {
      encrypted: dados.cartaoCriptografado,
      holder: { name: dados.titularCartao },
    },
  };

  return chamar<RespostaAssinatura>(
    pagbankAssinaturasBaseUrl(),
    "/subscriptions",
    {
      method: "POST",
      idempotencia: `subs-${dados.usuarioId}-${planoId}`,
      body: JSON.stringify({
        reference_id: dados.usuarioId,
        plan: { id: planoId },
        customer: {
          reference_id: dados.usuarioId,
          name: dados.nome,
          email: dados.email,
          tax_id: dados.cpf,
          phones: [
            {
              country: "55",
              area: dados.telefone.ddd,
              number: dados.telefone.numero,
            },
          ],
          billing_info: [cartao],
        },
        payment_method: [cartao],
      }),
    }
  );
}

export async function consultarAssinatura(
  subsId: string
): Promise<RespostaAssinatura> {
  return chamar<RespostaAssinatura>(
    pagbankAssinaturasBaseUrl(),
    `/subscriptions/${subsId}`,
    { method: "GET" }
  );
}

export async function cancelarAssinaturaPagbank(subsId: string): Promise<void> {
  await chamar(pagbankAssinaturasBaseUrl(), `/subscriptions/${subsId}/cancel`, {
    method: "PUT",
  });
}

/** Converte o status do PagBank para o nosso (pendente/ativa/suspensa/cancelada). */
export function statusAssinaturaLocal(statusPagbank?: string): string {
  switch (statusPagbank) {
    case "ACTIVE":
      return "ativa";
    case "SUSPENDED":
    case "OVERDUE":
      return "suspensa";
    case "CANCELED":
    case "EXPIRED":
      return "cancelada";
    default:
      return "pendente";
  }
}
