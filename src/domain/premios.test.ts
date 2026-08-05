import { describe, expect, it } from "vitest";
import {
  metaGanhadores,
  nomePremio,
  premioDaPosicao,
  type PremioResumo,
} from "./premios";

const premios: PremioResumo[] = [
  { ordem: 1, tipo: "voucher", descricao: "Voucher R$ 50", quantidade: 3 },
  { ordem: 2, tipo: "brinde", descricao: "", quantidade: 1 },
];

describe("metaGanhadores", () => {
  it("soma as quantidades", () => {
    expect(metaGanhadores(premios)).toBe(4);
    expect(metaGanhadores([])).toBe(0);
  });
});

describe("premioDaPosicao", () => {
  it("percorre os prêmios na ordem, respeitando quantidades", () => {
    expect(premioDaPosicao(premios, 1)).toEqual({
      premio: premios[0],
      unidade: 1,
    });
    expect(premioDaPosicao(premios, 3)).toEqual({
      premio: premios[0],
      unidade: 3,
    });
    expect(premioDaPosicao(premios, 4)).toEqual({
      premio: premios[1],
      unidade: 1,
    });
  });

  it("retorna null fora da meta", () => {
    expect(premioDaPosicao(premios, 5)).toBeNull();
    expect(premioDaPosicao(premios, 0)).toBeNull();
    expect(premioDaPosicao([], 1)).toBeNull();
  });

  it("respeita a ordem mesmo com a lista embaralhada", () => {
    const embaralhada = [premios[1], premios[0]];
    expect(premioDaPosicao(embaralhada, 1)?.premio.tipo).toBe("voucher");
    expect(premioDaPosicao(embaralhada, 4)?.premio.tipo).toBe("brinde");
  });
});

describe("nomePremio", () => {
  it("usa a descrição quando existe, senão o rótulo do tipo", () => {
    expect(nomePremio(premios[0])).toBe("Voucher R$ 50");
    expect(nomePremio(premios[1])).toBe("Brinde");
    expect(
      nomePremio({ ordem: 1, tipo: "outro", descricao: "", quantidade: 1 })
    ).toBe("Prêmio");
  });
});
