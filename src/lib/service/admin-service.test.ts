import { describe, it, expect, vi } from "vitest";
import { createAdminService, AdminServiceError } from "./admin-service";
import type { LeadRepository, LeadRow } from "@/lib/repository/lead-repo";
import type { AssessmentRepository } from "@/lib/repository/assessment-repo";
import type { MarketInsightsRepository, MarketInsightsRow } from "@/lib/repository/market-insights-repo";
import type { AnalysisQueueRepository } from "@/lib/repository/analysis-queue-repo";
import type { AdminLogEntryDTO } from "@/lib/dto/admin";

function mockLeadRepo(overrides: Partial<LeadRepository> = {}): LeadRepository {
  return {
    findById: vi.fn(),
    findByEmail: vi.fn(),
    findByEmailAndStatus: vi.fn(),
    create: vi.fn(),
    updateStatus: vi.fn(),
    findAll: vi.fn(),
    findNameAndEmail: vi.fn(),
    findProfileById: vi.fn(),
    ...overrides,
  };
}

function mockAssessmentRepo(overrides: Partial<AssessmentRepository> = {}): AssessmentRepository {
  return {
    existsForLead: vi.fn().mockResolvedValue(false),
    createAssessmentResponse: vi.fn(),
    createDiagnostic: vi.fn(),
    findByLeadId: vi.fn(),
    ...overrides,
  };
}

function mockMarketInsightsRepo(
  overrides: Partial<MarketInsightsRepository> = {},
): MarketInsightsRepository {
  return {
    upsert: vi.fn(),
    findByLeadId: vi.fn().mockResolvedValue(null),
    markStatus: vi.fn(),
    logEvent: vi.fn(),
    ...overrides,
  };
}

function mockQueueRepo(overrides: Partial<AnalysisQueueRepository> = {}): AnalysisQueueRepository {
  return {
    enqueue: vi.fn(),
    read: vi.fn(),
    ack: vi.fn(),
    requeue: vi.fn(),
    resetReadCount: vi.fn().mockResolvedValue({ alreadyRetried: false }),
    stats: vi.fn().mockResolvedValue({
      queueLength: 0,
      oldestAgeSec: null,
      pendente: 0,
      processando: 0,
      analisado: 0,
      falha: 0,
    }),
    failStale: vi.fn(),
    ...overrides,
  };
}

function mockLogLoader(logs: AdminLogEntryDTO[] = []) {
  return vi.fn().mockResolvedValue(logs);
}

function insightRow(overrides: Partial<MarketInsightsRow> = {}): MarketInsightsRow {
  return {
    id: "ins-1",
    lead_id: "l1",
    research: null,
    analysis: null,
    insights: null,
    sources: null,
    status: "analisado",
    error: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    queued_at: null,
    processing_started_at: null,
    completed_at: null,
    attempts: 0,
    ...overrides,
  };
}

function mockAnalysisService(overrides: { enqueue?: (leadId: string) => Promise<{ ok: boolean; queued: boolean }> } = {}) {
  return {
    enqueue: overrides.enqueue ?? vi.fn().mockResolvedValue({ ok: true, queued: true }),
  };
}

function createAdminServiceForTest(deps: {
  leadRepo?: LeadRepository;
  assessmentRepo?: AssessmentRepository;
  marketInsightsRepo?: MarketInsightsRepository;
  queueRepo?: AnalysisQueueRepository;
  logLoader?: ReturnType<typeof mockLogLoader>;
  analysisService?: { enqueue: (leadId: string) => Promise<{ ok: boolean; queued: boolean }> };
}) {
  return createAdminService({
    leadRepo: deps.leadRepo ?? mockLeadRepo(),
    assessmentRepo: deps.assessmentRepo ?? mockAssessmentRepo(),
    marketInsightsRepo: deps.marketInsightsRepo ?? mockMarketInsightsRepo(),
    queueRepo: deps.queueRepo ?? mockQueueRepo(),
    logLoader: deps.logLoader ?? mockLogLoader(),
    analysisService: deps.analysisService ?? mockAnalysisService(),
  });
}

