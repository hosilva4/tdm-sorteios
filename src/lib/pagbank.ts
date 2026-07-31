// Este módulo NUNCA pode chegar ao navegador: o import de "server-only"
// faz o build falhar se algum componente cliente tentar importá-lo,
// garantindo que PAGBANK_TOKEN fica restrito ao servidor.
import "server-only";

// Cliente da API PagBank (avaliada em developer.pagbank.com.br/reference).
// Duas famílias de endpoints:
//  - Orders API (pedidos avulsos, PIX): {api|sandbox.api}.pagseguro.com
//  - Assinaturas (planos + subscriptions): {api|sandbox.api}.assinaturas.pagseguro.com
// Autenticação: Authorization: Bearer <PAGBANK_TOKEN>.

import { db } from "@/lib/db";
import { PRECO_ASSINATURA_CENTAVOS, PRECO_AVULSO_CENTAVOS } from "@/lib/precos";

const CHAVE_PUBLICA_CONFIG = "pagbank_chave_publica_producao";

export function pagbankConfigurado(): boolean {
  return Boolean(process.env.PAGBANK_TOKEN);
}

export function pagbankBaseUrl(): string {
  return process.env.PAGBANK_ENV === "production"
    ? "https://api.pagseguro.com"
    : "https://sandbox.api.pagseguro.com";
}

/**
 * URLs de notificação do pedido. O PagBank só aceita webhooks HTTPS
 * públicos; em dev (http://localhost) retornamos vazio e a confirmação
 * acontece pelo botão "Já paguei, verificar".
 */
function urlsNotificacao(): string[] {
  const base = process.env.NEXT_PUBLIC_URL ?? "";
  if (!base.startsWith("https://")) return [];
  return [`${base}/api/webhooks/pagbank`];
}

