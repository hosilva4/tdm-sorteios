import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { usuarioDaSessao } from "@/lib/sessao";

export interface UsuarioAtual {
  id: string;
  nome: string;
  email: string;
  creditos: number;
  assinaturaAtiva: boolean;
}

/** Carrega o usuário logado ou redireciona para /entrar. */
export async function exigirUsuario(): Promise<UsuarioAtual> {
  const id = await usuarioDaSessao();
  if (!id) redirect("/entrar");

  const usuario = await db.usuario.findUnique({
    where: { id },
    include: { assinatura: true },
  });
  if (!usuario) redirect("/entrar");

  return {
    id: usuario.id,
    nome: usuario.nome,
    email: usuario.email,
    creditos: usuario.creditos,
    assinaturaAtiva: usuario.assinatura?.status === "ativa",
  };
}
