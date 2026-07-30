"use client";

import { useActionState } from "react";
import {
  cadastrarPorToken,
  type EstadoCadastroEvento,
} from "@/app/acoes/sorteios";
import { CamposParticipante } from "@/componentes/CamposParticipante";

interface Props {
  token: string;
  nomeSorteio: string;
  tipoPredio: string;
  regraLgpd: boolean;
  regraMaiorIdade: boolean;
}

export function FormParticipar({
  token,
  nomeSorteio,
  tipoPredio,
  regraLgpd,
  regraMaiorIdade,
}: Props) {
  const [estado, acao, pendente] = useActionState(
    cadastrarPorToken.bind(null, token),
    {} as EstadoCadastroEvento
  );

  return (
    <div className="quiosque">
      <div className="quiosque-cartao">
        {estado.ok ? (
          <div className="quiosque-sucesso">
            <div className="icone">🎉</div>
            <h1>Boa sorte, {estado.nome?.split(" ")[0]}!</h1>
            <p className="texto-suave" style={{ fontSize: "1.1rem" }}>
              Cadastro confirmado. Fique por perto: o resultado sai ainda hoje!
            </p>
          </div>
        ) : (
          <>
            <p
              className="texto-suave texto-pequeno"
              style={{ margin: "0 0 0.25rem", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 700 }}
            >
              Sorteio de inauguração
            </p>
            <h1>{nomeSorteio}</h1>
            <p className="texto-suave">
              Preencha seus dados e concorra aos prêmios de hoje.
            </p>

            {estado.erro && <div className="aviso-erro">{estado.erro}</div>}

            <form action={acao}>
              <CamposParticipante
                tipoPredio={tipoPredio}
                regraLgpd={regraLgpd}
                regraMaiorIdade={regraMaiorIdade}
              />
              <button className="botao botao-largo" disabled={pendente}>
                {pendente ? "Enviando…" : "Quero participar 🍀"}
              </button>
            </form>

            <p
              className="texto-suave texto-pequeno"
              style={{ textAlign: "center", marginBottom: 0 }}
            >
              Seus dados são usados apenas para o contato sobre o sorteio.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
