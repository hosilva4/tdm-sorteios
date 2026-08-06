import Link from "next/link";
import { db } from "@/lib/db";
import { exigirUsuario } from "@/lib/usuario-atual";
import { obterChavePublicaCartao } from "@/lib/pagbank";
import { PRECO_ASSINATURA_CENTAVOS, formatarReais } from "@/lib/precos";
import {
  BotaoCancelarAssinatura,
  BotaoTrocarCartao,
  FormDadosConta,
  FormSenha,
} from "./PerfilForms";

const ROTULO_TIPO: Record<string, string> = {
  avulso: "Sorteio avulso",
  assinatura: "Assinatura",
  validacao: "Validação de cartão",
};

const ROTULO_PAGAMENTO: Record<string, string> = {
  pendente: "pendente",
  aprovado: "aprovado",
  recusado: "recusado",
  cancelado: "cancelado",
  estornado: "estornado",
};

/** Miniatura do cartão salvo no PagBank (só bandeira e final). */
function CartaoSalvo({
  bandeira,
  ultimos4,
}: {
  bandeira: string | null;
  ultimos4: string;
}) {
  return (
    <div className="my-3 flex aspect-[1.586/1] w-72 max-w-full flex-col justify-between rounded-2xl bg-gradient-to-br from-[#0aa14b] to-[#04672f] p-5 text-white shadow-md">
      <div className="flex items-start justify-between gap-2">
        <span className="text-[10px] uppercase tracking-widest opacity-80">
          Cartão da assinatura
        </span>
        <span className="text-sm font-bold uppercase">
          {bandeira ?? "crédito"}
        </span>
      </div>
      <div className="h-7 w-9 rounded-md bg-gradient-to-br from-yellow-200 to-yellow-500 opacity-90" />
      <div className="font-mono text-base tracking-[0.18em]">
        •••• •••• •••• {ultimos4}
      </div>
    </div>
  );
}

