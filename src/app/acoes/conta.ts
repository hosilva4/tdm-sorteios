"use server";

import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { db } from "@/lib/db";
import { exigirUsuario } from "@/lib/usuario-atual";
import {
  cancelarAssinaturaPagbank,
  pagbankConfigurado,
} from "@/lib/pagbank";

export interface EstadoConta {
  ok?: boolean;
  erro?: string;
}

const esquemaPerfil = z.object({
  nome: z.string().trim().min(2, "Informe seu nome.").max(120),
  email: z.string().trim().toLowerCase().email("E-mail inválido."),
});

export async function atualizarPerfil(
  _anterior: EstadoConta,
  formData: FormData
): Promise<EstadoConta> {
  const usuario = await exigirUsuario();
  const dados = esquemaPerfil.safeParse({
    nome: formData.get("nome"),
    email: formData.get("email"),
  });
  if (!dados.success) {
    return { erro: dados.error.issues[0].message };
  }

  const emailEmUso = await db.usuario.findFirst({
    where: { email: dados.data.email, NOT: { id: usuario.id } },
    select: { id: true },
  });
  if (emailEmUso) {
    return { erro: "Esse e-mail já está em uso por outra conta." };
  }

  await db.usuario.update({
    where: { id: usuario.id },
    data: dados.data,
  });
  revalidatePath("/app", "layout");
  return { ok: true };
}

const esquemaSenha = z.object({
  senhaAtual: z.string().min(1, "Informe a senha atual."),
  novaSenha: z
    .string()
    .min(8, "A nova senha precisa de pelo menos 8 caracteres.")
    .max(72),
});

export async function alterarSenha(
  _anterior: EstadoConta,
  formData: FormData
): Promise<EstadoConta> {
  const usuario = await exigirUsuario();
  const dados = esquemaSenha.safeParse({
    senhaAtual: formData.get("senhaAtual"),
    novaSenha: formData.get("novaSenha"),
  });
  if (!dados.success) {
    return { erro: dados.error.issues[0].message };
  }

  const registro = await db.usuario.findUnique({ where: { id: usuario.id } });
  if (
    !registro ||
    !(await bcrypt.compare(dados.data.senhaAtual, registro.senhaHash))
  ) {
    return { erro: "A senha atual não confere." };
  }

  await db.usuario.update({
    where: { id: usuario.id },
    data: { senhaHash: await bcrypt.hash(dados.data.novaSenha, 10) },
  });
  return { ok: true };
}

export async function cancelarAssinatura(): Promise<EstadoConta> {
  const usuario = await exigirUsuario();
  const assinatura = await db.assinatura.findUnique({
    where: { usuarioId: usuario.id },
  });
  if (!assinatura || assinatura.status === "cancelada") {
    return { erro: "Você não tem uma assinatura para cancelar." };
  }

  // Cancela primeiro no PagBank; se a API falhar, não marcamos localmente
  // (senão o cartão continuaria sendo cobrado todo mês).
  if (assinatura.pagbankId && pagbankConfigurado()) {
    try {
      await cancelarAssinaturaPagbank(assinatura.pagbankId);
    } catch (e) {
      console.error("cancelarAssinatura:", e);
      return {
        erro: "Não foi possível cancelar no PagBank agora. Tente novamente em instantes.",
      };
    }
  }

  await db.assinatura.update({
    where: { id: assinatura.id },
    data: { status: "cancelada" },
  });
  revalidatePath("/app", "layout");
  return { ok: true };
}
