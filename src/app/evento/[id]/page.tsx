import { notFound } from "next/navigation";
import QRCode from "qrcode";
import { db } from "@/lib/db";
import { exigirUsuario } from "@/lib/usuario-atual";
import { MARKET4U_APP_ANDROID, MARKET4U_APP_IOS } from "@/lib/market4u";
import { FormularioEvento } from "./FormularioEvento";

function gerarQr(url: string): Promise<string> {
  return QRCode.toDataURL(url, {
    margin: 1,
    width: 200,
    color: { dark: "#068a3e", light: "#ffffff" },
  });
}

/**
 * Modo tablet: fica aberto na bancada durante a inauguração para o visitante
 * se cadastrar sozinho. Fora do layout /app de propósito — sem cabeçalho,
 * créditos ou botão de sair à vista.
 */
export default async function PaginaEvento({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const usuario = await exigirUsuario();

  const sorteio = await db.sorteio.findUnique({
    where: { id },
    include: { _count: { select: { participantes: true } } },
  });
  if (!sorteio || sorteio.usuarioId !== usuario.id) notFound();

  const [qrAndroid, qrIos] = await Promise.all([
    gerarQr(MARKET4U_APP_ANDROID),
    gerarQr(MARKET4U_APP_IOS),
  ]);

  return (
    <FormularioEvento
      sorteioId={sorteio.id}
      nomeSorteio={sorteio.nome}
      tipoPredio={sorteio.tipoPredio}
      regraLgpd={sorteio.regraLgpd}
      regraMaiorIdade={sorteio.regraMaiorIdade}
      totalParticipantes={sorteio._count.participantes}
      qrAndroid={qrAndroid}
      qrIos={qrIos}
    />
  );
}
