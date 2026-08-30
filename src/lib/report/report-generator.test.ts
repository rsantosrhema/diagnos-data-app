import { describe, it, expect } from "vitest";
import { generateScreenerPdf, ScreenerReport, buildReportChildren } from "./report-generator";
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

function hasText(node: unknown, text: string): boolean {
  if (node === null || node === undefined) return false;
  if (typeof node === "string") return node === text;
  if (Array.isArray(node)) return node.some((child) => hasText(child, text));
  const props = (node as { props?: unknown }).props;
  if (typeof props === "object" && props !== null) {
    const children = (props as { children?: unknown }).children;
    if (children === text) return true;
    if (Array.isArray(children)) return hasText(children, text);
  }
  return false;
}

function countText(node: unknown, text: string): number {
  if (node === null || node === undefined) return 0;
  if (typeof node === "string") return node === text ? 1 : 0;
  if (Array.isArray(node)) {
    return node.reduce((sum, child) => sum + countText(child, text), 0);
  }
  const props = (node as { props?: unknown }).props;
  if (typeof props === "object" && props !== null) {
    const children = (props as { children?: unknown }).children;
    let count = children === text ? 1 : 0;
    if (Array.isArray(children)) count += countText(children, text);
    return count;
  }
  return 0;
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

  it("gera PDF com bullets priorizados (alta/media/baixa) sem fonte", async () => {
    const input = makeInput({
      insights: {
        bullets: [
          { texto: "Falta governança de dados", prioridade: "alta" },
          { texto: "Fortalecer qualidade", prioridade: "media" },
          { texto: "Amadurecer analytics", prioridade: "baixa" },
        ],
      },
    });
    const children = buildReportChildren(input);
    expect(hasText(children, "Insights Priorizados")).toBe(true);
    expect(countText(children, "[ALTA] ")).toBe(1);
    expect(countText(children, "Falta governança de dados")).toBe(1);
    expect(countText(children, "[MEDIA] ")).toBe(1);
    expect(countText(children, "Fortalecer qualidade")).toBe(1);
    expect(countText(children, "[BAIXA] ")).toBe(1);
    expect(countText(children, "Amadurecer analytics")).toBe(1);
    const result = await generateScreenerPdf(input);
    expect(result.pdf.length).toBeGreaterThan(0);
    expect(result.pdf.toString("latin1")).not.toMatch(/https?:\/\/\S+/);
  });

  it("prioridade inválida usa cor padrão de baixa (não quebra o PDF)", async () => {
    const input = makeInput({
      insights: { bullets: [{ texto: "Tópico", prioridade: "urgente" as never }] },
    });
    const children = buildReportChildren(input);
    expect(hasText(children, "Insights Priorizados")).toBe(true);
    const result = await generateScreenerPdf(input);
    expect(result.pdf.length).toBeGreaterThan(0);
  });

  it("sem insights: omite a seção de bullets (PDF básico de fallback)", async () => {
    const children = buildReportChildren(makeInput({ insights: undefined }));
    expect(hasText(children, "Insights Priorizados")).toBe(false);
    const result = await generateScreenerPdf(makeInput({ insights: undefined }));
    expect(result.pdf.length).toBeGreaterThan(0);
  });

  it("com insights vazios: omite a seção de bullets", async () => {
    const children = buildReportChildren(makeInput({ insights: { bullets: [] } }));
    expect(hasText(children, "Insights Priorizados")).toBe(false);
    const result = await generateScreenerPdf(makeInput({ insights: { bullets: [] } }));
    expect(result.pdf.length).toBeGreaterThan(0);
  });
});
