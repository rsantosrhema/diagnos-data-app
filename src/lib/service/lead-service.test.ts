import { describe, it, expect, vi } from "vitest";
import { createLeadService, LeadServiceError } from "./lead-service";
import type { LeadRepository } from "@/lib/repository/lead-repo";

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

describe("LeadService", () => {
  describe("createLead", () => {
    it("creates a new lead and returns its id", async () => {
      const create = vi.fn().mockResolvedValue("lead-new");
      const service = createLeadService({
        leadRepo: mockLeadRepo({
          findByEmail: vi.fn().mockResolvedValue(null),
          create,
        }),
      });

      const result = await service.createLead({
        name: "João",
        company: "Corp",
        phone: "12345678",
        email: "joao@corp.com",
        role: "CTO",
      });

      expect(result).toEqual({ ok: true, leadId: "lead-new" });
      expect(create).toHaveBeenCalledWith(
        expect.objectContaining({ email: "joao@corp.com" }),
      );
    });

    it("reuses existing lead when status is not concluido", async () => {
      const create = vi.fn();
      const service = createLeadService({
        leadRepo: mockLeadRepo({
          findByEmail: vi.fn().mockResolvedValue({
            id: "lead-existing",
            status: "token_gerado",
          }),
          create,
        }),
      });

      const result = await service.createLead({
        name: "João",
        company: "Corp",
        phone: "12345678",
        email: "joao@corp.com",
        role: "CTO",
      });

      expect(result).toEqual({ ok: true, leadId: "lead-existing" });
      expect(create).not.toHaveBeenCalled();
    });

    it("rejects lead already concluido", async () => {
      const service = createLeadService({
        leadRepo: mockLeadRepo({
          findByEmail: vi.fn().mockResolvedValue({
            id: "lead-done",
            status: "concluido",
          }),
        }),
      });

      await expect(
        service.createLead({
          name: "João",
          company: "Corp",
          phone: "12345678",
          email: "joao@corp.com",
          role: "CTO",
        }),
      ).rejects.toMatchObject({ status: 409 });
    });

    it("race on unique constraint: reuses pending lead", async () => {
      const error = Object.assign(new Error("duplicate"), { code: "23505" });
      const service = createLeadService({
        leadRepo: mockLeadRepo({
          findByEmail: vi
            .fn()
            .mockResolvedValueOnce(null)
            .mockResolvedValueOnce({ id: "lead-race", status: "pendente" }),
          create: vi.fn().mockRejectedValue(error),
        }),
      });

      const result = await service.createLead({
        name: "João",
        company: "Corp",
        phone: "12345678",
        email: "joao@corp.com",
        role: "CTO",
      });

      expect(result).toEqual({ ok: true, leadId: "lead-race" });
    });

    it("race on unique constraint: 409 when lead is concluido", async () => {
      const error = Object.assign(new Error("duplicate"), { code: "23505" });
      const service = createLeadService({
        leadRepo: mockLeadRepo({
          findByEmail: vi
            .fn()
            .mockResolvedValueOnce(null)
            .mockResolvedValueOnce({ id: "lead-done", status: "concluido" }),
          create: vi.fn().mockRejectedValue(error),
        }),
      });

      await expect(
        service.createLead({
          name: "João",
          company: "Corp",
          phone: "12345678",
          email: "joao@corp.com",
          role: "CTO",
        }),
      ).rejects.toMatchObject({ status: 409 });
    });

    it("normalizes email to lowercase", async () => {
      const create = vi.fn().mockResolvedValue("lead-new");
      const service = createLeadService({
        leadRepo: mockLeadRepo({
          findByEmail: vi.fn().mockResolvedValue(null),
          create,
        }),
      });

      await service.createLead({
        name: "João",
        company: "Corp",
        phone: "12345678",
        email: "JOAO@CORP.COM",
        role: "CTO",
      });

      expect(create).toHaveBeenCalledWith(
        expect.objectContaining({ email: "joao@corp.com" }),
      );
    });
  });
});
