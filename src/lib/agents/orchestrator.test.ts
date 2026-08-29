import { describe, it, expect, vi, beforeEach } from "vitest";
import { createAgentOrchestrator } from "./orchestrator";
import type { AgentPayload } from "@/lib/screener/agent-payload";
import type { MarketResearch, MarketAnalysis, InsightsBrief } from "./types";

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

function makeResearch(): MarketResearch {
  return {
    empresa: { segmento: "Indústria", faturamento: null, funcionarios: null, nome: "Corp" },
    sections: [],
    sources: ["https://exemplo.com"],
  };
}

function makeAnalysis(): MarketAnalysis {
  return {
    resumo: "Análise de exemplo",
    dores: [],
    contexto_concorrentes: [],
  };
}

function makeBrief(): InsightsBrief {
  return { bullets: [{ texto: "Insight", prioridade: "alta" }] };
}

type AnalystFn = (input: {
  research: MarketResearch;
  payload: AgentPayload;
}) => Promise<MarketAnalysis>;

type WriterFn = (input: {
  analysis: MarketAnalysis;
  payload: AgentPayload;
}) => Promise<InsightsBrief>;

describe("createAgentOrchestrator", () => {
  let researcher: ReturnType<typeof vi.fn<(payload: AgentPayload) => Promise<MarketResearch>>>;
  let analyst: ReturnType<typeof vi.fn<AnalystFn>>;
  let writer: ReturnType<typeof vi.fn<WriterFn>>;
  let payload: AgentPayload;

  beforeEach(() => {
    researcher = vi.fn();
    analyst = vi.fn();
    writer = vi.fn();
    payload = makePayload();
  });

  it("executa researcher → analyst → writer passando saída de um como entrada do próximo", async () => {
    const research = makeResearch();
    const analysis = makeAnalysis();
    const brief = makeBrief();

    researcher.mockResolvedValue(research);
    analyst.mockResolvedValue(analysis);
    writer.mockResolvedValue(brief);

    const orchestrator = createAgentOrchestrator({
      researcher: { run: researcher },
      analyst: { run: analyst },
      writer: { run: writer },
    });

    const output = await orchestrator.run(payload);

    expect(researcher).toHaveBeenCalledTimes(1);
    expect(researcher).toHaveBeenCalledWith(payload);
    expect(analyst).toHaveBeenCalledTimes(1);
    expect(analyst).toHaveBeenCalledWith({ research, payload });
    expect(writer).toHaveBeenCalledTimes(1);
    expect(writer).toHaveBeenCalledWith({ analysis, payload });

    expect(output).toEqual({ research, analysis, insights: brief });
  });

  it("propaga erro do researcher", async () => {
    const error = new Error("Exa falhou");
    researcher.mockRejectedValue(error);
    analyst.mockResolvedValue(makeAnalysis());
    writer.mockResolvedValue(makeBrief());

    const orchestrator = createAgentOrchestrator({
      researcher: { run: researcher },
      analyst: { run: analyst },
      writer: { run: writer },
    });

    await expect(orchestrator.run(payload)).rejects.toThrow("Exa falhou");
    expect(analyst).not.toHaveBeenCalled();
    expect(writer).not.toHaveBeenCalled();
  });

  it("propaga erro do analyst", async () => {
    const error = new Error("LLM inválido");
    researcher.mockResolvedValue(makeResearch());
    analyst.mockRejectedValue(error);
    writer.mockResolvedValue(makeBrief());

    const orchestrator = createAgentOrchestrator({
      researcher: { run: researcher },
      analyst: { run: analyst },
      writer: { run: writer },
    });

    await expect(orchestrator.run(payload)).rejects.toThrow("LLM inválido");
    expect(writer).not.toHaveBeenCalled();
  });

  it("propaga erro do writer", async () => {
    const error = new Error("Brief inválido");
    researcher.mockResolvedValue(makeResearch());
    analyst.mockResolvedValue(makeAnalysis());
    writer.mockRejectedValue(error);

    const orchestrator = createAgentOrchestrator({
      researcher: { run: researcher },
      analyst: { run: analyst },
      writer: { run: writer },
    });

    await expect(orchestrator.run(payload)).rejects.toThrow("Brief inválido");
  });
});
