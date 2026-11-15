import { z } from "zod";

import { ESTADOS, UF_SIGLAS } from "./estados";

const SIGLAS_ESPERADAS = [
  "AC",
  "AL",
  "AP",
  "AM",
  "BA",
  "CE",
  "DF",
  "ES",
  "GO",
  "MA",
  "MT",
  "MS",
  "MG",
  "PA",
  "PB",
  "PR",
  "PE",
  "PI",
  "RJ",
  "RN",
  "RS",
  "RO",
  "RR",
  "SC",
  "SP",
  "SE",
  "TO",
];

describe("ESTADOS", () => {
  it("tem exatamente as 27 UFs brasileiras", () => {
    expect(ESTADOS).toHaveLength(27);
    expect(new Set(ESTADOS.map((estado) => estado.sigla))).toEqual(
      new Set(SIGLAS_ESPERADAS),
    );
  });

  it("usa siglas únicas de duas letras maiúsculas", () => {
    const siglas = ESTADOS.map((estado) => estado.sigla);

    expect(new Set(siglas).size).toBe(siglas.length);
    for (const sigla of siglas) {
      expect(sigla).toMatch(/^[A-Z]{2}$/);
    }
  });

  it("mantém a ordem oficial das siglas", () => {
    expect(ESTADOS.map((estado) => estado.sigla)).toEqual(SIGLAS_ESPERADAS);
  });

  it("associa SP a São Paulo", () => {
    expect(ESTADOS.find((estado) => estado.sigla === "SP")).toEqual({
      sigla: "SP",
      nome: "São Paulo",
    });
  });

  it("preserva os acentos dos nomes oficiais", () => {
    const nomes = ESTADOS.map((estado) => estado.nome);

    expect(nomes).toContain("Amapá");
    expect(nomes).toContain("São Paulo");
    expect(nomes).toContain("Espírito Santo");
    expect(nomes).toContain("Rondônia");
  });

  it("não tem nomes vazios", () => {
    for (const estado of ESTADOS) {
      expect(estado.nome.trim()).not.toBe("");
    }
  });
});

describe("UF_SIGLAS", () => {
  it("tem as mesmas siglas de ESTADOS na mesma ordem", () => {
    expect(UF_SIGLAS).toEqual(ESTADOS.map((estado) => estado.sigla));
  });

  it("é uma tupla não vazia", () => {
    expect(Array.isArray(UF_SIGLAS)).toBe(true);
    expect(UF_SIGLAS.length).toBeGreaterThan(0);
  });

  it("alimenta um z.enum que aceita todas as siglas", () => {
    const ufSchema = z.enum(UF_SIGLAS);

    for (const sigla of UF_SIGLAS) {
      expect(ufSchema.safeParse(sigla).success).toBe(true);
    }
  });

  it("rejeita uma UF inexistente", () => {
    expect(z.enum(UF_SIGLAS).safeParse("XX").success).toBe(false);
  });

  it("rejeita sigla em minúsculas", () => {
    expect(z.enum(UF_SIGLAS).safeParse("sp").success).toBe(false);
  });
});
