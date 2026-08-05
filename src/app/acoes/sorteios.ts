"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { exigirUsuario } from "@/lib/usuario-atual";
import { elegiveis, sortearGanhador } from "@/domain/sorteio";
import { metaGanhadores } from "@/domain/premios";
import {
  registrarParticipante,
  type ResultadoCadastroEvento,
} from "@/lib/cadastro-evento";

/** Carrega o sorteio garantindo que pertence ao usuário logado. */
async function sorteioDoUsuario(sorteioId: string) {
  const usuario = await exigirUsuario();
  const sorteio = await db.sorteio.findUnique({ where: { id: sorteioId } });
  if (!sorteio || sorteio.usuarioId !== usuario.id) {
    throw new Error("Sorteio não encontrado.");
  }
  return { usuario, sorteio };
}

/**
 * Um sorteio está concluído quando todos os prêmios foram entregues. A partir
 * daí ele vira prova do evento e nenhuma alteração é permitida.
 */
async function sorteioConcluido(sorteioId: string): Promise<boolean> {
  const [premios, ganhadores] = await Promise.all([
    db.premio.findMany({ where: { sorteioId } }),
    db.ganhador.count({ where: { sorteioId } }),
  ]);
  const meta = metaGanhadores(premios);
  return meta > 0 && ganhadores >= meta;
}

const MSG_CONCLUIDO =
  "Este sorteio foi concluído e não pode mais ser alterado.";

// ---------- criação e configuração ----------

export interface EstadoSorteio {
  erro?: string;
}

const esquemaPremio = z
  .object({
    tipo: z.enum(["cupom", "voucher", "brinde", "outro"]),
    descricao: z.string().trim().max(120),
    quantidade: z.coerce.number().int().min(1).max(100),
  })
  .refine((p) => p.tipo !== "outro" || p.descricao.length > 0, {
    message: 'Descreva o prêmio do tipo "outro".',
  });

const esquemaSorteioCompleto = z.object({
  nome: z.string().trim().min(1, "Dê um nome ao sorteio.").max(120),
  tipoPredio: z.enum(["residencial", "comercial"]),
  premios: z
    .array(esquemaPremio)
    .min(1, "Cadastre ao menos um prêmio.")
    .max(20, "Máximo de 20 prêmios."),
  umaChancePorGrupo: z.boolean(),
  regraLgpd: z.boolean(),
  regraMaiorIdade: z.boolean(),
});

/** Cria o sorteio completo vindo do wizard (edifício + prêmios + regras). */
export async function criarSorteioCompleto(
  payload: unknown
): Promise<EstadoSorteio> {
  const usuario = await exigirUsuario();
  const dados = esquemaSorteioCompleto.safeParse(payload);
  if (!dados.success) {
    return { erro: dados.error.issues[0].message };
  }

  const sorteio = await db.sorteio.create({
    data: {
      usuarioId: usuario.id,
      nome: dados.data.nome,
      tipoPredio: dados.data.tipoPredio,
      umaChancePorGrupo: dados.data.umaChancePorGrupo,
      regraLgpd: dados.data.regraLgpd,
      regraMaiorIdade: dados.data.regraMaiorIdade,
      premios: {
        create: dados.data.premios.map((p, i) => ({ ...p, ordem: i + 1 })),
      },
    },
  });
  redirect(`/app/sorteio/${sorteio.id}`);
}

export async function excluirSorteio(sorteioId: string): Promise<void> {
  await sorteioDoUsuario(sorteioId);
  await db.sorteio.delete({ where: { id: sorteioId } });
  revalidatePath("/app");
  redirect("/app");
}

export async function definirUmaChancePorGrupo(
  sorteioId: string,
  valor: boolean
): Promise<void> {
  await sorteioDoUsuario(sorteioId);
  const ganhadores = await db.ganhador.count({ where: { sorteioId } });
  if (ganhadores > 0) return;
  await db.sorteio.update({
    where: { id: sorteioId },
    data: { umaChancePorGrupo: valor },
  });
  revalidatePath(`/app/sorteio/${sorteioId}`);
}

