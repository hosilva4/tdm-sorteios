import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { exigirUsuario } from "@/lib/usuario-atual";
import { obterChavePublicaCartao, pagbankConfigurado } from "@/lib/pagbank";
import {
  PRECO_ASSINATURA_CENTAVOS,
  PRECO_AVULSO_CENTAVOS,
  formatarReais,
} from "@/lib/precos";
import { Checkout } from "./Checkout";

const PRODUTOS = {
  avulso: {
    titulo: "Sorteio avulso",
    descricao: "1 crédito para o sorteio de uma inauguração completa.",
    preco: PRECO_AVULSO_CENTAVOS,
    sufixo: "",
  },
  assinatura: {
    titulo: "Assinatura mensal ilimitada",
    descricao:
      "Sorteios ilimitados com renovação automática todo mês no cartão. Cancele quando quiser.",
    preco: PRECO_ASSINATURA_CENTAVOS,
    sufixo: "/mês",
  },
} as const;

/** Checkout unificado: /app/pagamento/avulso e /app/pagamento/assinatura. */
export default async function PaginaPagamento({
  params,
}: {
  params: Promise<{ produto: string }>;
}) {
  const { produto } = await params;
  if (produto !== "avulso" && produto !== "assinatura") notFound();

  const usuario = await exigirUsuario();
  if (produto === "assinatura" && usuario.assinaturaAtiva) {
    redirect("/app/perfil");
  }

  const info = PRODUTOS[produto];
  const configurado = pagbankConfigurado();
  const chavePublica = configurado ? await obterChavePublicaCartao() : "";

  return (
    <div className="espaco-vertical" style={{ paddingBottom: "3rem" }}>
      <div className="cabecalho-pagina">
        <div>
          <p className="texto-pequeno" style={{ margin: 0 }}>
            <Link href="/app/comprar">← Créditos e assinatura</Link>
          </p>
          <h1 style={{ marginBottom: 0 }}>Pagamento</h1>
        </div>
      </div>

      <div className="cartao" style={{ maxWidth: 480 }}>
        <p className="texto-suave texto-pequeno" style={{ margin: 0, textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 700 }}>
          Resumo do pedido
        </p>
        <h3 style={{ margin: "0.25rem 0 0" }}>{info.titulo}</h3>
        <div className="preco-valor">
          {formatarReais(info.preco)}
          {info.sufixo && <small> {info.sufixo}</small>}
        </div>
        <p className="texto-suave" style={{ marginTop: 0 }}>
          {info.descricao}
        </p>

        {!configurado ? (
          <div className="aviso-info">
            Os pagamentos ainda não estão configurados neste ambiente. Nada
            será cobrado.
          </div>
        ) : (
          <Checkout
            produto={produto}
            configurado={configurado}
            chavePublica={chavePublica}
            precoTexto={formatarReais(info.preco)}
          />
        )}
      </div>
    </div>
  );
}
