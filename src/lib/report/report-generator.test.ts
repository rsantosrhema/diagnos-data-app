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

function collectBackgroundColors(node: unknown): string[] {
  const colors: string[] = [];
  const walk = (n: unknown): void => {
    if (n === null || n === undefined) return;
    if (Array.isArray(n)) {
      n.forEach(walk);
      return;
    }
    if (typeof n !== "object") return;
    const props = (n as { props?: unknown }).props;
    if (typeof props === "object" && props !== null) {
      const style = (props as { style?: unknown }).style;
      if (Array.isArray(style)) {
        for (const s of style) {
          if (s && typeof s === "object" && typeof (s as { backgroundColor?: unknown }).backgroundColor === "string") {
            colors.push((s as { backgroundColor: string }).backgroundColor);
          }
        }
      }
      const children = (props as { children?: unknown }).children;
      if (Array.isArray(children)) walk(children);
    }
  };
  walk(node);
  return colors;
}

function collectTexts(node: unknown): string[] {
  if (node === null || node === undefined) return [];
  if (typeof node === "string") return [node];
  if (Array.isArray(node)) return node.flatMap(collectTexts);
  const props = (node as { props?: unknown }).props;
  if (typeof props !== "object" || props === null) return [];
  const children = (props as { children?: unknown }).children;
  if (children === null || children === undefined) return [];
  return collectTexts(children);
}

function countMetaDots(node: unknown): number {
  if (node === null || node === undefined) return 0;
  if (Array.isArray(node)) {
    return node.reduce((sum, child) => sum + countMetaDots(child), 0);
  }
  if (typeof node !== "object") return 0;
  const props = (node as { props?: unknown }).props;
  if (typeof props !== "object" || props === null) return 0;
  const style = (props as { style?: unknown }).style;
  const isDot =
    typeof style === "object" &&
    style !== null &&
    (style as { backgroundColor?: unknown }).backgroundColor === "#B8B2C2";
  const children = (props as { children?: unknown }).children;
  return (isDot ? 1 : 0) + countMetaDots(children);
}

