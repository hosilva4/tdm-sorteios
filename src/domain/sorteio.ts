export interface ParticipanteSorteavel {
  id: string;
  nome: string;
  grupo: string;
  telefone: string;
}

export function normalizar(s: unknown): string {
  return String(s ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

/**
 * Índice aleatório uniforme em [0, n) via crypto.getRandomValues com rejeição
 * de amostra (elimina o viés de módulo). `gerar` é injetável para teste.
 */
export function sortearIndice(
  n: number,
  gerar: () => number = () => {
    const a = new Uint32Array(1);
    globalThis.crypto.getRandomValues(a);
    return a[0];
  }
): number {
  if (n <= 0) return -1;
  const limite = Math.floor(4294967296 / n) * n;
  let v: number;
  do {
    v = gerar();
  } while (v >= limite);
  return v % n;
}

/** Ids da primeira ocorrência de cada grupo (grupo vazio nunca é agrupado). */
export function primeirosDoGrupo(participantes: ParticipanteSorteavel[]): Set<string> {
  const vistos = new Set<string>();
  const primeiros = new Set<string>();
  for (const p of participantes) {
    const chave = normalizar(p.grupo);
    if (!chave) {
      primeiros.add(p.id);
      continue;
    }
    if (!vistos.has(chave)) {
      vistos.add(chave);
      primeiros.add(p.id);
    }
  }
  return primeiros;
}

/**
 * Urna: participantes − já sorteados − (se umaChancePorGrupo) duplicatas do grupo.
 * Cada linha é uma chance; quem já ganhou não volta na mesma rodada.
 */
export function elegiveis(
  participantes: ParticipanteSorteavel[],
  sorteadosIds: Set<string>,
  umaChancePorGrupo: boolean
): ParticipanteSorteavel[] {
  const primeiros = umaChancePorGrupo ? primeirosDoGrupo(participantes) : null;
  return participantes.filter((p) => {
    if (sorteadosIds.has(p.id)) return false;
    if (primeiros && !primeiros.has(p.id)) return false;
    return true;
  });
}

/** Sorteia um ganhador da urna. Retorna null se a urna estiver vazia. */
export function sortearGanhador(
  urna: ParticipanteSorteavel[],
  gerar?: () => number
): ParticipanteSorteavel | null {
  if (!urna.length) return null;
  return urna[sortearIndice(urna.length, gerar)];
}
