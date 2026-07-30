"use client";

// Campos do autocadastro de participante, compartilhados entre o modo tablet
// (/evento) e o cadastro pelo celular (/participar).

interface Props {
  tipoPredio: string;
  regraLgpd: boolean;
  regraMaiorIdade: boolean;
  grande?: boolean;
}

export function CamposParticipante({
  tipoPredio,
  regraLgpd,
  regraMaiorIdade,
  grande,
}: Props) {
  const campo = grande ? "campo campo-grande" : "campo";

  return (
    <>
      <div className="grupo-campo">
        <label className="rotulo" htmlFor="nome">
          Nome completo
        </label>
        <input
          className={campo}
          id="nome"
          name="nome"
          autoComplete="off"
          maxLength={200}
          required
        />
      </div>
      <div className="grupo-campo">
        <label className="rotulo" htmlFor="telefone">
          WhatsApp (com DDD)
        </label>
        <input
          className={campo}
          id="telefone"
          name="telefone"
          type="tel"
          inputMode="tel"
          placeholder="(41) 99876-5432"
          autoComplete="off"
          maxLength={40}
          required
        />
      </div>
      <div className="grupo-campo">
        <label className="rotulo" htmlFor="grupo">
          {tipoPredio === "comercial" ? "Setor" : "Apartamento / bloco"}{" "}
          <span className="texto-suave">(opcional)</span>
        </label>
        <input
          className={campo}
          id="grupo"
          name="grupo"
          autoComplete="off"
          maxLength={100}
          placeholder={
            tipoPredio === "comercial"
              ? "Ex.: Financeiro, RH, 3º andar"
              : "Ex.: Apto 302, Bloco B"
          }
        />
      </div>
      <div className="grupo-campo">
        <label className="rotulo" htmlFor="email">
          E-mail <span className="texto-suave">(opcional)</span>
        </label>
        <input
          className={campo}
          id="email"
          name="email"
          type="email"
          inputMode="email"
          autoComplete="off"
          maxLength={200}
          placeholder="voce@email.com"
        />
      </div>

      {regraLgpd && (
        <label
          className="linha-flex texto-pequeno"
          style={{ gap: "0.5rem", marginBottom: "0.75rem", cursor: "pointer" }}
        >
          <input type="checkbox" name="lgpd" value="sim" required />
          Autorizo o uso dos meus dados (nome, contato e unidade) apenas para a
          realização deste sorteio e o aviso aos ganhadores.
        </label>
      )}
      {regraMaiorIdade && (
        <label
          className="linha-flex texto-pequeno"
          style={{ gap: "0.5rem", marginBottom: "0.75rem", cursor: "pointer" }}
        >
          <input type="checkbox" name="maiorIdade" value="sim" required />
          Declaro ter 18 anos ou mais.
        </label>
      )}
    </>
  );
}
