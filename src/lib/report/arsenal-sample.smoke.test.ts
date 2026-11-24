import { describe, it, expect, beforeAll } from "vitest";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { generateScreenerPdf } from "./report-generator";
import { makeArsenal } from "@/lib/agents/commercial-fixture";
import type { GeneratePdfInput } from "@/lib/service/screen-service";

const runSample = process.env.RUN_ARSENAL_SAMPLE === "1";

function countPdfPages(pdf: Buffer): number {
  const content = pdf.toString("latin1");
  return (content.match(/\/Type\s*\/Page(?!s)/g) ?? []).length;
}

function makeInput(overrides: Partial<GeneratePdfInput> = {}): GeneratePdfInput {
  return {
    respondentName: "João Silva",
    band: {
      rotulo: "Estruturado",
      descricao: "Base técnica existe, mas decisões e qualidade ainda dependem de pessoas.",
    },
    dimensionScores: [
      { name: "Governança e Responsabilidade", nivel: 3, peso: 12, pesoPadrao: 12, areaDmbok: "Data Governance" },
      { name: "Patrocínio Executivo e Business Case", nivel: 2, peso: 12, pesoPadrao: 12, areaDmbok: "Data Governance (Data Strategy)" },
      { name: "Arquitetura e Integração", nivel: 4, peso: 12, pesoPadrao: 12, areaDmbok: "Data Architecture / Data Integration" },
      { name: "Qualidade de Dados", nivel: 1, peso: 12, pesoPadrao: 12, areaDmbok: "Data Quality" },
      { name: "Metadados e Rastreabilidade", nivel: 3, peso: 10, pesoPadrao: 10, areaDmbok: "Metadata Management" },
      { name: "Dados Mestres e Cadastros", nivel: 2, peso: 8, pesoPadrao: 8, areaDmbok: "Reference & Master Data" },
      { name: "Segurança e Conformidade (LGPD)", nivel: 1, peso: 10, pesoPadrao: 10, areaDmbok: "Data Security" },
      { name: "Consumo e Autonomia Analítica", nivel: 3, peso: 10, pesoPadrao: 10, areaDmbok: "Data Warehousing & BI" },
      { name: "IA, Modelos e Analytics Avançado", nivel: 1, peso: 6, pesoPadrao: 6, areaDmbok: "Big Data & Data Science" },
      { name: "Time e Capacidade", nivel: 2, peso: 8, pesoPadrao: 8, areaDmbok: "Data Management Organization & Role Expectations" },
    ],
    riskDimension: { name: "Qualidade de Dados", nivel: 1 },
    imbalance: true,
    commercialAnswer: "Entre R$ 250 mil e R$ 1 milhão",
    location: { city: "São Paulo", state: "SP" },
    analysis: {
      resumo:
        "Indústria de médio porte investe em plataforma de dados, mas mantém decisões de priorização informais e depende de poucas pessoas para conciliar números entre áreas.",
      dores: [
        {
          dimensao_id: "d04",
          dimensao: "Qualidade de Dados",
          dor: "Cadastros e indicadores divergem entre sistemas e a conciliação é manual.",
          evidencia_mercado: true,
          confianca: 0.8,
        },
        {
          dimensao_id: "d07",
          dimensao: "Segurança e Conformidade (LGPD)",
          dor: "Controle de acesso informal e LGPD tratada no papel.",
          evidencia_mercado: true,
          confianca: 0.7,
        },
        {
          dimensao_id: "d09",
          dimensao: "IA, Modelos e Analytics Avançado",
          dor: "Iniciativas de IA sem base de dados confiável e sem dono.",
          evidencia_mercado: false,
          confianca: 0.6,
        },
      ],
      contexto_concorrentes: [
        { nome: "Concorrente A", contexto: "Estruturou governança de dados e comitê de priorização." },
        { nome: "Concorrente B", contexto: "Investiu em qualidade de dados antes de ampliar analytics." },
      ],
    },
    insights: {
      bullets: [
        { texto: "Definir dono formal por domínio de dados.", prioridade: "alta", titulo: "Governança com dono" },
        { texto: "Tratar cadastros duplicados antes de novos indicadores.", prioridade: "alta", titulo: "Qualidade primeiro" },
        { texto: "Formalizar controle de acesso e base legal na LGPD.", prioridade: "media", titulo: "Segurança e LGPD" },
        { texto: "Criar trilha de capacitação para autonomia analítica.", prioridade: "baixa", titulo: "Autonomia analítica" },
      ],
    },
    ...overrides,
  };
}

describe.skipIf(!runSample)("Smoke do PDF de exemplo do Arsenal (fixture, sem LLM)", () => {
  let outDir = "";
  let withArsenal: Buffer;
  let withoutArsenal: Buffer;

  beforeAll(async () => {
    const dir = process.env.ARSENAL_OUT_DIR;
    if (!dir) {
      throw new Error("ARSENAL SMOKE: defina ARSENAL_OUT_DIR com a pasta onde os PDFs serão gravados");
    }
    mkdirSync(dir, { recursive: true });
    outDir = dir;
    withArsenal = (await generateScreenerPdf(makeInput({ arsenal: makeArsenal() }))).pdf;
    withoutArsenal = (await generateScreenerPdf(makeInput())).pdf;
  });

  it("gera o PDF de exemplo com o Arsenal e grava o arquivo", async () => {
    const file = join(outDir, "arsenal-sample.pdf");
    writeFileSync(file, withArsenal);

    expect(withArsenal.subarray(0, 4).toString("latin1")).toBe("%PDF");
    expect(withArsenal.length).toBeGreaterThan(5000);
    expect(countPdfPages(withArsenal)).toBe(countPdfPages(withoutArsenal) + 3);
    expect(existsSync(file)).toBe(true);
    expect(readFileSync(file).equals(withArsenal)).toBe(true);
  });

  it("gera o PDF base sem o Arsenal para comparação lado a lado", async () => {
    const file = join(outDir, "arsenal-sample-no-arsenal.pdf");
    writeFileSync(file, withoutArsenal);

    expect(withoutArsenal.subarray(0, 4).toString("latin1")).toBe("%PDF");
    expect(withoutArsenal.length).toBeGreaterThan(5000);
    expect(countPdfPages(withoutArsenal)).toBeLessThan(countPdfPages(withArsenal));
    expect(existsSync(file)).toBe(true);
    expect(readFileSync(file).equals(withoutArsenal)).toBe(true);
  });
});
