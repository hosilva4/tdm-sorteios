import Link from "next/link";
import { exigirUsuario } from "@/lib/usuario-atual";
import { pagbankConfigurado } from "@/lib/pagbank";
import {
  PRECO_ASSINATURA_CENTAVOS,
  PRECO_AVULSO_CENTAVOS,
  formatarReais,
} from "@/lib/precos";

export default async function PaginaComprar() {
  const usuario = await exigirUsuario();
  const configurado = pagbankConfigurado();

  return (
    <div className="espaco-vertical" style={{ paddingBottom: "3rem" }}>
      <div className="cabecalho-pagina">
        <div>
          <p className="texto-pequeno" style={{ margin: 0 }}>
            <Link href="/app">← Meus sorteios</Link>
          </p>
          <h1 style={{ marginBottom: 0 }}>Créditos e assinatura</h1>
        </div>
      </div>

      {!configurado && (
        <div className="aviso-info">
          Este ambiente ainda não tem o PagBank configurado. As compras ficam
          indisponíveis; nada será cobrado.
        </div>
      )}

      <div className="cartao">
        <p style={{ margin: 0 }}>
          {usuario.assinaturaAtiva ? (
            <>
              Sua assinatura está <span className="selo selo-ok">ativa</span>,
              com sorteios ilimitados. Gerencie em{" "}
              <Link href="/app/perfil">Minha conta</Link>.
            </>
          ) : (
            <>
              Você tem <strong>{usuario.creditos}</strong>{" "}
              {usuario.creditos === 1
                ? "crédito disponível"
                : "créditos disponíveis"}
              . Cada crédito vale o sorteio de uma inauguração completa
              (quantos prêmios quiser no mesmo evento).
            </>
          )}
        </p>
      </div>

      <div className="grade-precos" style={{ margin: 0 }}>
        <div className="cartao">
          <h3>Inauguração avulsa</h3>
          <div className="preco-valor">
            {formatarReais(PRECO_AVULSO_CENTAVOS)}
            <small> / sorteio</small>
          </div>
          <p className="texto-suave">
            1 crédito para usar na próxima inauguração, pago na hora com PIX
            ou cartão de crédito.
          </p>
          <Link href="/app/pagamento/avulso" className="botao">
            Comprar 1 sorteio
          </Link>
        </div>

        {!usuario.assinaturaAtiva && (
          <div className="cartao">
            <h3>
              Assinatura mensal{" "}
              <span className="selo selo-neutro">ilimitada</span>
            </h3>
            <div className="preco-valor">
              {formatarReais(PRECO_ASSINATURA_CENTAVOS)}
              <small> / mês</small>
            </div>
            <p className="texto-suave">
              Para quem inaugura vários pontos por mês: sorteios ilimitados no
              cartão de crédito, com renovação automática mensal. Cancele
              quando quiser.
            </p>
            <Link href="/app/pagamento/assinatura" className="botao">
              Assinar plano ilimitado
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
