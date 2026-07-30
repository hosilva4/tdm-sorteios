import Link from "next/link";
import { usuarioDaSessao } from "@/lib/sessao";
import {
  PRECO_ASSINATURA_CENTAVOS,
  PRECO_AVULSO_CENTAVOS,
  formatarReais,
} from "@/lib/precos";

export default async function PaginaInicial() {
  const logado = Boolean(await usuarioDaSessao());

  return (
    <>
      <main className="container">
        <section className="hero">
          <h1>
            O sorteio da inauguração
            <br />
            do seu mercado autônomo
          </h1>
          <p>
            Feito para franqueados market4u: deixe um tablet no evento, os
            visitantes se cadastram sozinhos e você sorteia os prêmios na
            hora, com transparência total para o condomínio.
          </p>
          <Link
            href={logado ? "/app" : "/cadastro"}
            className="botao botao-grande"
          >
            Preparar meu sorteio
          </Link>
        </section>

        <section>
          <h2 style={{ textAlign: "center" }}>Como funciona no dia do evento</h2>
          <div className="grade-passos">
            <div className="cartao">
              <h3>1. Crie o sorteio</h3>
              <p className="texto-suave">
                Dê um nome, como &ldquo;Inauguração Condomínio Solar&rdquo;,
                e abra o modo tablet. Leva menos de um minuto.
              </p>
            </div>
            <div className="cartao">
              <h3>2. Visitantes se cadastram</h3>
              <p className="texto-suave">
                O tablet fica na bancada: cada morador informa nome, WhatsApp e
                apartamento. Sem papelzinho, sem fila, sem digitação depois.
              </p>
            </div>
            <div className="cartao">
              <h3>3. Sorteie na frente de todos</h3>
              <p className="texto-suave">
                Encerrou os cadastros? Sorteie os prêmios ali mesmo, com
                aleatoriedade criptográfica e sem repetir ganhador.
              </p>
            </div>
          </div>
        </section>

        <section id="precos">
          <h2 style={{ textAlign: "center", marginTop: "3rem" }}>Preços</h2>
          <div className="grade-precos">
            <div className="cartao">
              <h3>Inauguração avulsa</h3>
              <div className="preco-valor">
                {formatarReais(PRECO_AVULSO_CENTAVOS)}
                <small> / sorteio</small>
              </div>
              <p className="texto-suave">
                Pague apenas quando inaugurar. Participantes ilimitados e
                quantos prêmios quiser no mesmo evento.
              </p>
            </div>
            <div className="cartao">
              <h3>
                Assinatura <span className="selo selo-neutro">ilimitada</span>
              </h3>
              <div className="preco-valor">
                {formatarReais(PRECO_ASSINATURA_CENTAVOS)}
                <small> / mês</small>
              </div>
              <p className="texto-suave">
                Para quem inaugura vários pontos por mês: sorteios ilimitados
                enquanto a assinatura estiver ativa. Cancele quando quiser.
              </p>
            </div>
          </div>
        </section>
      </main>

      <footer className="rodape">
        <div className="container">
          TDM Sorteios: sorteios transparentes para inaugurações de mercados
          autônomos. Produto independente, sem vínculo com a market4u.
        </div>
      </footer>
    </>
  );
}
