"use server";

import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { db } from "@/lib/db";
import { criarSessao, encerrarSessao } from "@/lib/sessao";

export interface EstadoAuth {
  erro?: string;
}

const esquemaCadastro = z.object({
  nome: z.string().trim().min(2, "Informe seu nome.").max(120),
  email: z.string().trim().toLowerCase().email("E-mail inválido."),
  senha: z.string().min(8, "A senha precisa de pelo menos 8 caracteres.").max(72),
});

export async function cadastrar(
  _anterior: EstadoAuth,
  formData: FormData
): Promise<EstadoAuth> {
  const dados = esquemaCadastro.safeParse({
    nome: formData.get("nome"),
    email: formData.get("email"),
    senha: formData.get("senha"),
  });
  if (!dados.success) {
    return { erro: dados.error.issues[0].message };
  }

  const existente = await db.usuario.findUnique({
    where: { email: dados.data.email },
    select: { id: true },
  });
  if (existente) {
    return { erro: "Já existe uma conta com esse e-mail. Tente entrar." };
  }

  const usuario = await db.usuario.create({
    data: {
      nome: dados.data.nome,
      email: dados.data.email,
      senhaHash: await bcrypt.hash(dados.data.senha, 10),
    },
  });

  await criarSessao(usuario.id);
  redirect("/app");
}

const esquemaEntrada = z.object({
  email: z.string().trim().toLowerCase().email("E-mail inválido."),
  senha: z.string().min(1, "Informe a senha."),
});

export async function entrar(
  _anterior: EstadoAuth,
  formData: FormData
): Promise<EstadoAuth> {
  const dados = esquemaEntrada.safeParse({
    email: formData.get("email"),
    senha: formData.get("senha"),
  });
  if (!dados.success) {
    return { erro: dados.error.issues[0].message };
  }

  const usuario = await db.usuario.findUnique({
    where: { email: dados.data.email },
  });
  const confere =
    usuario && (await bcrypt.compare(dados.data.senha, usuario.senhaHash));
  if (!confere) {
    return { erro: "E-mail ou senha incorretos." };
  }

  await criarSessao(usuario.id);
  redirect("/app");
}

export async function sair(): Promise<void> {
  await encerrarSessao();
  redirect("/");
}
