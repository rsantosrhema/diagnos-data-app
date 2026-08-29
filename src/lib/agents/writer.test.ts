import { describe, it, expect, vi, beforeEach } from "vitest";
import { createWriterAgent, WriterError } from "./writer";
import { insightsBriefSchema } from "./types";
import type { AgentPayload } from "@/lib/screener/agent-payload";
import type { MarketAnalysis } from "./types";

function makePayload(): AgentPayload {
  return {
    versao: "1.0",
    solicitante: { nome: "João", cargo: "CTO" },
    empresa: { nome: "Corp", porte: null, segmento: "Indústria", funcionarios: null, faturamento: null },
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

function makeAnalysis(): MarketAnalysis {
  return {
    resumo: "A empresa enfrenta dores típicas do segmento.",
    dores: [
      {
        dimensao_id: "d01",
        dimensao: "Governança",
        dor: "Governança ad hoc",
        evidencia_mercado: true,
        confianca: 0.8,
      },
    ],
    contexto_concorrentes: [],
  };
}

function makeBullets(count: number, prioridade: "alta" | "media" | "baixa") {
  return Array.from({ length: count }, (_, i) => ({
    texto: `Bullet ${i}`,
    prioridade,
  }));
}

describe("createWriterAgent", () => {
  let generateObjectMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    generateObjectMock = vi.fn();
  });

  it("gerencia até 10 bullets com prioridade válida", async () => {
    generateObjectMock.mockResolvedValue({
      object: { bullets: makeBullets(10, "media") },
    });

    const llm = { modelId: "x", doGenerate: vi.fn() } as never;
    const agent = createWriterAgent({ llm, generateObject: generateObjectMock });

    const brief = await agent.run({ analysis: makeAnalysis(), payload: makePayload() });

    expect(brief.bullets).toHaveLength(10);
    for (const bullet of brief.bullets) {
      expect(["alta", "media", "baixa"]).toContain(bullet.prioridade);
    }
    expect(insightsBriefSchema.safeParse(brief).success).toBe(true);
  });

  it("pede até 10 bullets em PT-BR com prioridade alta/media/baixa no prompt", async () => {
    generateObjectMock.mockResolvedValue({ object: { bullets: [] } });

    const llm = { modelId: "x", doGenerate: vi.fn() } as never;
    const agent = createWriterAgent({ llm, generateObject: generateObjectMock });

    await agent.run({ analysis: makeAnalysis(), payload: makePayload() });

    const options = generateObjectMock.mock.calls[0][0];
    const promptText = String(options.prompt);
    expect(promptText).toContain("10");
    expect(promptText.toLowerCase()).toContain("português");
    expect(promptText).toContain("alta");
    expect(promptText).toContain("media");
    expect(promptText).toContain("baixa");
    expect(promptText).toContain("Governança");
    expect(options.schema).toBe(insightsBriefSchema);
  });

  it("trunca para 10 bullets mantendo a ordem quando o LLM devolve mais", async () => {
    generateObjectMock.mockResolvedValue({
      object: { bullets: makeBullets(15, "alta") },
    });

    const llm = { modelId: "x", doGenerate: vi.fn() } as never;
    const agent = createWriterAgent({ llm, generateObject: generateObjectMock });

    const brief = await agent.run({ analysis: makeAnalysis(), payload: makePayload() });

    expect(brief.bullets).toHaveLength(10);
    expect(brief.bullets[0].texto).toBe("Bullet 0");
    expect(brief.bullets[9].texto).toBe("Bullet 9");
  });

  it("lança WriterError quando o LLM devolve JSON inválido", async () => {
    generateObjectMock.mockRejectedValue(new Error("JSON inválido"));

    const llm = { modelId: "x", doGenerate: vi.fn() } as never;
    const agent = createWriterAgent({ llm, generateObject: generateObjectMock });

    await expect(
      agent.run({ analysis: makeAnalysis(), payload: makePayload() }),
    ).rejects.toBeInstanceOf(WriterError);
  });

  it("lança WriterError quando a saída não valida o schema estrito", async () => {
    generateObjectMock.mockResolvedValue({
      object: { bullets: [{ texto: "x", prioridade: "urgente" }] },
    });

    const llm = { modelId: "x", doGenerate: vi.fn() } as never;
    const agent = createWriterAgent({ llm, generateObject: generateObjectMock });

    await expect(
      agent.run({ analysis: makeAnalysis(), payload: makePayload() }),
    ).rejects.toBeInstanceOf(WriterError);
  });
});
