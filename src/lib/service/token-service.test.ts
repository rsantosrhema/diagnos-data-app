import { describe, it, expect, vi, beforeEach } from "vitest";
import { createTokenService, TokenServiceError } from "./token-service";
import type { TokenRepository, TokenRow } from "@/lib/repository/token-repo";
import type { LeadRepository, LeadRow } from "@/lib/repository/lead-repo";
import type { SessionRepository } from "@/lib/repository/session-repo";

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

function mockSessionRepo(overrides: Partial<SessionRepository> = {}): SessionRepository {
  return {
    create: vi.fn(),
    findActiveByHash: vi.fn(),
    deleteByHash: vi.fn(),
    ...overrides,
  };
}

describe("TokenService", () => {
  describe("validateMasterToken", () => {
    const originalEnv = process.env;

    beforeEach(() => {
      vi.resetModules();
      process.env = { ...originalEnv };
    });

    afterAll(() => {
      process.env = originalEnv;
    });

    it("returns null when MASTER_TOKEN_VALUE is not set", async () => {
      delete process.env.MASTER_TOKEN_VALUE;
      const service = createTokenService({
        tokenRepo: mockTokenRepo(),
        leadRepo: mockLeadRepo(),
        sessionRepo: mockSessionRepo(),
      });

      const result = await service.validateMasterToken("RD2026");
      expect(result).toBeNull();
    });

    it("returns null for non-matching token", async () => {
      process.env.MASTER_TOKEN_VALUE = "RD2026";
      const service = createTokenService({
        tokenRepo: mockTokenRepo(),
        leadRepo: mockLeadRepo(),
        sessionRepo: mockSessionRepo(),
      });

      const result = await service.validateMasterToken("WRONG1");
      expect(result).toBeNull();
    });

    it("creates session for matching master token with existing lead", async () => {
      process.env.MASTER_TOKEN_VALUE = "RD2026";
      process.env.MASTER_TOKEN_LEAD_EMAIL = "master@diagnos.test";
      const sessionCreate = vi.fn();
      const lead: LeadRow = {
        id: "lead-master",
        name: "Usuário Master",
        company: "Empresa Teste",
        email: "master@diagnos.test",
        phone: "",
        role: "CTO",
        status: "pendente",
        created_at: new Date().toISOString(),
      };
      const service = createTokenService({
        tokenRepo: mockTokenRepo(),
        leadRepo: mockLeadRepo({ findByEmail: vi.fn().mockResolvedValue(lead) }),
        sessionRepo: mockSessionRepo({ create: sessionCreate }),
      });

      const result = await service.validateMasterToken("RD2026");

      expect(result).not.toBeNull();
      expect(result!.isMaster).toBe(true);
      expect(result!.sessionToken).toHaveLength(64);
      expect(sessionCreate).toHaveBeenCalledWith(
        expect.objectContaining({ leadId: "lead-master", isMaster: true }),
      );
    });

    it("creates lead and session when lead does not exist", async () => {
      process.env.MASTER_TOKEN_VALUE = "RD2026";
      process.env.MASTER_TOKEN_LEAD_EMAIL = "master@diagnos.test";
      const create = vi.fn();
      const lead: LeadRow = {
        id: "lead-master",
        name: "Usuário Master",
        company: "Empresa Teste",
        email: "master@diagnos.test",
        phone: "",
        role: "CTO",
        status: "pendente",
        created_at: new Date().toISOString(),
      };
      const findByEmail = vi.fn()
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(lead);
      const service = createTokenService({
        tokenRepo: mockTokenRepo(),
        leadRepo: mockLeadRepo({ findByEmail, create }),
        sessionRepo: mockSessionRepo(),
      });

      const result = await service.validateMasterToken("RD2026");

      expect(create).toHaveBeenCalled();
      expect(result).not.toBeNull();
      expect(result!.isMaster).toBe(true);
    });

    it("is case-insensitive", async () => {
      process.env.MASTER_TOKEN_VALUE = "rd2026";
      const lead: LeadRow = {
        id: "lead-master",
        name: "Usuário Master",
        company: "Empresa Teste",
        email: "master@diagnos.test",
        phone: "",
        role: "CTO",
        status: "pendente",
        created_at: new Date().toISOString(),
      };
      const service = createTokenService({
        tokenRepo: mockTokenRepo(),
        leadRepo: mockLeadRepo({ findByEmail: vi.fn().mockResolvedValue(lead) }),
        sessionRepo: mockSessionRepo(),
      });

      const result = await service.validateMasterToken("RD2026");
      expect(result).not.toBeNull();
    });
  });

  describe("logoutSession", () => {
    it("deletes session by hash", async () => {
      const deleteByHash = vi.fn();
      const service = createTokenService({
        tokenRepo: mockTokenRepo(),
        leadRepo: mockLeadRepo(),
        sessionRepo: mockSessionRepo({ deleteByHash }),
      });

      await service.logoutSession("abc123");
      expect(deleteByHash).toHaveBeenCalledWith(expect.any(String));
    });
  });

  describe("validateAndCreateSession", () => {
    it("rejects invalid token format", async () => {
      const service = createTokenService({
        tokenRepo: mockTokenRepo(),
        leadRepo: mockLeadRepo(),
        sessionRepo: mockSessionRepo(),
      });

      await expect(service.validateAndCreateSession("ABC")).rejects.toThrow(TokenServiceError);
      await expect(service.validateAndCreateSession("ABC")).rejects.toMatchObject({ status: 401 });
    });

    it("rejects token not found", async () => {
      const service = createTokenService({
        tokenRepo: mockTokenRepo({ findByHash: vi.fn().mockResolvedValue(null) }),
        leadRepo: mockLeadRepo(),
        sessionRepo: mockSessionRepo(),
      });

      await expect(service.validateAndCreateSession("ABC234")).rejects.toMatchObject({
        message: "Token inválido",
        status: 401,
      });
    });

    it("marks expired token and rejects", async () => {
      const expiredRow: TokenRow = {
        id: "tok-1",
        lead_id: "lead-1",
        status: "disponivel",
        expires_at: new Date(Date.now() - 1000).toISOString(),
        sent_at: null,
        created_at: new Date().toISOString(),
      };
      const markExpired = vi.fn();
      const service = createTokenService({
        tokenRepo: mockTokenRepo({ findByHash: vi.fn().mockResolvedValue(expiredRow), markExpired }),
        leadRepo: mockLeadRepo(),
        sessionRepo: mockSessionRepo(),
      });

      await expect(service.validateAndCreateSession("ABC234")).rejects.toMatchObject({
        message: "Token expirado. Solicite um novo token.",
        status: 401,
      });
      expect(markExpired).toHaveBeenCalledWith("tok-1");
    });

    it("rejects used token", async () => {
      const usedRow: TokenRow = {
        id: "tok-1",
        lead_id: "lead-1",
        status: "usado",
        expires_at: new Date(Date.now() + 60000).toISOString(),
        sent_at: null,
        created_at: new Date().toISOString(),
      };
      const service = createTokenService({
        tokenRepo: mockTokenRepo({ findByHash: vi.fn().mockResolvedValue(usedRow) }),
        leadRepo: mockLeadRepo(),
        sessionRepo: mockSessionRepo(),
      });

      await expect(service.validateAndCreateSession("ABC234")).rejects.toMatchObject({
        message: "Token já utilizado. Solicite um novo token.",
        status: 401,
      });
    });

    it("rejects canceled token", async () => {
      const canceledRow: TokenRow = {
        id: "tok-1",
        lead_id: "lead-1",
        status: "cancelado",
        expires_at: new Date(Date.now() + 60000).toISOString(),
        sent_at: null,
        created_at: new Date().toISOString(),
      };
      const service = createTokenService({
        tokenRepo: mockTokenRepo({ findByHash: vi.fn().mockResolvedValue(canceledRow) }),
        leadRepo: mockLeadRepo(),
        sessionRepo: mockSessionRepo(),
      });

      await expect(service.validateAndCreateSession("ABC234")).rejects.toMatchObject({
        message: "Token cancelado. Solicite um novo token.",
        status: 401,
      });
    });

    it("consumes valid token and creates session", async () => {
      const validRow: TokenRow = {
        id: "tok-1",
        lead_id: "lead-1",
        status: "disponivel",
        expires_at: new Date(Date.now() + 60000).toISOString(),
        sent_at: null,
        created_at: new Date().toISOString(),
      };
      const consume = vi.fn();
      const sessionCreate = vi.fn();
      const service = createTokenService({
        tokenRepo: mockTokenRepo({ findByHash: vi.fn().mockResolvedValue(validRow), consume }),
        leadRepo: mockLeadRepo(),
        sessionRepo: mockSessionRepo({ create: sessionCreate }),
      });

      const result = await service.validateAndCreateSession("ABC234");

      expect(consume).toHaveBeenCalledWith("tok-1");
      expect(sessionCreate).toHaveBeenCalledWith(
        expect.objectContaining({ leadId: "lead-1" }),
      );
      expect(result.sessionToken).toHaveLength(64);
      expect(result.sessionExpires.getTime()).toBeGreaterThan(Date.now());
    });
  });

  describe("generateForLead", () => {
    it("rejects if lead not found", async () => {
      const service = createTokenService({
        tokenRepo: mockTokenRepo(),
        leadRepo: mockLeadRepo({ findById: vi.fn().mockResolvedValue(null) }),
        sessionRepo: mockSessionRepo(),
      });

      await expect(service.generateForLead("nonexistent")).rejects.toMatchObject({
        message: "Cliente não encontrado",
        status: 404,
      });
    });

    it("cancels active tokens and creates new one", async () => {
      const lead: LeadRow = {
        id: "lead-1",
        name: "Test",
        company: "Corp",
        email: "t@t.com",
        phone: "123",
        role: "Dev",
        status: "pendente",
        created_at: new Date().toISOString(),
      };
      const cancelActive = vi.fn();
      const create = vi.fn().mockResolvedValue({ id: "tok-1" });
      const updateStatus = vi.fn();

      const service = createTokenService({
        tokenRepo: mockTokenRepo({ cancelActiveByLeadId: cancelActive, create }),
        leadRepo: mockLeadRepo({ findById: vi.fn().mockResolvedValue(lead), updateStatus }),
        sessionRepo: mockSessionRepo(),
      });

      const result = await service.generateForLead("lead-1");

      expect(cancelActive).toHaveBeenCalledWith("lead-1");
      expect(create).toHaveBeenCalledWith(
        expect.objectContaining({ leadId: "lead-1" }),
      );
      expect(updateStatus).toHaveBeenCalledWith("lead-1", "token_gerado");
      expect(result.token).toHaveLength(6);
    });

    it("retries on hash collision", async () => {
      const lead: LeadRow = {
        id: "lead-1",
        name: "Test",
        company: "Corp",
        email: "t@t.com",
        phone: "123",
        role: "Dev",
        status: "pendente",
        created_at: new Date().toISOString(),
      };
      const create = vi.fn()
        .mockResolvedValueOnce(null) // collision
        .mockResolvedValueOnce(null) // collision
        .mockResolvedValueOnce({ id: "tok-1" }); // success

      const service = createTokenService({
        tokenRepo: mockTokenRepo({ create }),
        leadRepo: mockLeadRepo({ findById: vi.fn().mockResolvedValue(lead) }),
        sessionRepo: mockSessionRepo(),
      });

      const result = await service.generateForLead("lead-1");
      expect(create).toHaveBeenCalledTimes(3);
      expect(result.token).toHaveLength(6);
    });
  });

  describe("cancel", () => {
    it("rejects if token not found", async () => {
      const service = createTokenService({
        tokenRepo: mockTokenRepo({ findById: vi.fn().mockResolvedValue(null) }),
        leadRepo: mockLeadRepo(),
        sessionRepo: mockSessionRepo(),
      });

      await expect(service.cancel("nonexistent")).rejects.toMatchObject({
        message: "Token não encontrado",
        status: 404,
      });
    });

    it("cancels existing token", async () => {
      const tokenRow: TokenRow = {
        id: "tok-1",
        lead_id: "lead-1",
        status: "disponivel",
        expires_at: new Date(Date.now() + 60000).toISOString(),
        sent_at: null,
        created_at: new Date().toISOString(),
      };
      const cancel = vi.fn();
      const service = createTokenService({
        tokenRepo: mockTokenRepo({ findById: vi.fn().mockResolvedValue(tokenRow), cancel }),
        leadRepo: mockLeadRepo(),
        sessionRepo: mockSessionRepo(),
      });

      await service.cancel("tok-1");
      expect(cancel).toHaveBeenCalledWith("tok-1");
    });
  });

  describe("sendTokenEmail", () => {
    it("rejects if token not found", async () => {
      const service = createTokenService({
        tokenRepo: mockTokenRepo({ findById: vi.fn().mockResolvedValue(null) }),
        leadRepo: mockLeadRepo(),
        sessionRepo: mockSessionRepo(),
      });

      await expect(
        service.sendTokenEmail("tok-1", "ABC234", vi.fn(), vi.fn()),
      ).rejects.toMatchObject({ message: "Token não encontrado", status: 404 });
    });

    it("rejects if token not available", async () => {
      const tokenRow: TokenRow = {
        id: "tok-1",
        lead_id: "lead-1",
        status: "usado",
        expires_at: new Date(Date.now() + 60000).toISOString(),
        sent_at: null,
        created_at: new Date().toISOString(),
      };
      const service = createTokenService({
        tokenRepo: mockTokenRepo({ findById: vi.fn().mockResolvedValue(tokenRow) }),
        leadRepo: mockLeadRepo(),
        sessionRepo: mockSessionRepo(),
      });

      await expect(
        service.sendTokenEmail("tok-1", "ABC234", vi.fn(), vi.fn()),
      ).rejects.toMatchObject({ status: 409 });
    });

    it("rejects if no plaintext token provided", async () => {
      const tokenRow: TokenRow = {
        id: "tok-1",
        lead_id: "lead-1",
        status: "disponivel",
        expires_at: new Date(Date.now() + 60000).toISOString(),
        sent_at: null,
        created_at: new Date().toISOString(),
      };
      const service = createTokenService({
        tokenRepo: mockTokenRepo({ findById: vi.fn().mockResolvedValue(tokenRow) }),
        leadRepo: mockLeadRepo({ findNameAndEmail: vi.fn().mockResolvedValue({ name: "Test", email: "t@t.com" }) }),
        sessionRepo: mockSessionRepo(),
      });

      await expect(
        service.sendTokenEmail("tok-1", undefined, vi.fn(), vi.fn()),
      ).rejects.toMatchObject({ status: 400 });
    });

    it("sends email and updates sentAt", async () => {
      const tokenRow: TokenRow = {
        id: "tok-1",
        lead_id: "lead-1",
        status: "disponivel",
        expires_at: new Date(Date.now() + 60000).toISOString(),
        sent_at: null,
        created_at: new Date().toISOString(),
      };
      const sendEmail = vi.fn().mockResolvedValue(undefined);
      const updateSentAt = vi.fn();
      const service = createTokenService({
        tokenRepo: mockTokenRepo({ findById: vi.fn().mockResolvedValue(tokenRow), updateSentAt }),
        leadRepo: mockLeadRepo({ findNameAndEmail: vi.fn().mockResolvedValue({ name: "Test", email: "t@t.com" }) }),
        sessionRepo: mockSessionRepo(),
      });

      const result = await service.sendTokenEmail("tok-1", "ABC234", sendEmail, vi.fn());

      expect(sendEmail).toHaveBeenCalledWith({ to: "t@t.com", name: "Test", token: "ABC234" });
      expect(updateSentAt).toHaveBeenCalledWith("tok-1", expect.any(String));
      expect(result.sentAt).toBeDefined();
    });
  });
});
