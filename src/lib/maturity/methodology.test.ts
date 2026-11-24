import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  INDEX_LABEL,
  SCALE_LEGEND,
  METHOD_NOTE,
  formatWeight,
  formatScore,
  getBaseWeight,
  getAreaDmbok,
  describeDimension,
} from "./methodology";
import { SCREENER_CONTRACT } from "@/lib/screener/contract";

describe("INDEX_LABEL", () => {
  it("identifica o índice e a base metodológica", () => {
    expect(INDEX_LABEL).toBe("Índice de Maturidade Rhema · base DAMA-DMBOK2");
  });
});

describe("SCALE_LEGEND", () => {
  it("lista os 5 níveis do DAMA-DMBOK2", () => {
    expect(SCALE_LEGEND).toBe(
      "Escala de níveis (DAMA-DMBOK2): 1 Inicial · 2 Repetível · 3 Definido · 4 Gerenciado · 5 Otimizado",
    );
  });

  it("é montada a partir de meta.escala_niveis do contrato", () => {
    const esperado = `Escala de níveis (DAMA-DMBOK2): ${SCREENER_CONTRACT.meta.escala_niveis
      .map((nivel) => `${nivel.nivel} ${nivel.rotulo}`)
      .join(" · ")}`;
    expect(SCALE_LEGEND).toBe(esperado);
  });
});

describe("METHOD_NOTE", () => {
  it("é a referência metodológica do contrato", () => {
    expect(METHOD_NOTE).toBe(SCREENER_CONTRACT.meta.referencia);
    expect(METHOD_NOTE).toContain("DAMA-DMBOK2");
  });
});

describe("formatWeight", () => {
  it("mostra o peso do setor contra o padrão quando são diferentes", () => {
    expect(formatWeight(13, 10)).toBe("13% (padrão 10%)");
  });

  it("mostra só o peso quando é igual ao padrão", () => {
    expect(formatWeight(10, 10)).toBe("10% (padrão)");
  });
});

describe("formatScore", () => {
  it("formata com uma casa decimal e vírgula", () => {
    expect(formatScore(2.34)).toBe("2,3 de 5");
  });

  it("mantém a casa decimal em valor inteiro", () => {
    expect(formatScore(5)).toBe("5,0 de 5");
  });
});

describe("getBaseWeight", () => {
  it("retorna o peso padrão da dimensão conhecida", () => {
    expect(getBaseWeight("d07")).toBe(10);
  });

  it("retorna null para dimensão desconhecida", () => {
    expect(getBaseWeight("x99")).toBeNull();
  });
});

describe("getAreaDmbok", () => {
  it("retorna a área DMBOK2 da dimensão conhecida", () => {
    expect(getAreaDmbok("d09")).toBe("Big Data & Data Science");
  });

  it("retorna null para dimensão desconhecida", () => {
    expect(getAreaDmbok("x99")).toBeNull();
  });
});

describe("describeDimension", () => {
  it("devolve peso padrão e área da dimensão conhecida", () => {
    expect(describeDimension("d07", 13)).toEqual({
      pesoPadrao: 10,
      areaDmbok: "Data Security",
    });
  });

  it("cai para o peso informado e área vazia em dimensão desconhecida", () => {
    expect(describeDimension("x99", 7)).toEqual({ pesoPadrao: 7, areaDmbok: "" });
  });
});

describe("módulo compartilhado com o client", () => {
  it("não importa server-only nem lê process.env", () => {
    const source = readFileSync(
      join(process.cwd(), "src/lib/maturity/methodology.ts"),
      "utf8",
    );
    expect(source).not.toContain("server-only");
    expect(source).not.toContain("process.env");
  });
});
