import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { exigirUsuario } from "@/lib/usuario-atual";
import { metaGanhadores, nomePremio, premioDaPosicao } from "@/dominio/premios";
import { mascararTelefone } from "@/dominio/telefone";
import { rotuloChancePorGrupo, rotuloGrupoCurto } from "@/lib/predio";
import { BotoesResumo } from "./BotoesResumo";

/**
 * Quadro resumo do sorteio concluído: prova do evento para enviar ao
 * condomínio (imprimir/salvar PDF ou copiar como texto).
 */
export default async function PaginaResumo({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const usuario = await exigirUsuario();

  const sorteio = await db.sorteio.findUnique({
    where: { id },
    include: {
      premios: { orderBy: { ordem: "asc" } },
      _count: { select: { participantes: true } },
      ganhadores: {
        orderBy: { posicao: "asc" },
        include: { participante: true },
      },
    },
  });
  if (!sorteio || sorteio.usuarioId !== usuario.id) notFound();

  const meta = metaGanhadores(sorteio.premios);
  const concluido = meta > 0 && sorteio.ganhadores.length >= meta;
  if (!concluido) redirect(`/app/sorteio/${id}`);

  const realizadoEm = sorteio.ganhadores.reduce(
    (max, g) => (g.sorteadoEm > max ? g.sorteadoEm : max),
    sorteio.ganhadores[0].sorteadoEm
  );

  const regras = [
    sorteio.umaChancePorGrupo && rotuloChancePorGrupo(sorteio.tipoPredio),
    sorteio.regraLgpd && "Consentimento LGPD obrigatório no cadastro",
    sorteio.regraMaiorIdade && "Somente maiores de 18 anos",
  ].filter(Boolean) as string[];

  const linhas = sorteio.ganhadores.map((g) => {
    const premio = premioDaPosicao(sorteio.premios, g.posicao);
    return {
      posicao: g.posicao,
      premio: premio ? nomePremio(premio.premio) : "",
      nome: g.participante.nome,
      grupo: g.participante.grupo,
      telefone: mascararTelefone(g.participante.telefone),
      urna: g.tamanhoUrna,
    };
  });

  const textoResumo = [
    `RESULTADO DO SORTEIO: ${sorteio.nome}`,
    `Realizado em ${realizadoEm.toLocaleDateString("pt-BR")} às ${realizadoEm.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`,
    `Participantes: ${sorteio._count.participantes}`,
    regras.length > 0 ? `Regras: ${regras.join("; ")}` : "",
    "",
    "GANHADORES:",
    ...linhas.map(
      (l) =>
        `${l.posicao}º ${l.premio ? `(${l.premio}) ` : ""}${l.nome}${l.grupo ? `, ${l.grupo}` : ""}`
    ),
    "",
    "Sorteio eletrônico realizado pelo TDM Sorteios com aleatoriedade criptográfica; cada participante teve uma chance por extração e ganhadores não se repetem.",
  ]
    .filter((linha) => linha !== "")
    .join("\n");

  return (
    <div className="espaco-vertical" style={{ paddingBottom: "3rem" }}>
      <div className="cabecalho-pagina sem-impressao">
        <div>
          <p className="texto-pequeno" style={{ margin: 0 }}>
            <Link href={`/app/sorteio/${id}`}>← Voltar ao sorteio</Link>
          </p>
          <h1 style={{ marginBottom: 0 }}>Quadro resumo</h1>
        </div>
        <BotoesResumo textoResumo={textoResumo} />
      </div>

      <div className="cartao area-impressao">
        <p
          className="texto-suave texto-pequeno"
          style={{ margin: 0, textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 700 }}
        >
          Resultado oficial do sorteio
        </p>
        <h2 style={{ marginTop: "0.25rem" }}>{sorteio.nome}</h2>
        <p className="texto-suave" style={{ marginTop: 0 }}>
          Realizado em {realizadoEm.toLocaleDateString("pt-BR")} às{" "}
          {realizadoEm.toLocaleTimeString("pt-BR", {
            hour: "2-digit",
            minute: "2-digit",
          })}{" "}
          · Organização: {usuario.nome}
        </p>

        <div className="grade-passos" style={{ margin: "1rem 0" }}>
          <div className="cartao" style={{ textAlign: "center" }}>
            <div className="preco-valor">{sorteio._count.participantes}</div>
            <p className="texto-suave texto-pequeno" style={{ margin: 0 }}>
              participantes cadastrados
            </p>
          </div>
          <div className="cartao" style={{ textAlign: "center" }}>
            <div className="preco-valor">{sorteio.ganhadores.length}</div>
            <p className="texto-suave texto-pequeno" style={{ margin: 0 }}>
              prêmios entregues
            </p>
          </div>
        </div>

        {regras.length > 0 && (
          <>
            <p className="rotulo" style={{ marginBottom: "0.25rem" }}>
              Regras do sorteio
            </p>
            <ul style={{ marginTop: 0 }}>
              {regras.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
          </>
        )}

        <p className="rotulo" style={{ marginBottom: "0.25rem" }}>
          Ganhadores por prêmio
        </p>
        <table className="tabela">
          <thead>
            <tr>
              <th>Posição</th>
              <th>Prêmio</th>
              <th>Ganhador</th>
              <th>{rotuloGrupoCurto(sorteio.tipoPredio)}</th>
              <th>Telefone</th>
              <th>Urna</th>
            </tr>
          </thead>
          <tbody>
            {linhas.map((l) => (
              <tr key={l.posicao}>
                <td>{l.posicao}º</td>
                <td>{l.premio}</td>
                <td>
                  <strong>{l.nome}</strong>
                </td>
                <td>{l.grupo}</td>
                <td>{l.telefone}</td>
                <td className="texto-suave">{l.urna} chances</td>
              </tr>
            ))}
          </tbody>
        </table>

        <p className="texto-suave texto-pequeno" style={{ marginBottom: 0 }}>
          Sorteio eletrônico realizado pelo TDM Sorteios com aleatoriedade
          criptográfica. Cada participante equivaleu a uma chance por extração
          (&ldquo;urna&rdquo; indica o total de chances no momento de cada
          sorteio) e um ganhador não volta para as extrações seguintes.
          Telefones parcialmente ocultados em conformidade com a LGPD.
        </p>
      </div>
    </div>
  );
}
