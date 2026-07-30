import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { exigirUsuario } from "@/lib/usuario-atual";
import { PainelSorteio } from "./PainelSorteio";

export default async function PaginaSorteio({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const usuario = await exigirUsuario();

  const sorteio = await db.sorteio.findUnique({
    where: { id },
    include: {
      participantes: { orderBy: { criadoEm: "asc" } },
      premios: { orderBy: { ordem: "asc" } },
      ganhadores: {
        orderBy: { posicao: "asc" },
        include: { participante: true },
      },
    },
  });
  if (!sorteio || sorteio.usuarioId !== usuario.id) notFound();

  return (
    <PainelSorteio
      sorteio={{
        id: sorteio.id,
        nome: sorteio.nome,
        tipoPredio: sorteio.tipoPredio,
        pago: sorteio.pago,
        umaChancePorGrupo: sorteio.umaChancePorGrupo,
        tokenPublico: sorteio.tokenPublico,
      }}
      premios={sorteio.premios.map((p) => ({
        ordem: p.ordem,
        tipo: p.tipo,
        descricao: p.descricao,
        quantidade: p.quantidade,
      }))}
      participantes={sorteio.participantes.map((p) => ({
        id: p.id,
        nome: p.nome,
        grupo: p.grupo,
        telefone: p.telefone,
        email: p.email,
      }))}
      ganhadores={sorteio.ganhadores.map((g) => ({
        posicao: g.posicao,
        tamanhoUrna: g.tamanhoUrna,
        participanteId: g.participanteId,
        nome: g.participante.nome,
        grupo: g.participante.grupo,
        telefone: g.participante.telefone,
      }))}
      cobranca={{
        assinaturaAtiva: usuario.assinaturaAtiva,
        creditos: usuario.creditos,
      }}
    />
  );
}
