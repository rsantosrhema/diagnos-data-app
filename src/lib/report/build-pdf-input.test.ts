import { describe, it, expect } from "vitest";
import { buildPdfInput } from "./build-pdf-input";
import type { AgentPayload } from "@/lib/schemas/agent-payload";
import type { MarketAnalysis, InsightsBrief } from "@/lib/agents/types";
import { makeArsenal } from "@/lib/agents/commercial-fixture";

const payload: AgentPayload = {
  versao: "1.0",
  solicitante: { nome: "João", cargo: "CTO" },
  empresa: {
    nome: "Corp",
    porte: "Médio",
    segmento: "Indústria",
    funcionarios: "51 a 200",
    faturamento: "R$ 5 a 50 milhões",
  },
  contexto: {},
  perfil_empresa: {},
  respostas: [
    {
      dimensao_id: "d01",
      dimensao: "Governança e Responsabilidade",
      pergunta: "p",
      nivel: 2,
      peso: 15,
      resposta: "r",
    },
    {
      dimensao_id: "d03",
      dimensao: "Arquitetura e Integração",
      pergunta: "p",
      nivel: 4,
      peso: 12,
      resposta: "r",
    },
  ],
  resposta_comercial: { pergunta: "q", resposta: "Até R$ 50 mil" },
  score: { valor: 2.4, faixa: "Emergente", descricao: "descrição da faixa" },
  risco: { dimensao_id: "d01", nivel: 2 },
  desequilibrio: true,
  consentimento: { aceito: true, texto: "ok", aceito_em: "2026-08-29" },
};

const analysis: MarketAnalysis = { resumo: "resumo", dores: [], contexto_concorrentes: [] };
const insights: InsightsBrief = { bullets: [{ texto: "Insight", prioridade: "alta" }] };

describe("buildPdfInput", () => {
  it("reproduz o input do diagnóstico com band, dimensões, risco e resposta comercial", () => {
    const result = buildPdfInput(payload, {});

    expect(result).toEqual({
      respondentName: "João",
      band: { rotulo: "Emergente", descricao: "descrição da faixa" },
      dimensionScores: [
        {
          name: "Governança e Responsabilidade",
          nivel: 2,
          peso: 15,
          pesoPadrao: 12,
          areaDmbok: "Data Governance",
        },
        {
          name: "Arquitetura e Integração",
          nivel: 4,
          peso: 12,
          pesoPadrao: 12,
          areaDmbok: "Data Architecture / Data Integration",
        },
      ],
      riskDimension: { name: "Governança e Responsabilidade", nivel: 2 },
      imbalance: true,
      commercialAnswer: "Até R$ 50 mil",
    });
  });

  it("omite as chaves opcionais quando não há extras nem localização", () => {
    const result = buildPdfInput(payload, {});

    expect(Object.keys(result).sort()).toEqual([
      "band",
      "commercialAnswer",
      "dimensionScores",
      "imbalance",
      "respondentName",
      "riskDimension",
    ]);
    expect("arsenal" in result).toBe(false);
    expect("analysis" in result).toBe(false);
    expect("insights" in result).toBe(false);
    expect("location" in result).toBe(false);
  });

  it("inclui analysis, insights e arsenal quando fornecidos", () => {
    const arsenal = makeArsenal();

    const result = buildPdfInput(payload, { analysis, insights, arsenal });

    expect(result.analysis).toEqual(analysis);
    expect(result.insights).toEqual(insights);
    expect("arsenal" in result).toBe(true);
    expect(result.arsenal).toEqual(arsenal);
  });

  it("inclui location quando fornecida", () => {
    const result = buildPdfInput(payload, {}, { city: "São Paulo", state: "SP" });

    expect(result.location).toEqual({ city: "São Paulo", state: "SP" });
  });

  it("usa 'Dimensão' quando o risco aponta para uma dimensão ausente das respostas", () => {
    const result = buildPdfInput(
      { ...payload, risco: { dimensao_id: "d09", nivel: 3 } },
      {},
    );

    expect(result.riskDimension).toEqual({ name: "Dimensão", nivel: 3 });
  });
});
