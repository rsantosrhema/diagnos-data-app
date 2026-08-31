import { describe, it, expect, vi } from "vitest";
import { createAnalysisService } from "./analysis-service";
import type { AnalysisQueueRepository } from "@/lib/repository/analysis-queue-repo";
import type { MarketInsightsRepository } from "@/lib/repository/market-insights-repo";
import type { AgentPayload } from "@/lib/screener/agent-payload";
import type { MarketResearch, MarketAnalysis, InsightsBrief } from "@/lib/agents/types";

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

const research: MarketResearch = {
  empresa: { segmento: "Indústria", faturamento: "R$ 5 a 50 milhões", funcionarios: "51 a 200", nome: "Corp" },
  sections: [],
  sources: ["https://example.com"],
};

const analysis: MarketAnalysis = { resumo: "resumo", dores: [], contexto_concorrentes: [] };

const insights: InsightsBrief = { bullets: [{ texto: "Insight", prioridade: "alta" }] };

function mockQueueRepo(overrides: Partial<AnalysisQueueRepository> = {}): AnalysisQueueRepository {
  return {
    enqueue: vi.fn(),
    read: vi.fn(),
    ack: vi.fn(),
    requeue: vi.fn(),
    resetReadCount: vi.fn().mockResolvedValue({ alreadyRetried: false }),
    stats: vi.fn(),
    failStale: vi.fn(),
    ...overrides,
  };
}

function mockInsightsRepo(overrides: Partial<MarketInsightsRepository> = {}): MarketInsightsRepository {
  return {
    upsert: vi.fn(),
    findByLeadId: vi.fn(),
    markStatus: vi.fn(),
    logEvent: vi.fn(),
    ...overrides,
  };
}

function mockOrchestrator() {
  return {
    research: vi.fn().mockResolvedValue(research),
    analyst: vi.fn().mockResolvedValue(analysis),
    writer: vi.fn().mockResolvedValue(insights),
  };
}

function mockGeneratePdf() {
  return vi.fn().mockResolvedValue({
    pdf: Buffer.from("fake-pdf"),
    filename: "diagnostico.pdf",
  });
}

function mockSendEmail() {
  return vi.fn().mockResolvedValue(undefined);
}

function mockLeadRepo(overrides: { updateStatus?: (id: string, status: string) => Promise<void> } = {}) {
  return {
    updateStatus: overrides.updateStatus ?? vi.fn().mockResolvedValue(undefined),
  };
}

function createService(deps: {
  queueRepo?: AnalysisQueueRepository;
  insightsRepo?: MarketInsightsRepository;
  orchestrator?: ReturnType<typeof mockOrchestrator>;
  payloadLoader?: (leadId: string) => Promise<AgentPayload | null>;
  leadRepo?: { updateStatus(id: string, status: string): Promise<void> };
  generatePdf?: ReturnType<typeof mockGeneratePdf>;
  sendEmail?: ReturnType<typeof mockSendEmail>;
}) {
  return createAnalysisService({
    queueRepo: deps.queueRepo ?? mockQueueRepo(),
    insightsRepo: deps.insightsRepo ?? mockInsightsRepo(),
    orchestrator: deps.orchestrator ?? mockOrchestrator(),
    payloadLoader: deps.payloadLoader ?? (async () => payload),
    leadRepo: deps.leadRepo ?? mockLeadRepo(),
    generatePdf: deps.generatePdf ?? mockGeneratePdf(),
    sendEmail: deps.sendEmail ?? mockSendEmail(),
  });
}

