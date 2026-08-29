import { describe, it, expect, vi } from "vitest";
import { createAnalysisService } from "./analysis-service";
import type { AnalysisQueueRepository } from "@/lib/repository/analysis-queue-repo";
import type { MarketInsightsRepository } from "@/lib/repository/market-insights-repo";
import type { AgentPayload } from "@/lib/screener/agent-payload";
import type { AgentOutput } from "@/lib/agents/orchestrator";

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
  respostas: [],
  resposta_comercial: { pergunta: "p", resposta: "r" },
  score: { valor: 3, faixa: "Estruturado", descricao: "d" },
  risco: { dimensao_id: "d01", nivel: 1 },
  desequilibrio: false,
  consentimento: { aceito: true, texto: "ok", aceito_em: "2026-08-29" },
};

const output: AgentOutput = {
  research: {
    empresa: { segmento: "Indústria", faturamento: "R$ 5 a 50 milhões", funcionarios: "51 a 200", nome: "Corp" },
    sections: [],
    sources: ["https://example.com"],
  },
  analysis: { resumo: "resumo", dores: [], contexto_concorrentes: [] },
  insights: { bullets: [] },
};

function mockQueueRepo(overrides: Partial<AnalysisQueueRepository> = {}): AnalysisQueueRepository {
  return {
    enqueue: vi.fn(),
    pop: vi.fn(),
    ...overrides,
  };
}

function mockInsightsRepo(overrides: Partial<MarketInsightsRepository> = {}): MarketInsightsRepository {
  return {
    upsert: vi.fn(),
    findByLeadId: vi.fn(),
    markStatus: vi.fn(),
    ...overrides,
  };
}

function mockOrchestrator(run: () => Promise<AgentOutput>) {
  return { run: vi.fn().mockImplementation(run) };
}

function createService(deps: {
  queueRepo?: AnalysisQueueRepository;
  insightsRepo?: MarketInsightsRepository;
  orchestrator?: { run: (payload: AgentPayload) => Promise<AgentOutput> };
  payloadLoader?: (leadId: string) => Promise<AgentPayload | null>;
}) {
  return createAnalysisService({
    queueRepo: deps.queueRepo ?? mockQueueRepo(),
    insightsRepo: deps.insightsRepo ?? mockInsightsRepo(),
    orchestrator: deps.orchestrator ?? mockOrchestrator(async () => output),
    payloadLoader: deps.payloadLoader ?? (async () => payload),
  });
}

describe("AnalysisService", () => {
  describe("enqueue", () => {
    it("chama queueRepo.enqueue com o leadId", async () => {
      const enqueue = vi.fn().mockResolvedValue(undefined);
      const service = createService({ queueRepo: mockQueueRepo({ enqueue }) });

      await service.enqueue("lead-1");

      expect(enqueue).toHaveBeenCalledWith("lead-1");
    });

    it("não lança quando o enfileiramento falha (AC INS-03)", async () => {
      const enqueue = vi.fn().mockRejectedValue(new Error("queue down"));
      const service = createService({ queueRepo: mockQueueRepo({ enqueue }) });

      await expect(service.enqueue("lead-1")).resolves.toBeUndefined();
      expect(enqueue).toHaveBeenCalledWith("lead-1");
    });
  });

  describe("processNext", () => {
    it("fila vazia: retorna { processed: false }", async () => {
      const queueRepo = mockQueueRepo({ pop: vi.fn().mockResolvedValue(null) });
      const insightsRepo = mockInsightsRepo();
      const service = createService({ queueRepo, insightsRepo });

      const result = await service.processNext();

      expect(result).toEqual({ processed: false });
      expect(insightsRepo.upsert).not.toHaveBeenCalled();
      expect(insightsRepo.markStatus).not.toHaveBeenCalled();
    });

    it("happy path: pop → payloadLoader → orchestrator → upsert analisado", async () => {
      const queueRepo = mockQueueRepo({
        pop: vi.fn().mockResolvedValue({ msgId: "42", leadId: "lead-1" }),
      });
      const payloadLoader = vi.fn().mockResolvedValue(payload);
      const orchestrator = mockOrchestrator(async () => output);
      const upsert = vi.fn().mockResolvedValue(undefined);
      const insightsRepo = mockInsightsRepo({ upsert });

      const service = createService({
        queueRepo,
        insightsRepo,
        orchestrator,
        payloadLoader,
      });

      const result = await service.processNext();

      expect(result).toEqual({ processed: true });
      expect(payloadLoader).toHaveBeenCalledWith("lead-1");
      expect(orchestrator.run).toHaveBeenCalledWith(payload);
      expect(upsert).toHaveBeenCalledWith({
        leadId: "lead-1",
        research: output.research,
        analysis: output.analysis,
        insights: output.insights,
        sources: output.research.sources,
        status: "analisado",
      });
      expect(insightsRepo.markStatus).not.toHaveBeenCalled();
    });

    it("payload ausente: marca falha e retorna processed true", async () => {
      const queueRepo = mockQueueRepo({
        pop: vi.fn().mockResolvedValue({ msgId: "42", leadId: "lead-1" }),
      });
      const payloadLoader = vi.fn().mockResolvedValue(null);
      const markStatus = vi.fn().mockResolvedValue(undefined);
      const insightsRepo = mockInsightsRepo({ markStatus });
      const orchestrator = mockOrchestrator(async () => output);

      const service = createService({
        queueRepo,
        insightsRepo,
        orchestrator,
        payloadLoader,
      });

      const result = await service.processNext();

      expect(result).toEqual({ processed: true });
      expect(markStatus).toHaveBeenCalledWith("lead-1", "falha", expect.any(String));
      expect(orchestrator.run).not.toHaveBeenCalled();
    });

    it("falha do orchestrator: marca falha, não relança, retorna processed true", async () => {
      const queueRepo = mockQueueRepo({
        pop: vi.fn().mockResolvedValue({ msgId: "42", leadId: "lead-1" }),
      });
      const orchestrator = mockOrchestrator(async () => {
        throw new Error("llm down");
      });
      const markStatus = vi.fn().mockResolvedValue(undefined);
      const insightsRepo = mockInsightsRepo({ markStatus });

      const service = createService({ queueRepo, insightsRepo, orchestrator });

      const result = await service.processNext();

      expect(result).toEqual({ processed: true });
      expect(markStatus).toHaveBeenCalledWith("lead-1", "falha", expect.stringContaining("llm down"));
      expect(insightsRepo.upsert).not.toHaveBeenCalled();
    });
  });
});
