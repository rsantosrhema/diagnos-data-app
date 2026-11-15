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
    updateLocation: vi.fn(),
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
        city: "São Paulo",
        state: "SP",
      });

      expect(result).toEqual({ ok: true, leadId: "lead-new" });
      expect(create).toHaveBeenCalledWith(
        expect.objectContaining({ email: "joao@corp.com" }),
      );
    });

    it("persists city and state when creating a new lead", async () => {
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
        email: "joao@corp.com",
        role: "CTO",
        city: "São Paulo",
        state: "SP",
      });

      expect(create).toHaveBeenCalledWith(
        expect.objectContaining({ city: "São Paulo", state: "SP" }),
      );
    });

    it("forwards city and state exactly, preserving accents and compound names", async () => {
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
        email: "joao@corp.com",
        role: "CTO",
        city: "São José do Rio Preto",
        state: "SP",
      });

      expect(create).toHaveBeenCalledWith(
        expect.objectContaining({ city: "São José do Rio Preto", state: "SP" }),
      );
    });

    it("reuses existing lead when status is not concluido", async () => {
      const create = vi.fn();
      const updateLocation = vi.fn().mockResolvedValue(undefined);
      const service = createLeadService({
        leadRepo: mockLeadRepo({
          findByEmail: vi.fn().mockResolvedValue({
            id: "lead-existing",
            status: "token_gerado",
          }),
          create,
          updateLocation,
        }),
      });

      const result = await service.createLead({
        name: "João",
        company: "Corp",
        phone: "12345678",
        email: "joao@corp.com",
        role: "CTO",
        city: "São Paulo",
        state: "SP",
      });

      expect(result).toEqual({ ok: true, leadId: "lead-existing" });
      expect(create).not.toHaveBeenCalled();
      expect(updateLocation).toHaveBeenCalledWith("lead-existing", {
        city: "São Paulo",
        state: "SP",
      });
    });

    it("updates the location of a reused pending lead and returns the same leadId", async () => {
      const updateLocation = vi.fn().mockResolvedValue(undefined);
      const service = createLeadService({
        leadRepo: mockLeadRepo({
          findByEmail: vi.fn().mockResolvedValue({
            id: "lead-existing",
            status: "pendente",
            city: "Rio de Janeiro",
            state: "RJ",
          }),
          updateLocation,
        }),
      });

      const result = await service.createLead({
        name: "João",
        company: "Corp",
        phone: "12345678",
        email: "joao@corp.com",
        role: "CTO",
        city: "Campinas",
        state: "SP",
      });

      expect(result).toEqual({ ok: true, leadId: "lead-existing" });
      expect(updateLocation).toHaveBeenCalledTimes(1);
      expect(updateLocation).toHaveBeenCalledWith("lead-existing", {
        city: "Campinas",
        state: "SP",
      });
    });

    it("rejects lead already concluido", async () => {
      const updateLocation = vi.fn();
      const service = createLeadService({
        leadRepo: mockLeadRepo({
          findByEmail: vi.fn().mockResolvedValue({
            id: "lead-done",
            status: "concluido",
          }),
          updateLocation,
        }),
      });

      await expect(
        service.createLead({
          name: "João",
          company: "Corp",
          phone: "12345678",
          email: "joao@corp.com",
          role: "CTO",
          city: "São Paulo",
          state: "SP",
        }),
      ).rejects.toMatchObject({ status: 409 });
      expect(updateLocation).not.toHaveBeenCalled();
    });

    it("throws LeadServiceError 500 when updating the location of a pending lead fails", async () => {
      const create = vi.fn();
      const updateLocation = vi
        .fn()
        .mockRejectedValue(new Error("update failed"));
      const service = createLeadService({
        leadRepo: mockLeadRepo({
          findByEmail: vi.fn().mockResolvedValue({
            id: "lead-existing",
            status: "pendente",
          }),
          create,
          updateLocation,
        }),
      });

      const error: unknown = await service
        .createLead({
          name: "João",
          company: "Corp",
          phone: "12345678",
          email: "joao@corp.com",
          role: "CTO",
          city: "São Paulo",
          state: "SP",
        })
        .catch((err: unknown) => err);

      expect(error).toBeInstanceOf(LeadServiceError);
      expect(error).toMatchObject({
        status: 500,
        message: "Erro ao salvar cadastro",
      });
      expect(create).not.toHaveBeenCalled();
    });

    it("race on unique constraint: reuses pending lead", async () => {
      const error = Object.assign(new Error("duplicate"), { code: "23505" });
      const updateLocation = vi.fn();
      const service = createLeadService({
        leadRepo: mockLeadRepo({
          findByEmail: vi
            .fn()
            .mockResolvedValueOnce(null)
            .mockResolvedValueOnce({ id: "lead-race", status: "pendente" }),
          create: vi.fn().mockRejectedValue(error),
          updateLocation,
        }),
      });

      const result = await service.createLead({
        name: "João",
        company: "Corp",
        phone: "12345678",
        email: "joao@corp.com",
        role: "CTO",
        city: "São Paulo",
        state: "SP",
      });

      expect(result).toEqual({ ok: true, leadId: "lead-race" });
      expect(updateLocation).not.toHaveBeenCalled();
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
          city: "São Paulo",
          state: "SP",
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
        city: "São Paulo",
        state: "SP",
      });

      expect(create).toHaveBeenCalledWith(
        expect.objectContaining({ email: "joao@corp.com" }),
      );
    });
  });
});