describe("AdminService", () => {
  describe("getDashboard", () => {
    const leads: LeadRow[] = [
      { id: "l1", name: "Alice", company: "A Corp", email: "a@a.com", phone: "1", role: "CEO", status: "concluido", created_at: new Date().toISOString() },
      { id: "l2", name: "Bob", company: "B Corp", email: "b@b.com", phone: "2", role: "CTO", status: "pendente", created_at: new Date().toISOString() },
    ];

    it("retorna KPIs, rows, queue e logs", async () => {
      const existsForLead = vi
        .fn()
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(false);
      const findByLeadId = vi
        .fn()
        .mockResolvedValueOnce(insightRow({ lead_id: "l1", status: "analisado", queued_at: new Date().toISOString() }))
        .mockResolvedValueOnce(null);
      const queueRepo = mockQueueRepo({
        stats: vi.fn().mockResolvedValue({
          queueLength: 2,
          oldestAgeSec: 45,
          pendente: 1,
          processando: 1,
          analisado: 3,
          falha: 0,
        }),
      });
      const logs: AdminLogEntryDTO[] = [
        { leadId: "l1", leadName: "Alice", step: "completed", message: null, durationMs: 1500, createdAt: new Date().toISOString() },
      ];
      const service = createAdminServiceForTest({
        leadRepo: mockLeadRepo({ findAll: vi.fn().mockResolvedValue(leads) }),
        assessmentRepo: mockAssessmentRepo({ existsForLead }),
        marketInsightsRepo: mockMarketInsightsRepo({ findByLeadId }),
        queueRepo,
        logLoader: mockLogLoader(logs),
      });

      const result = await service.getDashboard();

      expect(result.kpis).toEqual({
        leadsTotal: 2,
        diagnosticosConcluidos: 1,
        relatoriosPendentes: 0,
        relatoriosFalha: 0,
        relatoriosEmProcessamento: 0,
      });
      expect(result.queue).toEqual({
        queueLength: 2,
        oldestAgeSec: 45,
        pendente: 1,
        processando: 1,
        analisado: 3,
        falha: 0,
      });
      expect(result.logs).toEqual(logs);
      expect(result.rows).toHaveLength(2);
      expect(result.rows[0]).toMatchObject({
        leadId: "l1",
        name: "Alice",
        hasDiagnostic: true,
        analysisStatus: "analisado",
        attempts: 0,
      });
      expect(result.rows[1]).toMatchObject({
        leadId: "l2",
        hasDiagnostic: false,
        analysisStatus: null,
      });
    });

    it("conta relatórios pendentes, em processamento e com falha", async () => {
      const existsForLead = vi.fn().mockResolvedValue(true);
      const findByLeadId = vi
        .fn()
        .mockResolvedValueOnce(insightRow({ lead_id: "l1", status: "processando" }))
        .mockResolvedValueOnce(insightRow({ lead_id: "l2", status: "falha" }));
      const service = createAdminServiceForTest({
        leadRepo: mockLeadRepo({ findAll: vi.fn().mockResolvedValue(leads) }),
        assessmentRepo: mockAssessmentRepo({ existsForLead }),
        marketInsightsRepo: mockMarketInsightsRepo({ findByLeadId }),
      });

      const result = await service.getDashboard();

      expect(result.kpis).toMatchObject({
        relatoriosPendentes: 1,
        relatoriosEmProcessamento: 1,
        relatoriosFalha: 1,
        diagnosticosConcluidos: 2,
      });
    });

    it("expõe errorMessage e ageSeconds por linha quando pendente/processando", async () => {
      const existsForLead = vi.fn().mockResolvedValue(true);
      const queuedAt = new Date(Date.now() - 10_000).toISOString();
      const findByLeadId = vi
        .fn()
        .mockResolvedValueOnce(insightRow({ lead_id: "l1", status: "processando", queued_at: queuedAt, attempts: 2 }))
        .mockResolvedValueOnce(insightRow({ lead_id: "l2", status: "falha", error: "llm down" }));
      const service = createAdminServiceForTest({
        leadRepo: mockLeadRepo({ findAll: vi.fn().mockResolvedValue(leads) }),
        assessmentRepo: mockAssessmentRepo({ existsForLead }),
        marketInsightsRepo: mockMarketInsightsRepo({ findByLeadId }),
      });

      const result = await service.getDashboard();

      expect(result.rows[0]).toMatchObject({
        analysisStatus: "processando",
        attempts: 2,
        ageSeconds: expect.any(Number),
        processingStartedAt: null,
      });
      expect(result.rows[1]).toMatchObject({
        analysisStatus: "falha",
        errorMessage: "llm down",
      });
    });

    it("retorna rows vazias sem leads", async () => {
      const service = createAdminServiceForTest({
        leadRepo: mockLeadRepo({ findAll: vi.fn().mockResolvedValue([]) }),
        assessmentRepo: mockAssessmentRepo(),
        marketInsightsRepo: mockMarketInsightsRepo(),
      });

      const result = await service.getDashboard();
      expect(result.rows).toEqual([]);
      expect(result.kpis.leadsTotal).toBe(0);
    });
  });

  describe("generateReport", () => {
    const leadBase: LeadRow = {
      id: "l1",
      name: "Alice",
      company: "A Corp",
      email: "a@a.com",
      phone: "1",
      role: "CEO",
      status: "concluido",
      created_at: new Date().toISOString(),
    };

    it("enfileira para lead recém-concluído sem análise anterior (GER-01)", async () => {
      const findById = vi.fn().mockResolvedValue(leadBase);
      const existsForLead = vi.fn().mockResolvedValue(true);
      const enqueue = vi.fn().mockResolvedValue({ ok: true, queued: true });
      const service = createAdminServiceForTest({
        leadRepo: mockLeadRepo({ findById }),
        assessmentRepo: mockAssessmentRepo({ existsForLead }),
        marketInsightsRepo: mockMarketInsightsRepo(),
        analysisService: mockAnalysisService({ enqueue }),
      });

      const result = await service.generateReport("l1");

      expect(result).toEqual({ ok: true, queued: true });
      expect(findById).toHaveBeenCalledWith("l1");
      expect(existsForLead).toHaveBeenCalledWith("l1");
      expect(enqueue).toHaveBeenCalledWith("l1");
    });

    it("rejeita com 409 quando já existe job pendente/processando (dedup)", async () => {
      const enqueue = vi.fn().mockResolvedValue({ ok: true, queued: false });
      const service = createAdminServiceForTest({
        leadRepo: mockLeadRepo({
          findById: vi.fn().mockResolvedValue({ ...leadBase, status: "analisado" }),
        }),
        assessmentRepo: mockAssessmentRepo({ existsForLead: vi.fn().mockResolvedValue(true) }),
        marketInsightsRepo: mockMarketInsightsRepo(),
        analysisService: mockAnalysisService({ enqueue }),
      });

      await expect(service.generateReport("l1")).rejects.toMatchObject({
        name: "AdminServiceError",
        status: 409,
      });
    });

    it("enfileira para status de regeração (analisado/falha/analise_pendente)", async () => {
      const enqueue = vi.fn().mockResolvedValue({ ok: true, queued: true });
      const service = createAdminServiceForTest({
        leadRepo: mockLeadRepo({
          findById: vi.fn().mockResolvedValue({ ...leadBase, status: "analisado" }),
        }),
        assessmentRepo: mockAssessmentRepo({ existsForLead: vi.fn().mockResolvedValue(true) }),
        marketInsightsRepo: mockMarketInsightsRepo(),
        analysisService: mockAnalysisService({ enqueue }),
      });

      await expect(service.generateReport("l1")).resolves.toEqual({ ok: true, queued: true });
      expect(enqueue).toHaveBeenCalledWith("l1");
    });

    it("lança 400 quando o lead não existe", async () => {
      const service = createAdminServiceForTest({
        leadRepo: mockLeadRepo({ findById: vi.fn().mockResolvedValue(null) }),
        assessmentRepo: mockAssessmentRepo(),
        marketInsightsRepo: mockMarketInsightsRepo(),
        analysisService: mockAnalysisService(),
      });

      await expect(service.generateReport("l1")).rejects.toMatchObject({
        name: "AdminServiceError",
        status: 400,
      });
    });

    it("lança 400 quando o lead não tem diagnóstico", async () => {
      const service = createAdminServiceForTest({
        leadRepo: mockLeadRepo({ findById: vi.fn().mockResolvedValue(leadBase) }),
        assessmentRepo: mockAssessmentRepo({ existsForLead: vi.fn().mockResolvedValue(false) }),
        marketInsightsRepo: mockMarketInsightsRepo(),
        analysisService: mockAnalysisService(),
      });

      await expect(service.generateReport("l1")).rejects.toMatchObject({ status: 400 });
    });

    it("lança 400 para status inelegível (pendente/token_gerado)", async () => {
      const service = createAdminServiceForTest({
        leadRepo: mockLeadRepo({
          findById: vi.fn().mockResolvedValue({ ...leadBase, status: "pendente" }),
        }),
        assessmentRepo: mockAssessmentRepo({ existsForLead: vi.fn().mockResolvedValue(true) }),
        marketInsightsRepo: mockMarketInsightsRepo(),
        analysisService: mockAnalysisService(),
      });

      await expect(service.generateReport("l1")).rejects.toMatchObject({
        name: "AdminServiceError",
        status: 400,
      });
    });

    it("propaga erro de enqueue sem capturar", async () => {
      const findById = vi.fn().mockResolvedValue(leadBase);
      const enqueue = vi.fn().mockRejectedValue(new Error("queue down"));
      const service = createAdminServiceForTest({
        leadRepo: mockLeadRepo({ findById }),
        assessmentRepo: mockAssessmentRepo({ existsForLead: vi.fn().mockResolvedValue(true) }),
        marketInsightsRepo: mockMarketInsightsRepo(),
        analysisService: mockAnalysisService({ enqueue }),
      });

      await expect(service.generateReport("l1")).rejects.toThrow("queue down");
    });
  });
});
