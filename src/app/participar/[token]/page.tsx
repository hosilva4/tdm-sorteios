import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { FormParticipar } from "./FormParticipar";

/**
 * Cadastro público pelo celular do visitante, acessado pelo QR Code do
 * evento. Sem login: o token público identifica o sorteio.
 */
export default async function PaginaParticipar({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const sorteio = await db.sorteio.findUnique({
    where: { tokenPublico: token },
    select: {
      nome: true,
      tipoPredio: true,
      regraLgpd: true,
      regraMaiorIdade: true,
    },
  });
  if (!sorteio) notFound();

  return (
    <FormParticipar
      token={token}
      nomeSorteio={sorteio.nome}
      tipoPredio={sorteio.tipoPredio}
      regraLgpd={sorteio.regraLgpd}
      regraMaiorIdade={sorteio.regraMaiorIdade}
    />
  );
}
