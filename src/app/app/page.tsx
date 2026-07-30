import Link from "next/link";
import { db } from "@/lib/db";
import { exigirUsuario } from "@/lib/usuario-atual";

export default async function PaginaSorteios() {
  const usuario = await exigirUsuario();

  const sorteios = await db.sorteio.findMany({
    where: { usuarioId: usuario.id },
    orderBy: { criadoEm: "desc" },
    include: {
      _count: { select: { participantes: true, ganhadores: true } },
    },
  });

  return (
    <div className="espaco-vertical" style={{ paddingBottom: "3rem" }}>
      <div className="cabecalho-pagina">
        <h1>Meus sorteios</h1>
        <Link href="/app/novo" className="botao">
          + Criar sorteio
        </Link>
      </div>

      {sorteios.length === 0 ? (
        <div className="cartao" style={{ textAlign: "center" }}>
          <p className="texto-suave">
            Você ainda não criou nenhum sorteio. Crie o da sua próxima
            inauguração acima. Depois é só abrir o modo tablet no evento.
          </p>
        </div>
      ) : (
        <div className="cartao" style={{ padding: 0 }}>
          <table className="tabela">
            <thead>
              <tr>
                <th>Sorteio</th>
                <th>Participantes</th>
                <th>Ganhadores</th>
                <th>Criado em</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {sorteios.map((s) => (
                <tr key={s.id}>
                  <td>
                    <Link href={`/app/sorteio/${s.id}`}>
                      <strong>{s.nome}</strong>
                    </Link>{" "}
                    {s._count.ganhadores > 0 && (
                      <span className="selo selo-ok">realizado</span>
                    )}
                  </td>
                  <td>{s._count.participantes}</td>
                  <td>{s._count.ganhadores}</td>
                  <td className="texto-suave">
                    {s.criadoEm.toLocaleDateString("pt-BR")}
                  </td>
                  <td style={{ textAlign: "right" }}>
                    {s._count.ganhadores === 0 && (
                      <Link
                        href={`/evento/${s.id}`}
                        className="botao botao-secundario botao-pequeno"
                        title="Abrir o cadastro de visitantes no tablet"
                      >
                        📋 Modo tablet
                      </Link>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