function hasLocationText(node: unknown): boolean {
  return collectTexts(node).some((text) => /\/[A-Z]{2}$/.test(text));
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

  it("ordena por prioridade antes de limitar a 4 bullets", () => {
    const input = makeInput({
      insights: {
        bullets: [
          { texto: "B1", prioridade: "baixa" },
          { texto: "B2", prioridade: "baixa" },
          { texto: "M1", prioridade: "media" },
          { texto: "A1", prioridade: "alta" },
          { texto: "A2", prioridade: "alta" },
        ],
      },
    });
    const children = buildReportChildren(input);
    expect(countText(children, "A1")).toBe(1);
    expect(countText(children, "A2")).toBe(1);
    expect(countText(children, "M1")).toBe(1);
    expect(countText(children, "B1")).toBe(1);
    expect(countText(children, "B2")).toBe(0);
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
    expect(hasText(children, "Insights priorizados")).toBe(true);
    expect(countText(children, "ALTA")).toBe(1);
    expect(countText(children, "Falta governança de dados")).toBe(1);
    expect(countText(children, "MÉDIA")).toBe(1);
    expect(countText(children, "Fortalecer qualidade")).toBe(1);
    expect(countText(children, "BAIXA")).toBe(1);
    expect(countText(children, "Amadurecer analytics")).toBe(1);
    const colors = collectBackgroundColors(children);
    expect(colors).toContain("#B23A34");
    expect(colors).toContain("#A9741A");
    expect(colors).toContain("#2F6FA8");
    const result = await generateScreenerPdf(input);
    expect(result.pdf.length).toBeGreaterThan(0);
    expect(result.pdf.toString("latin1")).not.toMatch(/https?:\/\/\S+/);
  });

  it("prioridade inválida usa cor padrão de baixa (azul) (não quebra o PDF)", async () => {
    const input = makeInput({
      insights: { bullets: [{ texto: "Tópico", prioridade: "urgente" as never }] },
    });
    const children = buildReportChildren(input);
    expect(hasText(children, "Insights priorizados")).toBe(true);
    const colors = collectBackgroundColors(children).filter((c) => c === "#2F6FA8");
    expect(colors).toEqual(["#2F6FA8"]);
    expect(collectBackgroundColors(children)).not.toContain("#B23A34");
    expect(collectBackgroundColors(children)).not.toContain("#A9741A");
    const result = await generateScreenerPdf(input);
    expect(result.pdf.length).toBeGreaterThan(0);
  });

  it("analysis presente: renderiza seção Análise com resumo e dores (PDF-01)", async () => {
    const input = makeInput({
      analysis: {
        resumo: "Empresa enfrenta dores típicas do segmento.",
        dores: [
          {
            dimensao_id: "d01",
            dimensao: "Governança e Responsabilidade",
            dor: "Falta de dono dos dados",
            evidencia_mercado: true,
            confianca: 0.8,
          },
        ],
        contexto_concorrentes: [],
      },
    });
    const children = buildReportChildren(input);
    expect(hasText(children, "Análise de mercado")).toBe(true);
    expect(hasText(children, "Empresa enfrenta dores típicas do segmento.")).toBe(true);
    expect(hasText(children, "Falta de dono dos dados")).toBe(true);
    const result = await generateScreenerPdf(input);
    expect(result.pdf.length).toBeGreaterThan(0);
  });

  it("analysis ausente: omite a seção Análise (PDF-01 edge)", async () => {
    const children = buildReportChildren(makeInput({ analysis: undefined }));
    expect(hasText(children, "Análise de mercado")).toBe(false);
  });

  it("contexto_concorrentes não-vazio: renderiza seção Concorrentes (PDF-03)", async () => {
    const input = makeInput({
      analysis: {
        resumo: "r",
        dores: [],
        contexto_concorrentes: [
          { nome: "Concorrente X", contexto: "Investe em governança" },
        ],
      },
    });
    const children = buildReportChildren(input);
    expect(hasText(children, "Concorrentes")).toBe(true);
    expect(hasText(children, "Concorrente X")).toBe(true);
    expect(hasText(children, "Investe em governança")).toBe(true);
  });

  it("contexto_concorrentes vazio: omite a seção Concorrentes (PDF-03 edge)", async () => {
    const children = buildReportChildren(
      makeInput({ analysis: { resumo: "r", dores: [], contexto_concorrentes: [] } }),
    );
    expect(hasText(children, "Concorrentes")).toBe(false);
  });

  it("sem insights: omite a seção de bullets (PDF básico de fallback)", async () => {
    const children = buildReportChildren(makeInput({ insights: undefined }));
    expect(hasText(children, "Insights priorizados")).toBe(false);
    const result = await generateScreenerPdf(makeInput({ insights: undefined }));
    expect(result.pdf.length).toBeGreaterThan(0);
  });

  it("com insights vazios: omite a seção de bullets", async () => {
    const children = buildReportChildren(makeInput({ insights: { bullets: [] } }));
    expect(hasText(children, "Insights priorizados")).toBe(false);
    const result = await generateScreenerPdf(makeInput({ insights: { bullets: [] } }));
    expect(result.pdf.length).toBeGreaterThan(0);
  });

  it("renderiza seção Radar de Maturidade com dimensionScores (RADAR-01)", async () => {
    const children = buildReportChildren(makeInput());
    expect(hasText(children, "Radar de maturidade")).toBe(true);
    const result = await generateScreenerPdf(makeInput());
    expect(result.pdf.length).toBeGreaterThan(0);
  });

  it("omite a seção Radar quando dimensionScores vazio (RADAR-01 edge)", () => {
    const children = buildReportChildren(makeInput({ dimensionScores: [] }));
    expect(hasText(children, "Radar de maturidade")).toBe(false);
  });

  it("location presente: exibe Cidade/UF uma única vez na capa (LOC-16)", () => {
    const children = buildReportChildren(
      makeInput({ location: { city: "São Paulo", state: "SP" } }),
    );
    expect(hasText(children, "São Paulo/SP")).toBe(true);
    expect(countText(children, "São Paulo/SP")).toBe(1);
    expect(countMetaDots(children)).toBe(4);
  });

  it("location com cidade composta e acentuada é renderizada verbatim (LOC-16)", () => {
    const children = buildReportChildren(
      makeInput({ location: { city: "São José do Rio Preto", state: "SP" } }),
    );
    expect(countText(children, "São José do Rio Preto/SP")).toBe(1);
  });

  it("location presente: mantém os demais itens do cabeçalho (LOC-16 regression)", () => {
    const children = buildReportChildren(
      makeInput({ location: { city: "São Paulo", state: "SP" } }),
    );
    expect(countText(children, "João Silva")).toBe(1);
    expect(countText(children, "Rhema Data")).toBe(1);
    expect(countText(children, "10 dimensões")).toBe(1);
    expect(countText(children, "Autoavaliação")).toBe(1);
  });

  it("sem location: não exibe Cidade/UF nem placeholder (LOC-17)", () => {
    const children = buildReportChildren(makeInput());
    expect(hasLocationText(children)).toBe(false);
    expect(collectTexts(children)).not.toContain("undefined/undefined");
    expect(countMetaDots(children)).toBe(3);
  });

  it("location com campos vazios é omitida da capa (LOC-17)", () => {
    const cases: { city: string; state: string }[] = [
      { city: "", state: "SP" },
      { city: "São Paulo", state: "" },
      { city: "   ", state: "   " },
    ];
    for (const location of cases) {
      const children = buildReportChildren(makeInput({ location }));
      expect(hasLocationText(children)).toBe(false);
      expect(countMetaDots(children)).toBe(3);
    }
  });

  it("gera PDF com location presente (LOC-16)", async () => {
    const result = await generateScreenerPdf(
      makeInput({ location: { city: "São Paulo", state: "SP" } }),
    );
    expect(result.pdf.length).toBeGreaterThan(0);
  });
});
