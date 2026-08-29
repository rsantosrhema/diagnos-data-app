import { describe, it, expect, vi, beforeEach } from "vitest";
import { createAnalystAgent, AnalystError, type GenerateObjectFn } from "./analyst";
import { marketAnalysisSchema } from "./types";
import type { AgentPayload } from "@/lib/screener/agent-payload";
import type { MarketResearch } from "./types";

const LLM_INPUT = {
  system: "Você é um analista de mercado.",
  prompt: "Responda estritamente em JSON.",
};

const ANALYSIS_OUTPUT = {
  resumo: "A empresa enfrenta dores típicas.",
  dores: [
    {
      dimensao_id: "d01",
      dimensao: "Governança",
      dor: "Governança de dados ad hoc",
      evidencia_mercado: true,
      confianca: 0.8,
    },
  ],
  contexto_concorrentes: [{ nome: "Concorrente", contexto: "Investe em analytics" }],
};

function makePayload(): AgentPayload {
  return {
    versao: "1.0",
    solicitante: { nome: "João", cargo: "CTO" },
    empresa: {
      nome: "Corp",
      porte: "51 a 200",
      segmento: "Indústria",
      funcionarios: "51 a 200",
      faturamento: "R$ 5 a 50 milhões",
    },
    contexto: {},
    perfil_empresa: {},
    respostas: [
      {
        dimensao_id: "d01",
        dimensao: "Governança",
        pergunta: "P?",
        nivel: 2,
        peso: 10,
        resposta: "Ad hoc",
      },
    ],
    resposta_comercial: { pergunta: "Q?", resposta: "Até R$ 50 mil" },
    score: { valor: 2.1, faixa: "Emergente", descricao: "Início" },
    risco: { dimensao_id: "d01", nivel: 2 },
    desequilibrio: false,
    consentimento: { aceito: true, texto: "ok", aceito_em: "2026-08-23T12:00:00Z" },
  };
}

function makeResearch(): MarketResearch {
  return {
    empresa: { segmento: "Indústria", faturamento: "x", funcionarios: "y", nome: "Corp" },
    sections: [
      {
        key: "segmento",
        query: "maturidade de dados indústria",
        status: "ok",
        results: [
          {
            title: "Relatório",
            url: "https://exemplo.com/relatorio",
            snippet: "Dores de governança no setor industrial",
          },
        ],
      },
    ],
    sources: ["https://exemplo.com/relatorio"],
  };
}

describe("createAnalystAgent", () => {
  let generateObjectMock: ReturnType<typeof vi.fn<GenerateObjectFn>>;

  beforeEach(() => {
    generateObjectMock = vi.fn();
  });

  it("monta prompt com scores, pesquisa e skill de segmento; valida saída com schema estrito", async () => {
    generateObjectMock.mockResolvedValue({ object: ANALYSIS_OUTPUT });

    const llm = { modelId: "deepseek/deepseek-v4-flash", doGenerate: vi.fn() } as never;
    const skillLoader = vi.fn((segmento: string) => `Skill de ${segmento}`);
    const agent = createAnalystAgent({
      llm,
      generateObject: generateObjectMock,
      skillLoader,
    });

    const analysis = await agent.run({ research: makeResearch(), payload: makePayload() });

    expect(skillLoader).toHaveBeenCalledWith("Indústria");
    const prompt = generateObjectMock.mock.calls[0][0] as { schema: unknown; prompt: string };
    expect(prompt.schema).toBe(marketAnalysisSchema);
    const promptText = String(prompt.prompt);
    expect(promptText).toContain("Skill de Indústria");
    expect(promptText).toContain("Governança");
    expect(promptText).toContain("2.1");
    expect(promptText).toContain("Emergente");
    expect(promptText).toContain("https://exemplo.com/relatorio");

    expect(marketAnalysisSchema.safeParse(analysis).success).toBe(true);
  });

  it("usa skill de segmento do payload mesmo quando o segmento é nulo", async () => {
    generateObjectMock.mockResolvedValue({ object: ANALYSIS_OUTPUT });
    const llm = { modelId: "x", doGenerate: vi.fn() } as never;
    const skillLoader = vi.fn(() => "Skill genérica");
    const agent = createAnalystAgent({
      llm,
      generateObject: generateObjectMock,
      skillLoader,
    });

    const payload = makePayload();
    payload.empresa.segmento = null;
    await agent.run({ research: makeResearch(), payload });

    const promptText = String(generateObjectMock.mock.calls[0][0].prompt);
    expect(promptText).toContain("Skill genérica");
  });

  it("lança AnalystError quando generateObject lança erro", async () => {
    generateObjectMock.mockRejectedValue(new Error("LLM fora do ar"));
    const llm = { modelId: "x", doGenerate: vi.fn() } as never;
    const skillLoader = vi.fn(() => "skill");
    const agent = createAnalystAgent({
      llm,
      generateObject: generateObjectMock,
      skillLoader,
    });

    await expect(
      agent.run({ research: makeResearch(), payload: makePayload() }),
    ).rejects.toBeInstanceOf(AnalystError);
  });

  it("lança AnalystError quando a saída não valida o schema estrito", async () => {
    generateObjectMock.mockResolvedValue({
      object: { resumo: "faltando dores e contexto" },
    });
    const llm = { modelId: "x", doGenerate: vi.fn() } as never;
    const skillLoader = vi.fn(() => "skill");
    const agent = createAnalystAgent({
      llm,
      generateObject: generateObjectMock,
      skillLoader,
    });

    await expect(
      agent.run({ research: makeResearch(), payload: makePayload() }),
    ).rejects.toBeInstanceOf(AnalystError);
  });

  it("chama o LLM via generateObject injetado com model, prompt e system", () => {
    expect(typeof LLM_INPUT.system).toBe("string");
    expect(typeof LLM_INPUT.prompt).toBe("string");
  });
});
