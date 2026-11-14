import { describe, it, expect } from "vitest";
import { shortDimensionLabel } from "./dimension-label";

describe("shortDimensionLabel", () => {
  it("usa a primeira palavra de dimensões compostas", () => {
    expect(shortDimensionLabel("Governança e Responsabilidade")).toBe("Governança");
    expect(shortDimensionLabel("Arquitetura e Integração")).toBe("Arquitetura");
    expect(shortDimensionLabel("Qualidade de Dados")).toBe("Qualidade");
    expect(shortDimensionLabel("Metadados e Rastreabilidade")).toBe("Metadados");
    expect(shortDimensionLabel("Segurança e Conformidade (LGPD)")).toBe("Segurança");
    expect(shortDimensionLabel("Consumo e Autonomia Analítica")).toBe("Consumo");
    expect(shortDimensionLabel("Time e Capacidade")).toBe("Time");
  });

  it("traduz rótulos que perderiam o sentido com a primeira palavra", () => {
    expect(shortDimensionLabel("Dados Mestres e Cadastros")).toBe("Mestres");
    expect(shortDimensionLabel("IA, Modelos e Analytics Avançado")).toBe("IA/Analytics");
  });

  it("mantém nomes de uma palavra e remove pontuação final", () => {
    expect(shortDimensionLabel("Governança")).toBe("Governança");
    expect(shortDimensionLabel("Dados,")).toBe("Dados");
  });

  it("lida com texto vazio", () => {
    expect(shortDimensionLabel("   ")).toBe("");
  });
});
