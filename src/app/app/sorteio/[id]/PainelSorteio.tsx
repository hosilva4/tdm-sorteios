"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useRef, useState, useTransition } from "react";
import {
  adicionarParticipante,
  atualizarPremios,
  definirUmaChancePorGrupo,
  desfazerUltimoGanhador,
  excluirSorteio,
  limparParticipantes,
  removerParticipante,
  sortearProximoGanhador,
} from "@/app/acoes/sorteios";
import { elegiveis, type ParticipanteSorteavel } from "@/dominio/sorteio";
import { mascararTelefone, soDigitos } from "@/dominio/telefone";
import {
  metaGanhadores,
  nomePremio,
  premioDaPosicao,
  type PremioResumo,
} from "@/dominio/premios";
import {
  ehComercial,
  rotuloChancePorGrupo,
  rotuloGrupo,
  rotuloGrupoCurto,
} from "@/lib/predio";

interface GanhadorExibicao {
  posicao: number;
  tamanhoUrna: number;
  participanteId: string;
  nome: string;
  grupo: string;
  telefone: string;
}

interface ParticipanteExibicao extends ParticipanteSorteavel {
  email: string;
}

interface Props {
  sorteio: {
    id: string;
    nome: string;
    tipoPredio: string;
    pago: boolean;
    umaChancePorGrupo: boolean;
    tokenPublico: string;
  };
  premios: PremioResumo[];
  participantes: ParticipanteExibicao[];
  ganhadores: GanhadorExibicao[];
  cobranca: { assinaturaAtiva: boolean; creditos: number };
}

const DURACAO_GIRO_MS = 2200;

