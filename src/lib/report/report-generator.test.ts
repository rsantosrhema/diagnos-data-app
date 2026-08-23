import { describe, it, expect } from "vitest";
import { generateScreenerPdf } from "./report-generator";
import type { GeneratePdfInput } from "@/lib/service/screen-service";

function makeInput(overrides: Partial<GeneratePdfInput> = {}): GeneratePdfInput {
  return {
    respondentName: "João Silva",
    band: { rotulo: "Estruturado", descricao: "Base técnica existe." },
    dimensionScores: [
      { name: "Governança e Responsabilidade", nivel: 3, peso: 12 },
      { name: "Patrocínio Executivo", nivel: 2, peso: 12 },
      { name: "Arquitetura e Integração", nivel: 4, peso: 12 },
      { name: "Qualidade de Dados", nivel: 3, peso: 12 },
      { name: "Metadados e Rastreabilidade", nivel: 3, peso: 10 },
      { name: "Dados Mestres e Cadastros", nivel: 2, peso: 8 },
      { name: "Segurança e Conformidade", nivel: 3, peso: 10 },
      { name: "Consumo e Autonomia Analítica", nivel: 3, peso: 10 },
      { name: "IA, Modelos e Analytics", nivel: 2, peso: 6 },
      { name: "Time e Capacidade", nivel: 3, peso: 8 },
    ],
    riskDimension: { name: "Patrocínio Executivo", nivel: 2 },
    imbalance: false,
    commercialAnswer: "Até R$ 50 mil",
    ...overrides,
  };
}

describe("generateScreenerPdf", () => {
  it("gera PDF com buffer não-vazio", async () => {
    const result = await generateScreenerPdf(makeInput());
    expect(result.pdf.length).toBeGreaterThan(0);
  });

  it("retorna filename sanitizado", async () => {
    const result = await generateScreenerPdf(
      makeInput({ respondentName: "João da Silva Jr." }),
    );
    expect(result.filename).toBe("diagnostico-jo-o-da-silva-jr.pdf");
  });

  it("filename não contém caracteres especiais", async () => {
    const result = await generateScreenerPdf(
      makeInput({ respondentName: "María José @Corp#1" }),
    );
    expect(result.filename).toMatch(/^diagnostico-[a-z0-9-]+\.pdf$/);
  });

  it("gera PDF com desequilíbrio", async () => {
    const result = await generateScreenerPdf(makeInput({ imbalance: true }));
    expect(result.pdf.length).toBeGreaterThan(0);
  });
});
