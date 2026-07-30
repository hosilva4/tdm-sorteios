"use client";

import { useState } from "react";
import { criarSorteioCompleto } from "@/app/acoes/sorteios";
import {
  metaGanhadores,
  nomePremio,
  type PremioResumo,
} from "@/dominio/premios";
import { rotuloChancePorGrupo, rotuloGrupo } from "@/lib/predio";

interface PremioForm {
  tipo: string;
  descricao: string;
  quantidade: number;
}

const PASSOS = ["Edifício", "Prêmios", "Regras", "Confirmar"];

const TIPOS: Array<{ valor: string; rotulo: string }> = [
  { valor: "cupom", rotulo: "Cupom" },
  { valor: "voucher", rotulo: "Voucher" },
  { valor: "brinde", rotulo: "Brinde" },
  { valor: "outro", rotulo: "Outro" },
];

export function Wizard() {
  const [passo, setPasso] = useState(0);
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);

  const [nome, setNome] = useState("");
  const [tipoPredio, setTipoPredio] = useState("residencial");
  const [premios, setPremios] = useState<PremioForm[]>([
    { tipo: "voucher", descricao: "", quantidade: 1 },
  ]);
  const [umaChancePorGrupo, setUmaChancePorGrupo] = useState(false);
  const [regraLgpd, setRegraLgpd] = useState(true);
  const [regraMaiorIdade, setRegraMaiorIdade] = useState(false);

  const resumoPremios: PremioResumo[] = premios.map((p, i) => ({
    ...p,
    ordem: i + 1,
  }));
  const meta = metaGanhadores(resumoPremios);

  function validarPasso(): string {
    if (passo === 0 && !nome.trim()) return "Dê um nome ao sorteio.";
    if (passo === 1) {
      if (premios.length === 0) return "Cadastre ao menos um prêmio.";
      for (const p of premios) {
        if (p.tipo === "outro" && !p.descricao.trim()) {
          return 'Descreva o prêmio do tipo "outro".';
        }
      }
    }
    return "";
  }

  function avancar() {
    const problema = validarPasso();
    if (problema) {
      setErro(problema);
      return;
    }
    setErro("");
    setPasso((p) => Math.min(p + 1, PASSOS.length - 1));
  }

  function voltar() {
    setErro("");
    setPasso((p) => Math.max(p - 1, 0));
  }

  function mudarPremio(indice: number, mudanca: Partial<PremioForm>) {
    setPremios((lista) =>
      lista.map((p, i) => (i === indice ? { ...p, ...mudanca } : p))
    );
  }

  async function concluir() {
    setEnviando(true);
    setErro("");
    const resultado = await criarSorteioCompleto({
      nome,
      tipoPredio,
      premios,
      umaChancePorGrupo,
      regraLgpd,
      regraMaiorIdade,
    });
    // Em caso de sucesso a action redireciona; aqui só chega o erro.
    if (resultado?.erro) {
      setErro(resultado.erro);
      setEnviando(false);
    }
  }

  return (
    <div className="cartao" style={{ maxWidth: 640, margin: "0 auto" }}>
      <div className="wizard-passos">
        {PASSOS.map((titulo, i) => (
          <div
            key={titulo}
            className={`wizard-passo${i === passo ? " ativo" : i < passo ? " feito" : ""}`}
          >
            {i + 1}. {titulo}
          </div>
        ))}
      </div>

      {erro && <div className="aviso-erro">{erro}</div>}

      {passo === 0 && (
        <>
          <div className="grupo-campo">
            <label className="rotulo" htmlFor="nome">
              Nome do sorteio
            </label>
            <input
              className="campo"
              id="nome"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex.: Inauguração Condomínio Solar"
              maxLength={120}
            />
          </div>
          <p className="rotulo">Tipo de edifício</p>
          <div className="grade-passos" style={{ margin: 0 }}>
            <label
              className={`cartao-opcao${tipoPredio === "residencial" ? " selecionado" : ""}`}
            >
              <input
                type="radio"
                name="tipoPredio"
                checked={tipoPredio === "residencial"}
                onChange={() => setTipoPredio("residencial")}
              />
              <strong>🏠 Residencial</strong>
              <p className="texto-suave texto-pequeno" style={{ margin: 0 }}>
                Condomínio de moradores. O cadastro pede apartamento/bloco.
              </p>
            </label>
            <label
              className={`cartao-opcao${tipoPredio === "comercial" ? " selecionado" : ""}`}
            >
              <input
                type="radio"
                name="tipoPredio"
                checked={tipoPredio === "comercial"}
                onChange={() => setTipoPredio("comercial")}
              />
              <strong>🏢 Comercial</strong>
              <p className="texto-suave texto-pequeno" style={{ margin: 0 }}>
                Prédio de empresas. O cadastro pede o setor.
              </p>
            </label>
          </div>
        </>
      )}

      {passo === 1 && (
        <>
          <p className="texto-suave texto-pequeno">
            Os prêmios são sorteados na ordem abaixo. A quantidade define
            quantos ganhadores cada prêmio tem.
          </p>
          {premios.map((p, i) => (
            <div className="linha-premio" key={i}>
              <span className="texto-suave texto-pequeno">{i + 1}º</span>
              <select
                className="campo"
                style={{ width: "auto" }}
                value={p.tipo}
                onChange={(e) => mudarPremio(i, { tipo: e.target.value })}
              >
                {TIPOS.map((t) => (
                  <option key={t.valor} value={t.valor}>
                    {t.rotulo}
                  </option>
                ))}
              </select>
              <input
                className="campo"
                style={{ flex: 1, minWidth: 160 }}
                value={p.descricao}
                onChange={(e) => mudarPremio(i, { descricao: e.target.value })}
                placeholder={
                  p.tipo === "outro"
                    ? "Descreva o prêmio (obrigatório)"
                    : "Descrição, ex.: Voucher R$ 50"
                }
                maxLength={120}
              />
              <input
                className="campo"
                style={{ width: 70 }}
                type="number"
                min={1}
                max={100}
                value={p.quantidade}
                onChange={(e) =>
                  mudarPremio(i, {
                    quantidade: Math.max(1, Number(e.target.value) || 1),
                  })
                }
                title="Quantidade"
              />
              {premios.length > 1 && (
                <button
                  className="botao botao-perigo botao-pequeno"
                  onClick={() =>
                    setPremios((lista) => lista.filter((_, j) => j !== i))
                  }
                >
                  ✕
                </button>
              )}
            </div>
          ))}
          <button
            className="botao botao-secundario botao-pequeno"
            onClick={() =>
              setPremios((lista) => [
                ...lista,
                { tipo: "brinde", descricao: "", quantidade: 1 },
              ])
            }
          >
            + Adicionar prêmio
          </button>
          <p className="texto-suave texto-pequeno" style={{ marginBottom: 0 }}>
            Total planejado: {meta} {meta === 1 ? "ganhador" : "ganhadores"}.
          </p>
        </>
      )}

      {passo === 2 && (
        <div className="espaco-vertical" style={{ gap: "0.75rem" }}>
          <label className="cartao-opcao" style={{ borderWidth: 1 }}>
            <span className="linha-flex" style={{ gap: "0.5rem" }}>
              <input
                type="checkbox"
                style={{ display: "inline" }}
                checked={umaChancePorGrupo}
                onChange={(e) => setUmaChancePorGrupo(e.target.checked)}
              />
              <strong>{rotuloChancePorGrupo(tipoPredio)}</strong>
            </span>
            <p className="texto-suave texto-pequeno" style={{ margin: 0 }}>
              Cada {tipoPredio === "comercial" ? "setor" : "unidade"} concorre
              apenas uma vez, mesmo com vários cadastros.
            </p>
          </label>
          <label className="cartao-opcao" style={{ borderWidth: 1 }}>
            <span className="linha-flex" style={{ gap: "0.5rem" }}>
              <input
                type="checkbox"
                style={{ display: "inline" }}
                checked={regraLgpd}
                onChange={(e) => setRegraLgpd(e.target.checked)}
              />
              <strong>Consentimento LGPD obrigatório</strong>
            </span>
            <p className="texto-suave texto-pequeno" style={{ margin: 0 }}>
              O participante precisa autorizar o uso dos dados para o sorteio.
            </p>
          </label>
          <label className="cartao-opcao" style={{ borderWidth: 1 }}>
            <span className="linha-flex" style={{ gap: "0.5rem" }}>
              <input
                type="checkbox"
                style={{ display: "inline" }}
                checked={regraMaiorIdade}
                onChange={(e) => setRegraMaiorIdade(e.target.checked)}
              />
              <strong>Somente maiores de 18 anos</strong>
            </span>
            <p className="texto-suave texto-pequeno" style={{ margin: 0 }}>
              O participante declara ter 18 anos ou mais ao se cadastrar.
            </p>
          </label>
        </div>
      )}

      {passo === 3 && (
        <div>
          <p>
            <strong>{nome}</strong>{" "}
            <span className="selo selo-neutro">
              {tipoPredio === "comercial" ? "comercial" : "residencial"}
            </span>
          </p>
          <p className="rotulo">Prêmios ({meta} ganhadores)</p>
          <ul style={{ marginTop: 0 }}>
            {resumoPremios.map((p) => (
              <li key={p.ordem}>
                {nomePremio(p)}
                {p.quantidade > 1 && ` (x${p.quantidade})`}
              </li>
            ))}
          </ul>
          <p className="rotulo">Regras</p>
          <ul style={{ marginTop: 0 }}>
            {umaChancePorGrupo && <li>{rotuloChancePorGrupo(tipoPredio)}</li>}
            {regraLgpd && <li>Consentimento LGPD obrigatório</li>}
            {regraMaiorIdade && <li>Somente maiores de 18 anos</li>}
            {!umaChancePorGrupo && !regraLgpd && !regraMaiorIdade && (
              <li className="texto-suave">Sem regras extras</li>
            )}
          </ul>
          <p className="texto-suave texto-pequeno">
            O cadastro no evento pedirá nome, WhatsApp,{" "}
            {rotuloGrupo(tipoPredio).toLowerCase()} e e-mail (opcional).
          </p>
        </div>
      )}

      <div
        className="linha-flex"
        style={{ justifyContent: "space-between", marginTop: "1.5rem" }}
      >
        <button
          className="botao botao-secundario"
          onClick={voltar}
          disabled={passo === 0 || enviando}
        >
          Voltar
        </button>
        {passo < PASSOS.length - 1 ? (
          <button className="botao" onClick={avancar}>
            Continuar
          </button>
        ) : (
          <button className="botao" onClick={concluir} disabled={enviando}>
            {enviando ? "Criando…" : "Criar sorteio"}
          </button>
        )}
      </div>
    </div>
  );
}