export function PainelSorteio({
  sorteio,
  premios,
  participantes,
  ganhadores,
  cobranca,
}: Props) {
  const router = useRouter();
  const [, iniciarTransicao] = useTransition();
  const [erro, setErro] = useState("");
  const [girando, setGirando] = useState(false);
  const [nomeNoPalco, setNomeNoPalco] = useState("");
  const [revelado, setRevelado] = useState<GanhadorExibicao | null>(null);
  const timerGiro = useRef<ReturnType<typeof setInterval> | null>(null);

  const urna = useMemo(
    () =>
      elegiveis(
        participantes,
        new Set(ganhadores.map((g) => g.participanteId)),
        sorteio.umaChancePorGrupo
      ),
    [participantes, ganhadores, sorteio.umaChancePorGrupo]
  );

  const precisaPagar = !sorteio.pago && !cobranca.assinaturaAtiva;
  const semCreditos = precisaPagar && cobranca.creditos === 0;

  const meta = metaGanhadores(premios);
  const metaAtingida = meta > 0 && ganhadores.length >= meta;
  const proximoPremio =
    meta > 0 && !metaAtingida
      ? premioDaPosicao(premios, ganhadores.length + 1)
      : null;

  function copiarLink(caminho: string) {
    navigator.clipboard.writeText(`${window.location.origin}${caminho}`);
    setErro("");
  }

  function linkWhatsApp(g: GanhadorExibicao): string | null {
    const digitos = soDigitos(g.telefone);
    if (digitos.length < 10) return null;
    const numero = digitos.length <= 11 ? `55${digitos}` : digitos;
    const premio = meta > 0 ? premioDaPosicao(premios, g.posicao) : null;
    const texto = encodeURIComponent(
      `Parabéns, ${g.nome.split(" ")[0]}! 🎉 Você foi o ${g.posicao}º ganhador do sorteio "${sorteio.nome}"` +
        (premio ? ` e ganhou: ${nomePremio(premio.premio)}.` : ".") +
        " Fale com a equipe do evento para retirar seu prêmio."
    );
    return `https://wa.me/${numero}?text=${texto}`;
  }

  function atualizar() {
    iniciarTransicao(() => router.refresh());
  }

  async function aoSortear() {
    if (girando || urna.length === 0) return;
    setErro("");
    setRevelado(null);
    setGirando(true);

    // Giro visual com nomes da urna enquanto o servidor decide o ganhador.
    timerGiro.current = setInterval(() => {
      setNomeNoPalco(urna[Math.floor(Math.random() * urna.length)].nome);
    }, 70);
    const espera = new Promise((r) => setTimeout(r, DURACAO_GIRO_MS));

    const resultado = await sortearProximoGanhador(sorteio.id);
    await espera;

    if (timerGiro.current) clearInterval(timerGiro.current);
    setGirando(false);

    if (resultado.ganhador) {
      const g = resultado.ganhador;
      setNomeNoPalco(g.nome);
      setRevelado({
        posicao: g.posicao,
        tamanhoUrna: urna.length,
        participanteId: g.id,
        nome: g.nome,
        grupo: g.grupo,
        telefone: g.telefone,
      });
      atualizar();
    } else {
      setNomeNoPalco("");
      setErro(resultado.erro ?? "Não foi possível sortear.");
      if (resultado.semCreditos) atualizar();
    }
  }

  async function executar(acao: () => Promise<{ erro?: string }>) {
    setErro("");
    const r = await acao();
    if (r.erro) setErro(r.erro);
    atualizar();
  }

  async function aoAdicionar(formData: FormData) {
    const r = await adicionarParticipante(sorteio.id, formData);
    if (r.erro) setErro(r.erro);
    else setErro("");
    atualizar();
  }

  // Ganhadores já revelados: o recém-sorteado aparece via estado local até o refresh.
  const listaGanhadores =
    revelado && !ganhadores.some((g) => g.participanteId === revelado.participanteId)
      ? [...ganhadores, revelado]
      : ganhadores;

  return (
    <div className="espaco-vertical" style={{ paddingBottom: "3rem" }}>
      <div className="cabecalho-pagina">
        <div>
          <p className="texto-pequeno" style={{ margin: 0 }}>
            <Link href="/app">← Meus sorteios</Link>
          </p>
          <h1 style={{ marginBottom: 0 }}>{sorteio.nome}</h1>
        </div>
        <button
          className="botao-perigo botao"
          onClick={() => {
            if (confirm("Excluir este sorteio e todos os seus dados?")) {
              excluirSorteio(sorteio.id);
            }
          }}
        >
          Excluir sorteio
        </button>
      </div>

      {erro && <div className="aviso-erro">{erro}</div>}

      {/* ---------- sorteio concluído ---------- */}
      {metaAtingida && (
        <div className="cartao" style={{ background: "var(--sucesso-suave)", borderColor: "#bbf7d0" }}>
          <div className="cabecalho-pagina" style={{ margin: 0 }}>
            <div>
              <h3 style={{ margin: 0 }}>🎉 Sorteio concluído</h3>
              <p className="texto-suave texto-pequeno" style={{ margin: 0 }}>
                Todos os prêmios foram entregues. O sorteio está travado como
                prova do evento e não pode mais ser alterado.
              </p>
            </div>
            <Link href={`/app/sorteio/${sorteio.id}/resumo`} className="botao">
              📄 Quadro resumo
            </Link>
          </div>
        </div>
      )}

      {/* ---------- cadastro no evento ---------- */}
      {ganhadores.length === 0 && (
        <div className="cartao">
          <div className="cabecalho-pagina" style={{ margin: 0 }}>
            <div>
              <h3 style={{ margin: 0 }}>Cadastro no evento</h3>
              <p className="texto-suave texto-pequeno" style={{ margin: 0 }}>
                Abra no tablet e deixe na bancada: cada visitante se cadastra
                sozinho. Quando encerrar, toque em &ldquo;Concluir
                cadastros&rdquo; no próprio tablet para voltar aqui.
              </p>
            </div>
            <Link href={`/evento/${sorteio.id}`} className="botao">
              📋 Abrir modo tablet
            </Link>
          </div>
          <div className="linha-flex" style={{ marginTop: "0.75rem" }}>
            <button
              className="botao botao-secundario botao-pequeno"
              onClick={() => copiarLink(`/participar/${sorteio.tokenPublico}`)}
              title="Link público para o visitante se cadastrar no próprio celular"
            >
              🔗 Copiar link de cadastro (celular)
            </button>
          </div>
        </div>
      )}

      {/* ---------- telão ---------- */}
      <div className="cartao">
        <div className="cabecalho-pagina" style={{ margin: 0 }}>
          <div>
            <h3 style={{ margin: 0 }}>Telão do evento</h3>
            <p className="texto-suave texto-pequeno" style={{ margin: 0 }}>
              Página pública para projetar: mostra os ganhadores em tempo real,
              sem telefones nem e-mails.
            </p>
          </div>
          <div className="linha-flex">
            <a
              href={`/telao/${sorteio.tokenPublico}`}
              target="_blank"
              rel="noreferrer"
              className="botao botao-secundario"
            >
              📺 Abrir telão
            </a>
            <button
              className="botao botao-secundario botao-pequeno"
              onClick={() => copiarLink(`/telao/${sorteio.tokenPublico}`)}
            >
              🔗 Copiar link
            </button>
          </div>
        </div>
      </div>

      {/* ---------- palco ---------- */}
      <div className="cartao">
        <div className="palco">
          {revelado && !girando ? (
            <>
              <p className="texto-suave" style={{ margin: 0 }}>
                🎉 {revelado.posicao}º ganhador
                {meta > 0 &&
                  (() => {
                    const p = premioDaPosicao(premios, revelado.posicao);
                    return p ? ` · ${nomePremio(p.premio)}` : "";
                  })()}
              </p>
              <div className="palco-nome">{revelado.nome}</div>
              {revelado.grupo && (
                <p className="texto-suave" style={{ margin: 0 }}>
                  {revelado.grupo}
                  {revelado.telefone &&
                    ` · ${mascararTelefone(revelado.telefone)}`}
                </p>
              )}
            </>
          ) : (
            <>
              {proximoPremio && !girando && (
                <p className="texto-suave" style={{ margin: 0 }}>
                  Prêmio da vez: <strong>{nomePremio(proximoPremio.premio)}</strong>
                  {proximoPremio.premio.quantidade > 1 &&
                    ` (${proximoPremio.unidade} de ${proximoPremio.premio.quantidade})`}
                </p>
              )}
              <div className={`palco-nome${girando ? " girando" : ""}`}>
                {girando
                  ? nomeNoPalco || "…"
                  : metaAtingida
                    ? "🎉 Todos os prêmios sorteados!"
                    : "Quem será o próximo?"}
              </div>
            </>
          )}
        </div>

        <div className="linha-flex" style={{ justifyContent: "center" }}>
          <button
            className="botao botao-grande"
            onClick={aoSortear}
            disabled={girando || urna.length === 0 || semCreditos || metaAtingida}
          >
            {girando
              ? "Sorteando…"
              : ganhadores.length > 0
                ? "Sortear próximo ganhador"
                : "Sortear ganhador"}
          </button>
          <span className="texto-suave texto-pequeno">
            {urna.length} {urna.length === 1 ? "chance" : "chances"} na urna
            {meta > 0 && ` · ${ganhadores.length} de ${meta} prêmios`}
          </span>
        </div>

        {participantes.length === 0 && (
          <p className="texto-suave texto-pequeno" style={{ textAlign: "center" }}>
            Abra o modo tablet acima para os visitantes se cadastrarem, ou
            adicione participantes manualmente abaixo.
          </p>
        )}

        {semCreditos && (
          <div className="aviso-info" style={{ marginTop: "1rem" }}>
            O primeiro ganhador de um sorteio consome 1 crédito e você não tem
            créditos disponíveis.{" "}
            <Link href="/app/comprar">Comprar créditos ou assinar</Link>
          </div>
        )}
        {precisaPagar && !semCreditos && (
          <p
            className="texto-suave texto-pequeno"
            style={{ textAlign: "center", marginBottom: 0 }}
          >
            O primeiro ganhador consome 1 dos seus {cobranca.creditos}{" "}
            {cobranca.creditos === 1 ? "crédito" : "créditos"}; os próximos deste
            sorteio são gratuitos.
          </p>
        )}
      </div>

      {/* ---------- prêmios ---------- */}
      <div className="cartao">
        <div className="cabecalho-pagina" style={{ margin: "0 0 0.75rem" }}>
          <h3 style={{ margin: 0 }}>
            Prêmios{" "}
            {meta > 0 && (
              <span className="texto-suave">
                ({ganhadores.length} de {meta}{" "}
                {meta === 1 ? "entregue" : "entregues"})
              </span>
            )}
          </h3>
        </div>
        {ganhadores.length === 0 ? (
          <EditorPremios
            premiosIniciais={premios}
            aoSalvar={async (lista) => {
              const r = await atualizarPremios(sorteio.id, lista);
              if (r.erro) setErro(r.erro);
              else setErro("");
              atualizar();
              return !r.erro;
            }}
          />
        ) : (
          <div className="lista-ganhadores">
            {Array.from({ length: meta }, (_, i) => i + 1).map((posicao) => {
              const item = premioDaPosicao(premios, posicao);
              if (!item) return null;
              const ganhador = ganhadores.find((g) => g.posicao === posicao);
              return (
                <div
                  className="ganhador-item"
                  key={posicao}
                  style={
                    ganhador
                      ? undefined
                      : { background: "var(--fundo)", borderColor: "var(--borda)" }
                  }
                >
                  <span className="ganhador-posicao">{posicao}º</span>
                  <span>
                    <strong>{nomePremio(item.premio)}</strong>
                    {item.premio.quantidade > 1 && (
                      <span className="texto-suave">
                        {" "}
                        ({item.unidade} de {item.premio.quantidade})
                      </span>
                    )}
                  </span>
                  <span style={{ marginLeft: "auto" }}>
                    {ganhador ? (
                      <span>
                        <span className="selo selo-ok">entregue</span>{" "}
                        🏆 <strong>{ganhador.nome}</strong>
                        {ganhador.grupo && (
                          <span className="texto-suave"> · {ganhador.grupo}</span>
                        )}
                      </span>
                    ) : (
                      <span className="selo selo-neutro">aguardando sorteio</span>
                    )}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ---------- ganhadores ---------- */}
      {listaGanhadores.length > 0 && (
        <div className="cartao">
          <div className="cabecalho-pagina" style={{ margin: "0 0 0.75rem" }}>
            <h3 style={{ margin: 0 }}>Ganhadores</h3>
            {!metaAtingida && (
              <button
                className="botao botao-secundario"
                onClick={() => {
                  if (confirm("Desfazer o último ganhador sorteado?")) {
                    setRevelado(null);
                    setNomeNoPalco("");
                    executar(() => desfazerUltimoGanhador(sorteio.id));
                  }
                }}
              >
                Desfazer último
              </button>
            )}
          </div>
          <div className="lista-ganhadores">
            {listaGanhadores.map((g) => {
              const premio =
                meta > 0 ? premioDaPosicao(premios, g.posicao) : null;
              const whats = linkWhatsApp(g);
              return (
                <div className="ganhador-item" key={g.posicao}>
                  <span className="ganhador-posicao">{g.posicao}º</span>
                  <span>
                    <strong>{g.nome}</strong>
                    {premio && (
                      <span className="texto-suave">
                        {" "}
                        · {nomePremio(premio.premio)}
                      </span>
                    )}
                    {g.grupo && <span className="texto-suave"> · {g.grupo}</span>}
                    {g.telefone && (
                      <span className="texto-suave">
                        {" "}
                        · {mascararTelefone(g.telefone)}
                      </span>
                    )}
                  </span>
                  <span
                    className="linha-flex"
                    style={{ marginLeft: "auto", gap: "0.5rem" }}
                  >
                    {whats && (
                      <a
                        href={whats}
                        target="_blank"
                        rel="noreferrer"
                        className="botao botao-secundario botao-pequeno"
                        title="Avisar o ganhador pelo WhatsApp"
                      >
                        💬 Avisar
                      </a>
                    )}
                    <span className="texto-suave texto-pequeno">
                      urna com {g.tamanhoUrna}
                    </span>
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ---------- participantes ---------- */}
      <div className="cartao">
        <div className="cabecalho-pagina" style={{ margin: "0 0 0.75rem" }}>
          <h3 style={{ margin: 0 }}>
            Participantes{" "}
            <span className="texto-suave">({participantes.length})</span>
          </h3>
          <label
            className="texto-pequeno linha-flex"
            style={{ gap: "0.4rem", cursor: "pointer" }}
            title={
              ganhadores.length > 0
                ? "Não é possível mudar a regra depois do primeiro ganhador."
                : `Cada ${ehComercial(sorteio.tipoPredio) ? "setor" : "apartamento/bloco"} concorre apenas uma vez.`
            }
          >
            <input
              type="checkbox"
              checked={sorteio.umaChancePorGrupo}
              disabled={ganhadores.length > 0}
              onChange={(e) =>
                executar(() =>
                  definirUmaChancePorGrupo(sorteio.id, e.target.checked).then(
                    () => ({})
                  )
                )
              }
            />
            {rotuloChancePorGrupo(sorteio.tipoPredio)}
          </label>
        </div>

        {!metaAtingida && (
        <form
          action={aoAdicionar}
          className="linha-flex"
          style={{ margin: "0 0 1rem" }}
        >
          <input
            className="campo"
            style={{ flex: 2, minWidth: "160px" }}
            name="nome"
            placeholder="Nome"
            required
          />
          <input
            className="campo"
            style={{ flex: 1, minWidth: "110px" }}
            name="grupo"
            placeholder={rotuloGrupo(sorteio.tipoPredio)}
          />
          <input
            className="campo"
            style={{ flex: 1, minWidth: "130px" }}
            name="telefone"
            placeholder="WhatsApp"
          />
          <input
            className="campo"
            style={{ flex: 1, minWidth: "150px" }}
            name="email"
            type="email"
            placeholder="E-mail (opcional)"
          />
          <button className="botao botao-secundario">Adicionar</button>
        </form>
        )}

        {participantes.length > 0 && (
          <>
            <table className="tabela">
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>{rotuloGrupoCurto(sorteio.tipoPredio)}</th>
                  <th>WhatsApp</th>
                  <th>E-mail</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {participantes.map((p) => {
                  const jaGanhou = ganhadores.some(
                    (g) => g.participanteId === p.id
                  );
                  return (
                    <tr key={p.id}>
                      <td>
                        {p.nome}{" "}
                        {jaGanhou && <span className="selo selo-ok">ganhou</span>}
                      </td>
                      <td>{p.grupo}</td>
                      <td>{p.telefone}</td>
                      <td>{p.email}</td>
                      <td style={{ textAlign: "right" }}>
                        {!jaGanhou && !metaAtingida && (
                          <button
                            className="botao botao-perigo botao-pequeno"
                            onClick={() =>
                              executar(() =>
                                removerParticipante(sorteio.id, p.id)
                              )
                            }
                          >
                            ✕ Remover
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {ganhadores.length === 0 && (
              <p style={{ marginBottom: 0 }}>
                <button
                  className="botao botao-perigo"
                  onClick={() => {
                    if (confirm("Remover todos os participantes?")) {
                      executar(() => limparParticipantes(sorteio.id));
                    }
                  }}
                >
                  Limpar todos
                </button>
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}

const TIPOS_PREMIO_EDITOR: Array<{ valor: string; rotulo: string }> = [
  { valor: "cupom", rotulo: "Cupom" },
  { valor: "voucher", rotulo: "Voucher" },
  { valor: "brinde", rotulo: "Brinde" },
  { valor: "outro", rotulo: "Outro" },
];

interface PremioEditavel {
  tipo: string;
  descricao: string;
  quantidade: number;
}

/** Edição dos prêmios, permitida apenas antes do primeiro ganhador. */
function EditorPremios({
  premiosIniciais,
  aoSalvar,
}: {
  premiosIniciais: PremioResumo[];
  aoSalvar: (lista: PremioEditavel[]) => Promise<boolean>;
}) {
  const [lista, setLista] = useState<PremioEditavel[]>(
    premiosIniciais.length > 0
      ? premiosIniciais.map((p) => ({
          tipo: p.tipo,
          descricao: p.descricao,
          quantidade: p.quantidade,
        }))
      : [{ tipo: "voucher", descricao: "", quantidade: 1 }]
  );
  const [salvando, setSalvando] = useState(false);
  const [salvo, setSalvo] = useState(false);

  function mudar(indice: number, mudanca: Partial<PremioEditavel>) {
    setSalvo(false);
    setLista((atual) =>
      atual.map((p, i) => (i === indice ? { ...p, ...mudanca } : p))
    );
  }

  const totalGanhadores = lista.reduce((s, p) => s + p.quantidade, 0);

  return (
    <div>
      <p className="texto-suave texto-pequeno" style={{ marginTop: 0 }}>
        Os prêmios podem ser ajustados até o primeiro ganhador ser sorteado.
        Eles saem na ordem abaixo.
      </p>
      {lista.map((p, i) => (
        <div className="linha-premio" key={i}>
          <span className="texto-suave texto-pequeno">{i + 1}º</span>
          <select
            className="campo"
            style={{ width: "auto" }}
            value={p.tipo}
            onChange={(e) => mudar(i, { tipo: e.target.value })}
          >
            {TIPOS_PREMIO_EDITOR.map((t) => (
              <option key={t.valor} value={t.valor}>
                {t.rotulo}
              </option>
            ))}
          </select>
          <input
            className="campo"
            style={{ flex: 1, minWidth: 160 }}
            value={p.descricao}
            onChange={(e) => mudar(i, { descricao: e.target.value })}
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
              mudar(i, { quantidade: Math.max(1, Number(e.target.value) || 1) })
            }
            title="Quantidade"
          />
          {lista.length > 1 && (
            <button
              className="botao botao-perigo botao-pequeno"
              onClick={() => {
                setSalvo(false);
                setLista((atual) => atual.filter((_, j) => j !== i));
              }}
            >
              ✕
            </button>
          )}
        </div>
      ))}
      <div className="linha-flex">
        <button
          className="botao botao-secundario botao-pequeno"
          onClick={() => {
            setSalvo(false);
            setLista((atual) => [
              ...atual,
              { tipo: "brinde", descricao: "", quantidade: 1 },
            ]);
          }}
        >
          + Adicionar prêmio
        </button>
        <button
          className="botao botao-pequeno"
          disabled={salvando}
          onClick={async () => {
            setSalvando(true);
            const ok = await aoSalvar(lista);
            setSalvando(false);
            setSalvo(ok);
          }}
        >
          {salvando ? "Salvando…" : "Salvar prêmios"}
        </button>
        <span className="texto-suave texto-pequeno">
          {totalGanhadores} {totalGanhadores === 1 ? "ganhador" : "ganhadores"}{" "}
          no total{salvo && " · salvo ✓"}
        </span>
      </div>
    </div>
  );
}