/** Substitui a lista de prêmios. Só é permitido antes do primeiro sorteado. */
export async function atualizarPremios(
  sorteioId: string,
  premios: unknown
): Promise<EstadoSorteio> {
  await sorteioDoUsuario(sorteioId);
  const ganhadores = await db.ganhador.count({ where: { sorteioId } });
  if (ganhadores > 0) {
    return { erro: "Os prêmios não podem ser alterados depois do primeiro ganhador." };
  }

  const dados = z
    .array(esquemaPremio)
    .min(1, "Cadastre ao menos um prêmio.")
    .max(20, "Máximo de 20 prêmios.")
    .safeParse(premios);
  if (!dados.success) {
    return { erro: dados.error.issues[0].message };
  }

  await db.$transaction([
    db.premio.deleteMany({ where: { sorteioId } }),
    db.premio.createMany({
      data: dados.data.map((p, i) => ({ ...p, sorteioId, ordem: i + 1 })),
    }),
  ]);
  revalidatePath(`/app/sorteio/${sorteioId}`);
  return {};
}

// ---------- participantes ----------

const esquemaEmailOpcional = z
  .string()
  .trim()
  .toLowerCase()
  .max(200, "E-mail muito longo.")
  .refine(
    (v) => v === "" || z.string().email().safeParse(v).success,
    "E-mail inválido."
  );

const esquemaParticipante = z.object({
  nome: z.string().trim().min(1, "Informe o nome.").max(200),
  grupo: z.string().trim().max(100),
  telefone: z.string().trim().max(40),
  email: esquemaEmailOpcional,
});

export async function adicionarParticipante(
  sorteioId: string,
  formData: FormData
): Promise<EstadoSorteio> {
  const { sorteio } = await sorteioDoUsuario(sorteioId);
  if (await sorteioConcluido(sorteioId)) {
    return { erro: MSG_CONCLUIDO };
  }
  const dados = esquemaParticipante.safeParse({
    nome: formData.get("nome") ?? "",
    grupo: formData.get("grupo") ?? "",
    telefone: formData.get("telefone") ?? "",
    email: formData.get("email") ?? "",
  });
  if (!dados.success) {
    return { erro: dados.error.issues[0].message };
  }

  await db.participante.create({
    data: { ...dados.data, sorteioId: sorteio.id },
  });
  revalidatePath(`/app/sorteio/${sorteioId}`);
  return {};
}

export async function removerParticipante(
  sorteioId: string,
  participanteId: string
): Promise<EstadoSorteio> {
  await sorteioDoUsuario(sorteioId);
  if (await sorteioConcluido(sorteioId)) {
    return { erro: MSG_CONCLUIDO };
  }
  const participante = await db.participante.findUnique({
    where: { id: participanteId },
    include: { ganhador: true },
  });
  if (!participante || participante.sorteioId !== sorteioId) {
    return { erro: "Participante não encontrado." };
  }
  if (participante.ganhador) {
    return { erro: "Esse participante já foi sorteado; desfaça o resultado antes." };
  }
  await db.participante.delete({ where: { id: participanteId } });
  revalidatePath(`/app/sorteio/${sorteioId}`);
  return {};
}

export async function limparParticipantes(
  sorteioId: string
): Promise<EstadoSorteio> {
  await sorteioDoUsuario(sorteioId);
  if (await sorteioConcluido(sorteioId)) {
    return { erro: MSG_CONCLUIDO };
  }
  const ganhadores = await db.ganhador.count({ where: { sorteioId } });
  if (ganhadores > 0) {
    return { erro: "Há ganhadores registrados; desfaça os resultados antes de limpar." };
  }
  await db.participante.deleteMany({ where: { sorteioId } });
  revalidatePath(`/app/sorteio/${sorteioId}`);
  return {};
}

// ---------- cadastro no evento (tablet e link público) ----------

export type EstadoCadastroEvento = ResultadoCadastroEvento;

/**
 * Autocadastro do visitante no tablet durante a inauguração (exige a sessão
 * do responsável). O mesmo WhatsApp não entra duas vezes no mesmo sorteio.
 */
export async function cadastrarNoEvento(
  sorteioId: string,
  _anterior: EstadoCadastroEvento,
  formData: FormData
): Promise<EstadoCadastroEvento> {
  const { sorteio } = await sorteioDoUsuario(sorteioId);
  if (await sorteioConcluido(sorteioId)) {
    return { erro: "Os cadastros deste sorteio já foram encerrados." };
  }
  const resultado = await registrarParticipante(sorteio, formData);
  if (resultado.ok) revalidatePath(`/app/sorteio/${sorteioId}`);
  return resultado;
}

/**
 * Autocadastro público pelo celular do visitante, via QR Code do evento
 * (/participar/[token]). Sem sessão: o token público identifica o sorteio.
 */