export default async function PaginaPerfil() {
  const usuario = await exigirUsuario();

  const [assinatura, pagamentos, chavePublica] = await Promise.all([
    db.assinatura.findUnique({ where: { usuarioId: usuario.id } }),
    db.pagamento.findMany({
      where: { usuarioId: usuario.id },
      orderBy: { criadoEm: "desc" },
      take: 10,
    }),
    obterChavePublicaCartao(),
  ]);

  const assinaturaAtiva = Boolean(usuario.assinaturaAtiva && assinatura);

  return (
    <div className="espaco-vertical" style={{ paddingBottom: "3rem" }}>
      <div className="cabecalho-pagina">
        <div>
          <p className="texto-pequeno" style={{ margin: 0 }}>
            <Link href="/app">← Meus sorteios</Link>
          </p>
          <h1 style={{ marginBottom: 0 }}>Minha conta</h1>
        </div>
      </div>

      <div className="cartao">
        <h3>Dados de cadastro</h3>
        <FormDadosConta nome={usuario.nome} email={usuario.email} />
      </div>

      <div className="cartao">
        <h3>Senha</h3>
        <FormSenha />
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <div className="cartao flex flex-col">
          <h3>Assinatura</h3>
          {assinaturaAtiva && assinatura ? (
            <>
              <p>
                Plano mensal de{" "}
                <strong>{formatarReais(PRECO_ASSINATURA_CENTAVOS)}</strong>{" "}
                <span className="selo selo-ok">ativa</span>, com sorteios
                ilimitados nas suas inaugurações.
              </p>
              {assinatura.cartaoUltimos4 && (
                <CartaoSalvo
                  bandeira={assinatura.cartaoBandeira}
                  ultimos4={assinatura.cartaoUltimos4}
                />
              )}
              {assinatura.proximaCobrancaEm && (
                <p className="texto-suave texto-pequeno">
                  Renovação automática em{" "}
                  <strong>
                    {assinatura.proximaCobrancaEm.toLocaleDateString("pt-BR")}
                  </strong>
                  , cobrando {formatarReais(PRECO_ASSINATURA_CENTAVOS)} nesse
                  cartão.
                </p>
              )}
              <div className="mt-auto flex flex-wrap items-center gap-2">
                <BotaoTrocarCartao chavePublica={chavePublica} />
                <BotaoCancelarAssinatura />
              </div>
            </>
          ) : assinatura?.status === "suspensa" ? (
            <>
              <p>
                Sua assinatura está{" "}
                <span className="selo selo-neutro">suspensa</span>: a última
                cobrança no cartão não foi aprovada. Regularize para voltar a
                ter sorteios ilimitados.
              </p>
              {assinatura.cartaoUltimos4 && (
                <CartaoSalvo
                  bandeira={assinatura.cartaoBandeira}
                  ultimos4={assinatura.cartaoUltimos4}
                />
              )}
              <div className="mt-auto">
                <Link href="/app/pagamento/assinatura" className="botao">
                  Atualizar cartão e reativar
                </Link>
              </div>
            </>
          ) : assinatura?.status === "cancelada" ? (
            <>
              <p>
                Sua assinatura foi{" "}
                <span className="selo selo-neutro">cancelada</span> e não será
                renovada.
                {assinatura.proximaCobrancaEm &&
                  assinatura.proximaCobrancaEm > new Date() && (
                    <>
                      {" "}
                      Ela continua válida até{" "}
                      <strong>
                        {assinatura.proximaCobrancaEm.toLocaleDateString(
                          "pt-BR"
                        )}
                      </strong>
                      .
                    </>
                  )}
              </p>
              <div className="mt-auto">
                <Link href="/app/pagamento/assinatura" className="botao">
                  Assinar novamente
                </Link>
              </div>
            </>
          ) : (
            <>
              <p>
                Você ainda não tem uma assinatura. O plano mensal de{" "}
                {formatarReais(PRECO_ASSINATURA_CENTAVOS)} dá sorteios
                ilimitados e renova automaticamente no cartão todo mês.
              </p>
              <div className="mt-auto">
                <Link href="/app/pagamento/assinatura" className="botao">
                  Assinar plano mensal
                </Link>
              </div>
            </>
          )}
        </div>

        <div className="cartao relative flex flex-col overflow-hidden">
          <div
            className={
              assinaturaAtiva
                ? "flex flex-1 flex-col select-none blur-[2px] opacity-50"
                : "flex flex-1 flex-col"
            }
          >
            <h3>Créditos</h3>
            <p>
              Você tem <strong>{usuario.creditos}</strong>{" "}
              {usuario.creditos === 1
                ? "crédito disponível"
                : "créditos disponíveis"}
              . Cada crédito vale o sorteio de uma inauguração completa.
            </p>
            <div className="mt-auto">
              {assinaturaAtiva ? (
                <span aria-disabled className="botao botao-secundario">
                  Comprar créditos
                </span>
              ) : (
                <Link href="/app/comprar" className="botao botao-secundario">
                  Comprar créditos
                </Link>
              )}
            </div>
          </div>
          {assinaturaAtiva && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <span className="selo selo-ok shadow-sm">
                Sorteios ilimitados pela assinatura, sem gastar créditos
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="cartao">
        <h3>Histórico de pagamentos</h3>
        {pagamentos.length === 0 ? (
          <p className="texto-suave" style={{ marginBottom: 0 }}>
            Nenhum pagamento por aqui ainda.
          </p>
        ) : (
          <table className="tabela">
            <thead>
              <tr>
                <th>Data</th>
                <th>Tipo</th>
                <th>Valor</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {pagamentos.map((p) => (
                <tr key={p.id}>
                  <td>{p.criadoEm.toLocaleDateString("pt-BR")}</td>
                  <td>{ROTULO_TIPO[p.tipo] ?? p.tipo}</td>
                  <td>{formatarReais(p.valorCentavos)}</td>
                  <td>
                    <span
                      className={
                        p.status === "aprovado" ? "selo selo-ok" : "selo selo-neutro"
                      }
                    >
                      {ROTULO_PAGAMENTO[p.status] ?? p.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
