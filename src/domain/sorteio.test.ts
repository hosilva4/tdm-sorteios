import { describe, expect, it } from "vitest";
import {
  elegiveis,
  normalizar,
  primeirosDoGrupo,
  sortearGanhador,
  sortearIndice,
  type ParticipanteSorteavel,
} from "./sorteio";

function p(
  id: string,
  grupo = "",
  nome = `Nome ${id}`
): ParticipanteSorteavel {
  return { id, nome, grupo, telefone: "" };
}

describe("normalizar", () => {
  it("remove acentos, caixa e espaços das pontas", () => {
    expect(normalizar("  Ação ")).toBe("acao");
    expect(normalizar("APTO 101")).toBe("apto 101");
    expect(normalizar(null)).toBe("");
    expect(normalizar(42)).toBe("42");
  });
});

describe("sortearIndice", () => {
  it("retorna -1 para urna vazia", () => {
    expect(sortearIndice(0)).toBe(-1);
    expect(sortearIndice(-3)).toBe(-1);
  });

  it("usa o valor gerado módulo n", () => {
    expect(sortearIndice(10, () => 7)).toBe(7);
    expect(sortearIndice(10, () => 13)).toBe(3);
  });

  it("rejeita amostras acima do limite para eliminar viés de módulo", () => {
    // Para n=6, limite = floor(2^32/6)*6 = 4294967292.
    const amostras = [4294967295, 4294967292, 4294967291];
    let i = 0;
    // As duas primeiras estão fora do intervalo aceito; a terceira vale 4294967291 % 6 = 5.
    expect(sortearIndice(6, () => amostras[i++])).toBe(5);
    expect(i).toBe(3);
  });

  it("sempre cai em [0, n) com o gerador real", () => {
    for (let i = 0; i < 200; i++) {
      const v = sortearIndice(7);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(7);
    }
  });
});

describe("primeirosDoGrupo", () => {
  it("mantém só a primeira ocorrência de cada grupo, ignorando caixa e acento", () => {
    const lista = [
      p("a", "Apto 101"),
      p("b", "apto 101"),
      p("c", "APTO 102"),
      p("d", "Áptó 101"),
    ];
    expect(primeirosDoGrupo(lista)).toEqual(new Set(["a", "c"]));
  });

  it("nunca agrupa participantes sem grupo", () => {
    const lista = [p("a"), p("b"), p("c", "1")];
    expect(primeirosDoGrupo(lista)).toEqual(new Set(["a", "b", "c"]));
  });
});

describe("elegiveis", () => {
  const lista = [
    p("a", "101"),
    p("b", "101"),
    p("c", "102"),
    p("d", ""),
  ];

  it("remove quem já foi sorteado", () => {
    const urna = elegiveis(lista, new Set(["c"]), false);
    expect(urna.map((x) => x.id)).toEqual(["a", "b", "d"]);
  });

  it("com uma chance por grupo, só o primeiro de cada grupo entra", () => {
    const urna = elegiveis(lista, new Set(), true);
    expect(urna.map((x) => x.id)).toEqual(["a", "c", "d"]);
  });

  it("combina as duas regras", () => {
    const urna = elegiveis(lista, new Set(["a"]), true);
    // "a" saiu por já ter ganhado; "b" continua fora por ser duplicata do grupo 101.
    expect(urna.map((x) => x.id)).toEqual(["c", "d"]);
  });
});

describe("sortearGanhador", () => {
  it("retorna null para urna vazia", () => {
    expect(sortearGanhador([])).toBeNull();
  });

  it("usa o gerador injetado para escolher", () => {
    const urna = [p("a"), p("b"), p("c")];
    expect(sortearGanhador(urna, () => 1)?.id).toBe("b");
    expect(sortearGanhador(urna, () => 5)?.id).toBe("c");
  });
});
