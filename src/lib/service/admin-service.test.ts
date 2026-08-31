import { describe, it, expect, vi } from "vitest";
import { createAdminService, AdminServiceError } from "./admin-service";
import type { TokenRepository, TokenRow } from "@/lib/repository/token-repo";
import type { LeadRepository, LeadRow } from "@/lib/repository/lead-repo";
import type { AssessmentRepository } from "@/lib/repository/assessment-repo";

function mockTokenRepo(overrides: Partial<TokenRepository> = {}): TokenRepository {
  return {
    findByHash: vi.fn(),
    findById: vi.fn(),
    markExpired: vi.fn(),
    consume: vi.fn(),
    cancel: vi.fn(),
    cancelActiveByLeadId: vi.fn(),
    create: vi.fn(),
    updateSentAt: vi.fn(),
    markExpiredTokens: vi.fn(),
    findAll: vi.fn(),
    ...overrides,
  };
}

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
    existsForLead: vi.fn(),
    createAssessmentResponse: vi.fn(),
    upsertAssessmentResponse: vi.fn(),
    createDiagnostic: vi.fn(),
    upsertDiagnostic: vi.fn(),
    findByLeadId: vi.fn(),
    ...overrides,
  };
}

function mockAnalysisService(overrides: { enqueue?: (leadId: string) => Promise<void> } = {}) {
  return {
    enqueue: overrides.enqueue ?? vi.fn().mockResolvedValue(undefined),
  };
}

describe("AdminService", () => {
  describe("getTokensDashboard", () => {
    it("runs lazy expiry and returns KPIs + rows without tokenPlain", async () => {
      const now = Date.now();
      const leads: LeadRow[] = [
        { id: "l1", name: "Alice", company: "A Corp", email: "a@a.com", phone: "1", role: "CEO", status: "token_gerado", created_at: new Date(now).toISOString() },
        { id: "l2", name: "Bob", company: "B Corp", email: "b@b.com", phone: "2", role: "CTO", status: "pendente", created_at: new Date(now).toISOString() },
      ];
      const tokens: TokenRow[] = [
        { id: "t1", lead_id: "l1", status: "disponivel", expires_at: new Date(now + 60000).toISOString(), sent_at: null, created_at: new Date(now).toISOString() },
        { id: "t2", lead_id: "l2", status: "expirado", expires_at: new Date(now - 60000).toISOString(), sent_at: null, created_at: new Date(now).toISOString() },
      ];

      const markExpiredTokens = vi.fn();
      const service = createAdminService({
        tokenRepo: mockTokenRepo({ findAll: vi.fn().mockResolvedValue(tokens), markExpiredTokens }),
        leadRepo: mockLeadRepo({ findAll: vi.fn().mockResolvedValue(leads) }),
        assessmentRepo: mockAssessmentRepo(),
        analysisService: mockAnalysisService(),
      });

      const result = await service.getTokensDashboard();

      expect(markExpiredTokens).toHaveBeenCalled();
      expect(result.kpis).toEqual({
        pendentesEnvio: 1,
        expirados: 1,
        cadastrados: 2,
      });
      expect(result.rows).toHaveLength(2);
      expect(result.rows[0]).toMatchObject({
        leadId: "l1",
        name: "Alice",
        tokenId: "t1",
        tokenStatus: "disponivel",
      });
      // tokenPlain must NOT be in the response
      expect(result.rows[0]).not.toHaveProperty("tokenPlain");
    });

    it("returns empty rows when no leads", async () => {
      const service = createAdminService({
        tokenRepo: mockTokenRepo({ findAll: vi.fn().mockResolvedValue([]), markExpiredTokens: vi.fn() }),
        leadRepo: mockLeadRepo({ findAll: vi.fn().mockResolvedValue([]) }),
        assessmentRepo: mockAssessmentRepo(),
        analysisService: mockAnalysisService(),
      });

      const result = await service.getTokensDashboard();
      expect(result.rows).toEqual([]);
      expect(result.kpis.cadastrados).toBe(0);
    });
  });

  describe("reprocessAnalysis", () => {
    const validLead: LeadRow = {
      id: "l1",
      name: "Alice",
      company: "A Corp",
      email: "a@a.com",
      phone: "1",
      role: "CEO",
      status: "analisado",
      created_at: new Date().toISOString(),
    };

    it("enfileira para lead com diagnóstico e status elegível (REPRO-01)", async () => {
      const findById = vi.fn().mockResolvedValue(validLead);
      const existsForLead = vi.fn().mockResolvedValue(true);
      const enqueue = vi.fn().mockResolvedValue(undefined);
      const service = createAdminService({
        tokenRepo: mockTokenRepo(),
        leadRepo: mockLeadRepo({ findById }),
        assessmentRepo: mockAssessmentRepo({ existsForLead }),
        analysisService: mockAnalysisService({ enqueue }),
      });

      const result = await service.reprocessAnalysis("l1");

      expect(result).toEqual({ ok: true });
      expect(findById).toHaveBeenCalledWith("l1");
      expect(existsForLead).toHaveBeenCalledWith("l1");
      expect(enqueue).toHaveBeenCalledWith("l1");
    });

    it("lança 400 quando o lead não existe (REPRO-02)", async () => {
      const service = createAdminService({
        tokenRepo: mockTokenRepo(),
        leadRepo: mockLeadRepo({ findById: vi.fn().mockResolvedValue(null) }),
        assessmentRepo: mockAssessmentRepo(),
        analysisService: mockAnalysisService(),
      });

      await expect(service.reprocessAnalysis("l1")).rejects.toMatchObject({
        name: "AdminServiceError",
        status: 400,
      });
    });

    it("lança 400 quando o lead não tem diagnóstico (REPRO-02)", async () => {
      const service = createAdminService({
        tokenRepo: mockTokenRepo(),
        leadRepo: mockLeadRepo({ findById: vi.fn().mockResolvedValue(validLead) }),
        assessmentRepo: mockAssessmentRepo({ existsForLead: vi.fn().mockResolvedValue(false) }),
        analysisService: mockAnalysisService(),
      });

      await expect(service.reprocessAnalysis("l1")).rejects.toMatchObject({ status: 400 });
    });

    it("lança 400 para status inelegível (REPRO-03)", async () => {
      const service = createAdminService({
        tokenRepo: mockTokenRepo(),
        leadRepo: mockLeadRepo({
          findById: vi.fn().mockResolvedValue({ ...validLead, status: "token_gerado" }),
        }),
        assessmentRepo: mockAssessmentRepo({ existsForLead: vi.fn().mockResolvedValue(true) }),
        analysisService: mockAnalysisService(),
      });

      await expect(service.reprocessAnalysis("l1")).rejects.toMatchObject({
        name: "AdminServiceError",
        status: 400,
      });
    });

    it("propaga erro de enqueue sem capturar (REPRO-04)", async () => {
      const findById = vi.fn().mockResolvedValue(validLead);
      const enqueue = vi.fn().mockRejectedValue(new Error("queue down"));
      const service = createAdminService({
        tokenRepo: mockTokenRepo(),
        leadRepo: mockLeadRepo({ findById }),
        assessmentRepo: mockAssessmentRepo({ existsForLead: vi.fn().mockResolvedValue(true) }),
        analysisService: mockAnalysisService({ enqueue }),
      });

      await expect(service.reprocessAnalysis("l1")).rejects.toThrow("queue down");
    });
  });
});