export async function cadastrarPorToken(
  token: string,
  _anterior: EstadoCadastroEvento,
  formData: FormData
): Promise<EstadoCadastroEvento> {
  const sorteio = await db.sorteio.findUnique({
    where: { tokenPublico: token },
  });
  if (!sorteio) {
    return { erro: "Este link de cadastro não é válido." };
  }
  if (await sorteioConcluido(sorteio.id)) {
    return { erro: "Os cadastros deste sorteio já foram encerrados." };
  }
  const resultado = await registrarParticipante(sorteio, formData);
  if (resultado.ok) revalidatePath(`/app/sorteio/${sorteio.id}`);
  return resultado;
}

// ---------- sorteio de ganhadores ----------

export interface ResultadoSorteioAcao {
  erro?: string;
  semCreditos?: boolean;
  ganhador?: {
    id: string;
    nome: string;
    grupo: string;
    telefone: string;
    posicao: number;
  };
}

class SemCreditos extends Error {}

/**
 * Sorteia o próximo ganhador. O primeiro ganhador de um sorteio consome
 * 1 crédito, a menos que o usuário tenha assinatura ativa (regra em
 * prisma/schema.prisma).
 */
export async function sortearProximoGanhador(
  sorteioId: string
): Promise<ResultadoSorteioAcao> {
  const { usuario, sorteio } = await sorteioDoUsuario(sorteioId);

  const [participantes, ganhadores, premios] = await Promise.all([
    db.participante.findMany({
      where: { sorteioId },
      orderBy: { criadoEm: "asc" },
    }),
    db.ganhador.findMany({ where: { sorteioId } }),
    db.premio.findMany({ where: { sorteioId } }),
  ]);

  const meta = metaGanhadores(premios);
  if (meta > 0 && ganhadores.length >= meta) {
    return { erro: "Todos os prêmios deste sorteio já foram entregues." };
  }

  const urna = elegiveis(
    participantes,
    new Set(ganhadores.map((g) => g.participanteId)),
    sorteio.umaChancePorGrupo
  );
  const escolhido = sortearGanhador(urna);
  if (!escolhido) {
    return { erro: "Não há participantes elegíveis para sortear." };
  }

  const posicao = ganhadores.length + 1;

  try {
    await db.$transaction(async (tx) => {
      if (!sorteio.pago && !usuario.assinaturaAtiva) {
        const debitado = await tx.usuario.updateMany({
          where: { id: usuario.id, creditos: { gt: 0 } },
          data: { creditos: { decrement: 1 } },
        });
        if (debitado.count === 0) throw new SemCreditos();
        await tx.sorteio.update({
          where: { id: sorteioId },
          data: { pago: true },
        });
      }
      await tx.ganhador.create({
        data: {
          sorteioId,
          participanteId: escolhido.id,
          posicao,
          tamanhoUrna: urna.length,
        },
      });
    });
  } catch (e) {
    if (e instanceof SemCreditos) {
      return {
        semCreditos: true,
        erro: "Você não tem créditos. Compre um sorteio avulso ou assine o plano ilimitado.",
      };
    }
    // Corrida (dois cliques simultâneos) viola o @@unique(sorteioId, posicao).
    return { erro: "Não foi possível registrar o resultado. Tente novamente." };
  }

  revalidatePath(`/app/sorteio/${sorteioId}`);
  return {
    ganhador: {
      id: escolhido.id,
      nome: escolhido.nome,
      grupo: escolhido.grupo,
      telefone: escolhido.telefone,
      posicao,
    },
  };
}

/**
 * Remove o último ganhador registrado (para corrigir um engano). Depois de
 * concluído o sorteio vira prova do evento e não pode mais ser desfeito.
 */
export async function desfazerUltimoGanhador(
  sorteioId: string
): Promise<EstadoSorteio> {
  await sorteioDoUsuario(sorteioId);
  if (await sorteioConcluido(sorteioId)) {
    return { erro: MSG_CONCLUIDO };
  }
  const ultimo = await db.ganhador.findFirst({
    where: { sorteioId },
    orderBy: { posicao: "desc" },
  });
  if (!ultimo) {
    return { erro: "Não há ganhadores para desfazer." };
  }
  await db.ganhador.delete({ where: { id: ultimo.id } });
  revalidatePath(`/app/sorteio/${sorteioId}`);
  return {};
}
