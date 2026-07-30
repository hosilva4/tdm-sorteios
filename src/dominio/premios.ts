// Prêmios do sorteio: as posições dos ganhadores percorrem os prêmios na
// ordem definida no wizard, respeitando a quantidade de cada um.
// Ex.: [voucher x3, brinde x1] → posições 1 a 3 ganham voucher, posição 4 o brinde.

export interface PremioResumo {
  ordem: number;
  tipo: string;
  descricao: string;
  quantidade: number;
}

export const TIPOS_PREMIO = ["cupom", "voucher", "brinde", "outro"] as const;

const ROTULO_TIPO: Record<string, string> = {
  cupom: "Cupom",
  voucher: "Voucher",
  brinde: "Brinde",
  outro: "Prêmio",
};

/** Nome exibível de um prêmio: a descrição, ou o tipo como fallback. */
export function nomePremio(premio: PremioResumo): string {
  return premio.descricao || ROTULO_TIPO[premio.tipo] || "Prêmio";
}

/** Total de ganhadores planejado. Zero significa sem meta (sorteio livre). */
export function metaGanhadores(premios: PremioResumo[]): number {
  return premios.reduce((soma, p) => soma + p.quantidade, 0);
}

/**
 * Prêmio da posição (1-indexada), com o número da unidade dentro dele
 * (ex.: 2 de 3). Null se a posição passa da meta ou não há prêmios.
 */
export function premioDaPosicao(
  premios: PremioResumo[],
  posicao: number
): { premio: PremioResumo; unidade: number } | null {
  if (posicao < 1) return null;
  const ordenados = [...premios].sort((a, b) => a.ordem - b.ordem);
  let acumulado = 0;
  for (const premio of ordenados) {
    if (posicao <= acumulado + premio.quantidade) {
      return { premio, unidade: posicao - acumulado };
    }
    acumulado += premio.quantidade;
  }
  return null;
}
