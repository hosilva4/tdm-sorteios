// Tipo de prédio do sorteio: muda os rótulos do agrupador no cadastro.
// Residencial agrupa por apartamento/bloco; comercial, por setor.

export type TipoPredio = "residencial" | "comercial";

export function ehComercial(tipo: string): boolean {
  return tipo === "comercial";
}

export function rotuloGrupo(tipo: string): string {
  return ehComercial(tipo) ? "Setor" : "Apartamento/bloco";
}

export function rotuloGrupoCurto(tipo: string): string {
  return ehComercial(tipo) ? "Setor" : "Apartamento";
}

export function rotuloChancePorGrupo(tipo: string): string {
  return ehComercial(tipo) ? "Uma chance por setor" : "Uma chance por apartamento";
}