export class ErroPagbank extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly corpo: unknown
  ) {
    super(message);
  }

  /** Descrição legível do primeiro erro retornado pela API, se houver. */
  descricao(): string {
    const corpo = this.corpo as
      | { error_messages?: Array<{ description?: string; parameter_name?: string }> }
      | null;
    const erro = corpo?.error_messages?.[0];
    if (!erro?.description) return "";
    return erro.parameter_name
      ? `${erro.description} (${erro.parameter_name})`
      : erro.description;
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

// ---------- chave pública (criptografia de cartão no navegador) ----------

interface RespostaChavePublica {
  public_key?: string;
}

/**
 * Chave pública usada pelo SDK no navegador para criptografar o cartão.
 * Sandbox: usa a chave padrão informada em NEXT_PUBLIC_PAGBANK_PUBLIC_KEY.
 * Produção: é gerada uma única vez via API (POST /public-keys), guardada na
 * tabela Config e reutilizada; a env var, se definida, tem precedência.
 */
export async function obterChavePublicaCartao(): Promise<string> {
  const daEnv = process.env.NEXT_PUBLIC_PAGBANK_PUBLIC_KEY;
  if (daEnv) return daEnv;

  if (process.env.PAGBANK_ENV !== "production" || !pagbankConfigurado()) {
    return "";
  }

  const salva = await db.config.findUnique({
    where: { chave: CHAVE_PUBLICA_CONFIG },
  });
  if (salva) return salva.valor;

  let chave = "";
  try {
    // A chave é única por conta: consulta primeiro; se não existir, cria.
    const existente = await chamar<RespostaChavePublica>(
      pagbankBaseUrl(),
      "/public-keys/card",
      { method: "GET" }
    );
    chave = existente.public_key ?? "";
  } catch {
    try {
      const criada = await chamar<RespostaChavePublica>(
        pagbankBaseUrl(),
        "/public-keys",
        { method: "POST", body: JSON.stringify({ type: "card" }) }
      );
      chave = criada.public_key ?? "";
    } catch (e) {
      console.error("obterChavePublicaCartao:", e);
      return "";
    }
  }

  if (chave) {
    await db.config.upsert({
      where: { chave: CHAVE_PUBLICA_CONFIG },
      create: { chave: CHAVE_PUBLICA_CONFIG, valor: chave },
      update: { valor: chave },
    });
  }
  return chave;
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
      ...(urlsNotificacao().length > 0
        ? { notification_urls: urlsNotificacao() }
        : {}),
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

// ---------- Assinatura mensal via Orders API com recorrência ----------
// (developer.pagbank.com.br/reference/criar-pagar-pedido-com-recorrencia)
// A primeira cobrança (INITIAL) envia o cartão criptografado com store=true
// e recebe de volta um cartão armazenado (CARD_...); as renovações mensais
// (SUBSEQUENT) cobram esse cartão pelo cron /api/cron/renovacoes.

export interface ResultadoCobrancaCartao {
  pago: boolean;
  orderId: string;
  chargeId?: string;
  cartaoId?: string;
  bandeira?: string;
  ultimos4?: string;
  motivoRecusa?: string;
}

interface RespostaOrderCartao {
  id: string;
  charges?: Array<{
    id: string;
    status: string;
    payment_response?: { message?: string };
    payment_method?: {
      card?: { id?: string; brand?: string; last_digits?: string };
    };
  }>;
}

function extrairResultadoCobranca(
  ordem: RespostaOrderCartao
): ResultadoCobrancaCartao {
  const charge = ordem.charges?.[0];
  return {
    pago: charge?.status === "PAID",
    orderId: ordem.id,
    chargeId: charge?.id,
    cartaoId: charge?.payment_method?.card?.id,
    bandeira: charge?.payment_method?.card?.brand,
    ultimos4: charge?.payment_method?.card?.last_digits,
    motivoRecusa:
      charge?.status === "PAID"
        ? undefined
        : charge?.payment_response?.message,
  };
}

/**
 * Primeira cobrança da assinatura: cobra o mês na hora e armazena o cartão
 * no PagBank para as renovações. O CVV passa direto à API; nada é gravado.
 */
export async function cobrarAssinaturaInicial(dados: {
  pagamentoId: string;
  nome: string;
  email: string;
  cpf: string;
  cartaoCriptografado: string;
  cvv: string;
  titularCartao: string;
}): Promise<ResultadoCobrancaCartao> {
  const ordem = await chamar<RespostaOrderCartao>(pagbankBaseUrl(), "/orders", {
    method: "POST",
    idempotencia: dados.pagamentoId,
    body: JSON.stringify({
      reference_id: dados.pagamentoId,
      customer: { name: dados.nome, email: dados.email, tax_id: dados.cpf },
      items: [
        {
          name: "TDM Sorteios: assinatura mensal ilimitada",
          quantity: 1,
          unit_amount: PRECO_ASSINATURA_CENTAVOS,
        },
      ],
      charges: [
        {
          reference_id: dados.pagamentoId,
          description: "Assinatura mensal TDM Sorteios",
          amount: { value: PRECO_ASSINATURA_CENTAVOS, currency: "BRL" },
          payment_method: {
            type: "CREDIT_CARD",
            installments: 1,
            capture: true,
            card: {
              encrypted: dados.cartaoCriptografado,
              security_code: dados.cvv,
              holder: { name: dados.titularCartao },
              // Dentro de card (validado no sandbox): devolve o cartão
              // armazenado (CARD_...) na resposta para as renovações.
              store: true,
            },
          },
          recurring: { type: "INITIAL" },
        },
      ],
      ...(urlsNotificacao().length > 0
        ? { notification_urls: urlsNotificacao() }
        : {}),
    }),
  });

  return extrairResultadoCobranca(ordem);
}

/**
 * Compra avulsa de 1 crédito no cartão (pedido simples, sem recorrência):
 * developer.pagbank.com.br/reference/criar-pagar-pedido-com-cartao
 */
export async function cobrarAvulsoCartao(dados: {
  pagamentoId: string;
  nome: string;
  email: string;
  cpf: string;
  cartaoCriptografado: string;
  cvv: string;
  titularCartao: string;
}): Promise<ResultadoCobrancaCartao> {
  const ordem = await chamar<RespostaOrderCartao>(pagbankBaseUrl(), "/orders", {
    method: "POST",
    idempotencia: dados.pagamentoId,
    body: JSON.stringify({
      reference_id: dados.pagamentoId,
      customer: { name: dados.nome, email: dados.email, tax_id: dados.cpf },
      items: [
        {
          name: "TDM Sorteios: 1 sorteio de inauguração",
          quantity: 1,
          unit_amount: PRECO_AVULSO_CENTAVOS,
        },
      ],
      charges: [
        {
          reference_id: dados.pagamentoId,
          description: "1 sorteio de inauguração TDM Sorteios",
          amount: { value: PRECO_AVULSO_CENTAVOS, currency: "BRL" },
          payment_method: {
            type: "CREDIT_CARD",
            installments: 1,
            capture: true,
            card: {
              encrypted: dados.cartaoCriptografado,
              security_code: dados.cvv,
              holder: { name: dados.titularCartao },
            },
          },
        },
      ],
      ...(urlsNotificacao().length > 0
        ? { notification_urls: urlsNotificacao() }
        : {}),
    }),
  });

  return extrairResultadoCobranca(ordem);
}

/** Renovação mensal: cobra o cartão armazenado (CARD_...) sem criptografia. */
export async function cobrarAssinaturaRecorrente(dados: {
  pagamentoId: string;
  nome: string;
  email: string;
  cpf: string;
  cartaoId: string;
}): Promise<ResultadoCobrancaCartao> {
  const ordem = await chamar<RespostaOrderCartao>(pagbankBaseUrl(), "/orders", {
    method: "POST",
    idempotencia: dados.pagamentoId,
    body: JSON.stringify({
      reference_id: dados.pagamentoId,
      customer: { name: dados.nome, email: dados.email, tax_id: dados.cpf },
      items: [
        {
          name: "TDM Sorteios: renovação da assinatura mensal",
          quantity: 1,
          unit_amount: PRECO_ASSINATURA_CENTAVOS,
        },
      ],
      charges: [
        {
          reference_id: dados.pagamentoId,
          description: "Renovação da assinatura mensal TDM Sorteios",
          amount: { value: PRECO_ASSINATURA_CENTAVOS, currency: "BRL" },
          payment_method: {
            type: "CREDIT_CARD",
            installments: 1,
            capture: true,
            card: { id: dados.cartaoId },
          },
          recurring: { type: "SUBSEQUENT" },
        },
      ],
      ...(urlsNotificacao().length > 0
        ? { notification_urls: urlsNotificacao() }
        : {}),
    }),
  });

  return extrairResultadoCobranca(ordem);
}
