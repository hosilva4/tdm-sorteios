// Núcleo do autocadastro de participantes, compartilhado entre o modo tablet
// (sessão do responsável) e o link público /participar/[token] (celular).

import { z } from "zod";
import { db } from "@/lib/db";
import { formatarTelefone, soDigitos } from "@/dominio/telefone";

const MAX_PARTICIPANTES = 10_000;

export interface SorteioParaCadastro {
  id: string;
  regraLgpd: boolean;
  regraMaiorIdade: boolean;
}

export interface ResultadoCadastroEvento {
  ok?: boolean;
  erro?: string;
  nome?: string;
}

const esquemaEmailOpcional = z
  .string()
  .trim()
  .toLowerCase()
  .max(200, "E-mail muito longo.")
  .refine(
    (v) => v === "" || z.string().email().safeParse(v).success,
    "E-mail inválido."
  );

const esquema = z.object({
  nome: z.string().trim().min(2, "Informe seu nome completo.").max(200),
  telefone: z
    .string()
    .trim()
    .min(1, "Informe seu WhatsApp para avisarmos se você ganhar.")
    .max(40),
  grupo: z.string().trim().max(100),
  email: esquemaEmailOpcional,
});

/** Valida os dados e as regras do sorteio e grava o participante. */
export async function registrarParticipante(
  sorteio: SorteioParaCadastro,
  formData: FormData
): Promise<ResultadoCadastroEvento> {
  const dados = esquema.safeParse({
    nome: formData.get("nome") ?? "",
    telefone: formData.get("telefone") ?? "",
    grupo: formData.get("grupo") ?? "",
    email: formData.get("email") ?? "",
  });
  if (!dados.success) {
    return { erro: dados.error.issues[0].message };
  }

  const aceitouLgpd = formData.get("lgpd") === "sim";
  const declarouMaiorIdade = formData.get("maiorIdade") === "sim";
  if (sorteio.regraLgpd && !aceitouLgpd) {
    return { erro: "Para participar, é preciso autorizar o uso dos dados para o sorteio." };
  }
  if (sorteio.regraMaiorIdade && !declarouMaiorIdade) {
    return { erro: "Este sorteio é apenas para maiores de 18 anos." };
  }

  const digitos = soDigitos(dados.data.telefone);
  if (digitos.length < 10) {
    return { erro: "Informe o WhatsApp com DDD, por exemplo (41) 99876-5432." };
  }

  const total = await db.participante.count({
    where: { sorteioId: sorteio.id },
  });
  if (total >= MAX_PARTICIPANTES) {
    return { erro: "Este sorteio atingiu o limite de participantes." };
  }

  const existentes = await db.participante.findMany({
    where: { sorteioId: sorteio.id },
    select: { telefone: true },
  });
  if (existentes.some((p) => soDigitos(p.telefone) === digitos)) {
    return { erro: "Esse WhatsApp já está participando do sorteio. Boa sorte!" };
  }

  await db.participante.create({
    data: {
      sorteioId: sorteio.id,
      nome: dados.data.nome,
      grupo: dados.data.grupo,
      telefone: formatarTelefone(dados.data.telefone),
      email: dados.data.email,
      aceitouLgpd,
      declarouMaiorIdade,
    },
  });
  return { ok: true, nome: dados.data.nome };
}
