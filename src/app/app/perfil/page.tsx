import Link from "next/link";
import { db } from "@/lib/db";
import { exigirUsuario } from "@/lib/usuario-atual";
import { PRECO_ASSINATURA_CENTAVOS, formatarReais } from "@/lib/precos";
import {
  BotaoCancelarAssinatura,
  FormDadosConta,
  FormSenha,
} from "./PerfilForms";

const ROTULO_TIPO: Record<string, string> = {
  avulso: "Sorteio avulso",
  assinatura: "Assinatura",
};

const ROTULO_PAGAMENTO: Record<string, string> = {
  pendente: "pendente",
  aprovado: "aprovado",
  recusado: "recusado",
  cancelado: "cancelado",
};

export default async function PaginaPerfil() {
  const usuario = await exigirUsuario();

  const [assinatura, pagamentos] = await Promise.all([
    db.assinatura.findUnique({ where: { usuarioId: usuario.id } }),
    db.pagamento.findMany({
      where: { usuarioId: usuario.id },
      orderBy: { criadoEm: "desc" },
      take: 10,
    }),
  ]);

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

      <div className="cartao">
        <h3>Assinatura</h3>
        {usuario.assinaturaAtiva && assinatura ? (
          <>
            <p>
              Plano mensal de{" "}
              <strong>{formatarReais(PRECO_ASSINATURA_CENTAVOS)}</strong>{" "}
              <span className="selo selo-ok">ativa</span>, com sorteios
              ilimitados nas suas inaugurações.
            </p>
            {assinatura.proximaCobrancaEm && (
              <p>
                Válida até{" "}
                <strong>
                  {assinatura.proximaCobrancaEm.toLocaleDateString("pt-BR")}
                </strong>
                . A renovação é automática: nessa data cobraremos{" "}
                {formatarReais(PRECO_ASSINATURA_CENTAVOS)} no{" "}
                {assinatura.cartaoUltimos4
                  ? `cartão ${assinatura.cartaoBandeira ?? "de crédito"} final ${assinatura.cartaoUltimos4}`
                  : "cartão de crédito cadastrado"}
                .
              </p>
            )}
            <BotaoCancelarAssinatura />
          </>
        ) : assinatura?.status === "suspensa" ? (
          <>
            <p>
              Sua assinatura está{" "}
              <span className="selo selo-neutro">suspensa</span>: a última
              cobrança no cartão não foi aprovada. Regularize para voltar a ter
              sorteios ilimitados.
            </p>
            <Link href="/app/assinar" className="botao">
              Atualizar cartão e reativar
            </Link>
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
                      {assinatura.proximaCobrancaEm.toLocaleDateString("pt-BR")}
                    </strong>
                    .
                  </>
                )}
            </p>
            <Link href="/app/assinar" className="botao">
              Assinar novamente
            </Link>
          </>
        ) : (
          <>
            <p>
              Você ainda não tem uma assinatura. O plano mensal de{" "}
              {formatarReais(PRECO_ASSINATURA_CENTAVOS)} dá sorteios ilimitados
              e renova automaticamente no cartão todo mês.
            </p>
            <Link href="/app/assinar" className="botao">
              Assinar plano mensal
            </Link>
          </>
        )}
      </div>

      <div className="cartao">
        <h3>Créditos</h3>
        <p>
          Você tem <strong>{usuario.creditos}</strong>{" "}
          {usuario.creditos === 1
            ? "crédito disponível"
            : "créditos disponíveis"}
          . Cada crédito vale o sorteio de uma inauguração completa.
        </p>
        <Link href="/app/comprar" className="botao botao-secundario">
          Comprar créditos
        </Link>
      </div>

      <div className="cartao">
        <h3>Formas de pagamento</h3>
        {assinatura?.cartaoUltimos4 ? (
          <p className="texto-suave">
            Cartão {assinatura.cartaoBandeira ?? "de crédito"} com final{" "}
            <strong>{assinatura.cartaoUltimos4}</strong>, usado na renovação
            automática da assinatura. Os dados completos ficam guardados com
            segurança no PagBank; para trocar o cartão, refaça a assinatura.
          </p>
        ) : (
          <p className="texto-suave">
            Os pagamentos são processados pelo PagBank no momento da compra, e
            os dados do cartão ficam guardados com segurança por lá. Ainda não
            há formas de pagamento salvas nesta conta.
          </p>
        )}
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