describe("AnalysisService", () => {
  describe("enqueue", () => {
    it("chama queueRepo.enqueue com o leadId e retorna {ok, queued}", async () => {
      const enqueue = vi.fn().mockResolvedValue({ ok: true, queued: true });
      const service = createService({ queueRepo: mockQueueRepo({ enqueue }) });

      const result = await service.enqueue("lead-1");

      expect(enqueue).toHaveBeenCalledWith("lead-1");
      expect(result).toEqual({ ok: true, queued: true });
    });

    it("propaga erro do enfileiramento (não engole)", async () => {
      const enqueue = vi.fn().mockRejectedValue(new Error("queue down"));
      const service = createService({ queueRepo: mockQueueRepo({ enqueue }) });

      await expect(service.enqueue("lead-1")).rejects.toThrow("queue down");
      expect(enqueue).toHaveBeenCalledWith("lead-1");
    });

    it("failStale repassa o limite ao queueRepo", async () => {
      const failStale = vi.fn().mockResolvedValue(3);
      const service = createService({ queueRepo: mockQueueRepo({ failStale }) });

      const result = await service.failStale(30);

      expect(failStale).toHaveBeenCalledWith(30);
      expect(result).toBe(3);
    });
  });

  describe("processNext", () => {
    it("fila vazia: retorna { processed: false }", async () => {
      const queueRepo = mockQueueRepo({ read: vi.fn().mockResolvedValue(null) });
      const insightsRepo = mockInsightsRepo();
      const service = createService({ queueRepo, insightsRepo });

      const result = await service.processNext();

      expect(result).toEqual({ processed: false });
      expect(insightsRepo.upsert).not.toHaveBeenCalled();
      expect(insightsRepo.markStatus).not.toHaveBeenCalled();
    });

    it("happy path: read → payload → agentes granulares → upsert analisado + ack + log de etapas + e-mail real", async () => {
      const queueRepo = mockQueueRepo({
        read: vi.fn().mockResolvedValue({ msgId: "42", leadId: "lead-1" }),
        ack: vi.fn().mockResolvedValue(undefined),
      });
      const payloadLoader = vi.fn().mockResolvedValue(payload);
      const orchestrator = mockOrchestrator();
      const upsert = vi.fn().mockResolvedValue(undefined);
      const logEvent = vi.fn().mockResolvedValue(undefined);
      const insightsRepo = mockInsightsRepo({ upsert, logEvent });
      const generatePdf = mockGeneratePdf();
      const sendEmail = mockSendEmail();

      const service = createService({
        queueRepo,
        insightsRepo,
        orchestrator,
        payloadLoader,
        generatePdf,
        sendEmail,
      });

      const result = await service.processNext();

      expect(result).toEqual({ processed: true });
      expect(payloadLoader).toHaveBeenCalledWith("lead-1");
      expect(orchestrator.research).toHaveBeenCalledWith(payload);
      expect(orchestrator.analyst).toHaveBeenCalledWith({ research, payload });
      expect(orchestrator.writer).toHaveBeenCalledWith({ analysis, payload });
      expect(upsert).toHaveBeenCalledWith({
        leadId: "lead-1",
        research,
        analysis,
        insights,
        sources: research.sources,
        status: "analisado",
      });
      expect(logEvent).toHaveBeenCalledWith("lead-1", "researcher", undefined, expect.any(Number));
      expect(logEvent).toHaveBeenCalledWith("lead-1", "analyst", undefined, expect.any(Number));
      expect(logEvent).toHaveBeenCalledWith("lead-1", "writer", undefined, expect.any(Number));
      // pdf/email logados DEPOIS do envio real
      expect(logEvent).toHaveBeenCalledWith("lead-1", "pdf", undefined, expect.any(Number));
      expect(logEvent).toHaveBeenCalledWith("lead-1", "email", undefined, expect.any(Number));
      expect(queueRepo.ack).toHaveBeenCalledWith("42", "lead-1", "analisado", undefined, expect.any(Number));
      // EMAIL-02: e-mail com PDF enriquecido (insights/analysis no input)
      expect(generatePdf).toHaveBeenCalledWith(
        expect.objectContaining({
          insights,
          analysis,
        }),
      );
      expect(sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: expect.any(String),
          subject: expect.stringContaining("João"),
          attachment: expect.objectContaining({ filename: "diagnostico.pdf" }),
        }),
      );
    });

    it("payload ausente: ack falha + log failed e NÃO envia e-mail", async () => {
      const queueRepo = mockQueueRepo({
        read: vi.fn().mockResolvedValue({ msgId: "42", leadId: "lead-1" }),
        ack: vi.fn().mockResolvedValue(undefined),
      });
      const payloadLoader = vi.fn().mockResolvedValue(null);
      const logEvent = vi.fn().mockResolvedValue(undefined);
      const insightsRepo = mockInsightsRepo({ logEvent });
      const orchestrator = mockOrchestrator();
      const sendEmail = mockSendEmail();

      const service = createService({
        queueRepo,
        insightsRepo,
        orchestrator,
        payloadLoader,
        sendEmail,
      });

      const result = await service.processNext();

      expect(result).toEqual({ processed: true });
      expect(logEvent).toHaveBeenCalledWith("lead-1", "failed", "agent_payload não encontrado para o lead");
      expect(queueRepo.ack).toHaveBeenCalledWith("42", "lead-1", "falha", "agent_payload não encontrado para o lead", expect.any(Number));
      expect(orchestrator.research).not.toHaveBeenCalled();
      expect(sendEmail).not.toHaveBeenCalled();
    });

    it("falha do pipeline com attempts < 2: requeue 1x + NÃO envia e-mail no retry (EMAIL-03 só na falha final)", async () => {
      const queueRepo = mockQueueRepo({
        read: vi.fn().mockResolvedValue({ msgId: "42", leadId: "lead-1" }),
        ack: vi.fn().mockResolvedValue(undefined),
        requeue: vi.fn().mockResolvedValue(undefined),
        resetReadCount: vi.fn().mockResolvedValue({ alreadyRetried: false }),
      });
      const orchestrator = mockOrchestrator();
      orchestrator.research.mockRejectedValue(new Error("llm down"));
      const logEvent = vi.fn().mockResolvedValue(undefined);
      const findByLeadId = vi.fn().mockResolvedValue({ attempts: 1 } as never);
      const insightsRepo = mockInsightsRepo({ logEvent, findByLeadId });
      const updateStatus = vi.fn().mockResolvedValue(undefined);
      const leadRepo = { updateStatus };
      const generatePdf = mockGeneratePdf();
      const sendEmail = mockSendEmail();

      const service = createService({
        queueRepo,
        insightsRepo,
        orchestrator,
        leadRepo,
        generatePdf,
        sendEmail,
      });

      const result = await service.processNext();

      expect(result).toEqual({ processed: true });
      expect(logEvent).toHaveBeenCalledWith("lead-1", "failed", expect.stringContaining("llm down"), expect.any(Number));
      // retry: não arquiva, devolve à fila (com lock), NÃO envia e-mail
      expect(queueRepo.ack).not.toHaveBeenCalled();
      expect(queueRepo.resetReadCount).toHaveBeenCalledWith("42");
      expect(insightsRepo.markStatus).not.toHaveBeenCalled();
      expect(logEvent).toHaveBeenCalledWith("lead-1", "requeue", expect.stringContaining("fila"));
      // lead marcado para reprocessamento manual
      expect(updateStatus).toHaveBeenCalledWith("lead-1", "analise_pendente");
      expect(generatePdf).not.toHaveBeenCalled();
      expect(sendEmail).not.toHaveBeenCalled();
    });

    it("falha do pipeline com attempts < 2 e lock já tomado: encerra sem efeitos (sem requeue duplicado, sem e-mail)", async () => {
      const queueRepo = mockQueueRepo({
        read: vi.fn().mockResolvedValue({ msgId: "42", leadId: "lead-1" }),
        ack: vi.fn().mockResolvedValue(undefined),
        requeue: vi.fn().mockResolvedValue(undefined),
        resetReadCount: vi.fn().mockResolvedValue({ alreadyRetried: true }),
      });
      const orchestrator = mockOrchestrator();
      orchestrator.research.mockRejectedValue(new Error("llm down"));
      const logEvent = vi.fn().mockResolvedValue(undefined);
      const findByLeadId = vi.fn().mockResolvedValue({ attempts: 1 } as never);
      const insightsRepo = mockInsightsRepo({ logEvent, findByLeadId });
      const updateStatus = vi.fn().mockResolvedValue(undefined);
      const leadRepo = { updateStatus };
      const sendEmail = mockSendEmail();

      const service = createService({
        queueRepo,
        insightsRepo,
        orchestrator,
        leadRepo,
        sendEmail,
      });

      const result = await service.processNext();

      expect(result).toEqual({ processed: true });
      expect(queueRepo.ack).not.toHaveBeenCalled();
      expect(queueRepo.requeue).not.toHaveBeenCalled();
      expect(updateStatus).not.toHaveBeenCalled();
      expect(insightsRepo.markStatus).not.toHaveBeenCalled();
      expect(sendEmail).not.toHaveBeenCalled();
    });

    it("falha do pipeline com attempts >= 2: ack falha definitivo + PDF básico + e-mail (EMAIL-03)", async () => {
      const queueRepo = mockQueueRepo({
        read: vi.fn().mockResolvedValue({ msgId: "42", leadId: "lead-1" }),
        ack: vi.fn().mockResolvedValue(undefined),
        requeue: vi.fn().mockResolvedValue(undefined),
        resetReadCount: vi.fn().mockResolvedValue({ alreadyRetried: false }),
      });
      const orchestrator = mockOrchestrator();
      orchestrator.research.mockRejectedValue(new Error("llm down"));
      const logEvent = vi.fn().mockResolvedValue(undefined);
      const findByLeadId = vi.fn().mockResolvedValue({ attempts: 2 } as never);
      const insightsRepo = mockInsightsRepo({ logEvent, findByLeadId });
      const generatePdf = mockGeneratePdf();
      const sendEmail = mockSendEmail();

      const service = createService({
        queueRepo,
        insightsRepo,
        orchestrator,
        generatePdf,
        sendEmail,
      });

      const result = await service.processNext();

      expect(result).toEqual({ processed: true });
      expect(queueRepo.resetReadCount).not.toHaveBeenCalled();
      expect(queueRepo.ack).toHaveBeenCalledWith("42", "lead-1", "falha", expect.stringContaining("llm down"), expect.any(Number));
      expect(generatePdf).toHaveBeenCalledWith(
        expect.not.objectContaining({ insights: expect.anything() }),
      );
      expect(sendEmail).toHaveBeenCalledTimes(1);
    });

    it("falha de e-mail (Resend down): mantém analisado + loga email_failed (opção A)", async () => {
      const queueRepo = mockQueueRepo({
        read: vi.fn().mockResolvedValue({ msgId: "42", leadId: "lead-1" }),
        ack: vi.fn().mockResolvedValue(undefined),
      });
      const orchestrator = mockOrchestrator();
      const upsert = vi.fn().mockResolvedValue(undefined);
      const logEvent = vi.fn().mockResolvedValue(undefined);
      const insightsRepo = mockInsightsRepo({ upsert, logEvent });
      const generatePdf = mockGeneratePdf();
      const sendEmail = mockSendEmail();
      sendEmail.mockRejectedValue(new Error("resend down"));

      const service = createService({
        queueRepo,
        insightsRepo,
        orchestrator,
        generatePdf,
        sendEmail,
      });

      const result = await service.processNext();

      expect(result).toEqual({ processed: true });
      expect(upsert).toHaveBeenCalledWith(expect.objectContaining({ status: "analisado" }));
      expect(logEvent).toHaveBeenCalledWith("lead-1", "pdf", undefined, expect.any(Number));
      expect(logEvent).toHaveBeenCalledWith("lead-1", "email_failed", "resend down", undefined);
      expect(queueRepo.ack).toHaveBeenCalledWith("42", "lead-1", "analisado", undefined, expect.any(Number));
    });

    it("falha de PDF: ack falha + marca analise_pendente (relatório não existe)", async () => {
      const queueRepo = mockQueueRepo({
        read: vi.fn().mockResolvedValue({ msgId: "42", leadId: "lead-1" }),
        ack: vi.fn().mockResolvedValue(undefined),
      });
      const orchestrator = mockOrchestrator();
      const upsert = vi.fn().mockResolvedValue(undefined);
      const logEvent = vi.fn().mockResolvedValue(undefined);
      const insightsRepo = mockInsightsRepo({ upsert, logEvent });
      const generatePdf = vi.fn().mockRejectedValue(new Error("pdf renderer down"));
      const sendEmail = mockSendEmail();
      const updateStatus = vi.fn().mockResolvedValue(undefined);
      const leadRepo = { updateStatus };

      const service = createService({
        queueRepo,
        insightsRepo,
        orchestrator,
        leadRepo,
        generatePdf,
        sendEmail,
      });

      const result = await service.processNext();

      expect(result).toEqual({ processed: true });
      expect(logEvent).toHaveBeenCalledWith("lead-1", "pdf_failed", "pdf renderer down", undefined);
      expect(queueRepo.ack).toHaveBeenCalledWith("42", "lead-1", "falha", "Falha ao gerar o PDF do relatório", expect.any(Number));
      expect(updateStatus).toHaveBeenCalledWith("lead-1", "analise_pendente");
    });
  });
});
