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
    it("creates a new lead", async () => {
      const create = vi.fn();
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

      expect(result).toEqual({ ok: true });
      expect(create).toHaveBeenCalledWith(
        expect.objectContaining({ email: "joao@corp.com" }),
      );
    });

    it("rejects duplicate lead (qualquer status)", async () => {
      const service = createLeadService({
        leadRepo: mockLeadRepo({
          findByEmail: vi.fn().mockResolvedValue({ id: "existing" }),
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

    it("handles unique constraint violation (23505)", async () => {
      const error = Object.assign(new Error("duplicate"), { code: "23505" });
      const service = createLeadService({
        leadRepo: mockLeadRepo({
          findByEmail: vi.fn().mockResolvedValue(null),
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
      const create = vi.fn();
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
