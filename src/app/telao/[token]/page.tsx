import { notFound } from "next/navigation";
import QRCode from "qrcode";
import { db } from "@/lib/db";
import { premioDaPosicao, nomePremio, metaGanhadores } from "@/dominio/premios";
import { AtualizadorTelao } from "./AtualizadorTelao";
import { RedeDePontos } from "./RedeDePontos";

/**
 * Telão público de projeção do evento: mostra participantes e ganhadores em
 * tempo real, sem dados sensíveis (nada de telefone ou e-mail).
 */
export default async function PaginaTelao({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const sorteio = await db.sorteio.findUnique({
    where: { tokenPublico: token },
    include: {
      premios: true,
      _count: { select: { participantes: true } },
      ganhadores: {
        orderBy: { posicao: "asc" },
        include: { participante: { select: { nome: true, grupo: true } } },
      },
    },
  });
  if (!sorteio) notFound();

  const meta = metaGanhadores(sorteio.premios);
  const proximaPosicao = sorteio.ganhadores.length + 1;
  const proximoPremio =
    meta > 0 ? premioDaPosicao(sorteio.premios, proximaPosicao) : null;
  const encerrado = meta > 0 && sorteio.ganhadores.length >= meta;

  const urlParticipar = `${process.env.NEXT_PUBLIC_URL ?? "http://localhost:3000"}/participar/${token}`;
  const qrParticipar = await QRCode.toDataURL(urlParticipar, {
    margin: 1,
    width: 240,
    color: { dark: "#068a3e", light: "#ffffff" },
  });

  return (
    <div className="quiosque">
      <RedeDePontos />
      <AtualizadorTelao />

      {!encerrado && (
        <div className="telao-qr">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={qrParticipar}
            alt="QR code para se cadastrar no sorteio"
            width={132}
            height={132}
          />
          <p>
            <strong>Participe agora!</strong>
            <br />
            Aponte a câmera do celular
          </p>
        </div>
      )}

      <div
        style={{
          width: "100%",
          maxWidth: 860,
          textAlign: "center",
          position: "relative",
          zIndex: 1,
        }}
      >
        <p
          className="texto-suave texto-pequeno"
          style={{ textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700, marginBottom: "0.25rem" }}
        >
          Sorteio de inauguração
        </p>
        <h1 style={{ fontSize: "2.6rem", letterSpacing: "-0.03em" }}>
          {sorteio.nome}
        </h1>
        <p className="texto-suave" style={{ fontSize: "1.2rem" }}>
          {sorteio._count.participantes}{" "}
          {sorteio._count.participantes === 1
            ? "pessoa participando"
            : "pessoas participando"}
          {meta > 0 &&
            ` · ${sorteio.ganhadores.length} de ${meta} prêmios sorteados`}
        </p>

        {encerrado ? (
          <div className="palco" style={{ marginTop: "1.5rem" }}>
            <div className="palco-nome">🎉 Sorteio encerrado!</div>
            <p className="texto-suave" style={{ margin: 0 }}>
              Parabéns a todos os ganhadores.
            </p>
          </div>
        ) : (
          proximoPremio && (
            <div className="palco" style={{ marginTop: "1.5rem" }}>
              <p className="texto-suave" style={{ margin: 0 }}>
                Próximo prêmio
              </p>
              <div className="palco-nome">
                {nomePremio(proximoPremio.premio)}
              </div>
              {proximoPremio.premio.quantidade > 1 && (
                <p className="texto-suave" style={{ margin: 0 }}>
                  unidade {proximoPremio.unidade} de{" "}
                  {proximoPremio.premio.quantidade}
                </p>
              )}
            </div>
          )
        )}

        {sorteio.ganhadores.length > 0 && (
          <div className="lista-ganhadores" style={{ marginTop: "1.5rem" }}>
            {sorteio.ganhadores.map((g) => {
              const premio =
                meta > 0 ? premioDaPosicao(sorteio.premios, g.posicao) : null;
              return (
                <div
                  className="ganhador-item"
                  key={g.posicao}
                  style={{ fontSize: "1.3rem" }}
                >
                  <span className="ganhador-posicao">{g.posicao}º</span>
                  <span>
                    <strong>{g.participante.nome}</strong>
                    {g.participante.grupo && (
                      <span className="texto-suave">
                        {" "}
                        · {g.participante.grupo}
                      </span>
                    )}
                  </span>
                  {premio && (
                    <span
                      className="texto-suave"
                      style={{ marginLeft: "auto", fontSize: "1rem" }}
                    >
                      {nomePremio(premio.premio)}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
