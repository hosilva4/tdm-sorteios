import { describe, expect, it } from "vitest";
import {
  formatarTelefone,
  limparTexto,
  mascararTelefone,
  soDigitos,
} from "./telefone";

describe("limparTexto", () => {
  it("colapsa espaços e apara as pontas", () => {
    expect(limparTexto("  Ana   Maria \n Silva ")).toBe("Ana Maria Silva");
    expect(limparTexto(null)).toBe("");
    expect(limparTexto(101)).toBe("101");
  });
});

describe("soDigitos", () => {
  it("mantém apenas dígitos", () => {
    expect(soDigitos("(11) 98765-4321")).toBe("11987654321");
    expect(soDigitos(undefined)).toBe("");
  });
});

describe("formatarTelefone", () => {
  it("formata celular de 11 dígitos", () => {
    expect(formatarTelefone("11987654321")).toBe("(11) 98765-4321");
  });

  it("formata fixo de 10 dígitos", () => {
    expect(formatarTelefone("1134567890")).toBe("(11) 3456-7890");
  });

  it("formata 13 dígitos começando com 55", () => {
    expect(formatarTelefone("5511987654321")).toBe("+55 (11) 98765-4321");
  });

  it("remove o sufixo .0 vindo do Excel antes de formatar", () => {
    expect(formatarTelefone("11987654321.0")).toBe("(11) 98765-4321");
  });

  it("devolve como veio o que não reconhece", () => {
    expect(formatarTelefone("ramal 42")).toBe("ramal 42");
    expect(formatarTelefone("")).toBe("");
  });
});

describe("mascararTelefone", () => {
  it("mantém só os 4 primeiros dígitos visíveis", () => {
    expect(mascararTelefone("(11) 98765-4321")).toBe("(11) 98•••-••••");
  });

  it("não altera texto sem dígitos", () => {
    expect(mascararTelefone("sem telefone")).toBe("sem telefone");
  });
});
