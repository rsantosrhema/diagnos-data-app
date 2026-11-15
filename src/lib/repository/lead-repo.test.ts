import { describe, it, expect, vi } from "vitest";
import { createLeadRepository } from "./lead-repo";
import type { SupabaseClient } from "@supabase/supabase-js";

function mockSupabase(response: { data?: unknown; error?: unknown }) {
  const builder: Record<string, unknown> = {};
  builder.select = vi.fn().mockReturnValue(builder);
  builder.eq = vi.fn().mockReturnValue(builder);
  builder.maybeSingle = vi.fn().mockResolvedValue(response);
  builder.single = vi.fn().mockResolvedValue(response);
  builder.insert = vi.fn().mockReturnValue(builder);
  const updateEq = vi
    .fn()
    .mockResolvedValue({ data: null, error: response.error ?? null });
  builder.update = vi.fn().mockReturnValue({ eq: updateEq });
  const sb = { from: vi.fn().mockReturnValue(builder) } as unknown as SupabaseClient;
  return {
    sb,
    from: sb.from as ReturnType<typeof vi.fn>,
    select: builder.select as ReturnType<typeof vi.fn>,
    insert: builder.insert as ReturnType<typeof vi.fn>,
    update: builder.update as ReturnType<typeof vi.fn>,
    updateEq,
    queryEq: builder.eq as ReturnType<typeof vi.fn>,
  };
}

const row = {
  id: "lead-1",
  name: "Ana",
  company: "Corp",
  email: "ana@corp.com",
  phone: "11999999999",
  role: "CDO",
  status: "pendente",
  created_at: "2026-08-29T00:00:00Z",
  city: "São Paulo",
  state: "SP",
};

const expectedColumns = "id, name, company, email, phone, role, status, created_at, city, state";

describe("LeadRepository", () => {
  describe("findById", () => {
    it("seleciona city e state e devolve a linha com a localização", async () => {
      const { sb, from, select, queryEq } = mockSupabase({ data: row, error: null });
      const repo = createLeadRepository(sb);

      const result = await repo.findById("lead-1");

      expect(from).toHaveBeenCalledWith("leads");
      expect(select).toHaveBeenCalledWith(expectedColumns);
      expect(queryEq).toHaveBeenCalledWith("id", "lead-1");
      expect(result).toEqual(row);
      expect(result?.city).toBe("São Paulo");
      expect(result?.state).toBe("SP");
    });

    it("devolve city e state nulos quando o lead não tem localização", async () => {
      const { sb } = mockSupabase({ data: { ...row, city: null, state: null }, error: null });
      const repo = createLeadRepository(sb);

      const result = await repo.findById("lead-1");

      expect(result?.city).toBeNull();
      expect(result?.state).toBeNull();
    });

    it("não quebra quando a linha legada não traz city nem state", async () => {
      const legacy = {
        id: "lead-legacy",
        name: "Ana",
        company: "Corp",
        email: "ana@corp.com",
        phone: "11999999999",
        role: "CDO",
        status: "pendente",
        created_at: "2026-08-29T00:00:00Z",
      };
      const { sb } = mockSupabase({ data: legacy, error: null });
      const repo = createLeadRepository(sb);

      const result = await repo.findById("lead-legacy");

      expect(result).toEqual(legacy);
      expect(result?.city).toBeUndefined();
      expect(result?.state).toBeUndefined();
    });

    it("retorna null quando o lead não existe", async () => {
      const { sb } = mockSupabase({ data: null, error: null });
      const repo = createLeadRepository(sb);

      const result = await repo.findById("lead-x");

      expect(result).toBeNull();
    });

    it("propaga erro do select", async () => {
      const { sb } = mockSupabase({ error: new Error("select failed") });
      const repo = createLeadRepository(sb);

      await expect(repo.findById("lead-1")).rejects.toThrow("select failed");
    });
  });

  describe("findByEmail", () => {
    it("seleciona city e state e devolve a linha com a localização", async () => {
      const { sb, from, select, queryEq } = mockSupabase({ data: row, error: null });
      const repo = createLeadRepository(sb);

      const result = await repo.findByEmail("ana@corp.com");

      expect(from).toHaveBeenCalledWith("leads");
      expect(select).toHaveBeenCalledWith(expectedColumns);
      expect(queryEq).toHaveBeenCalledWith("email", "ana@corp.com");
      expect(result).toEqual(row);
      expect(result?.city).toBe("São Paulo");
      expect(result?.state).toBe("SP");
    });

    it("devolve null quando o e-mail não tem lead", async () => {
      const { sb } = mockSupabase({ data: null, error: null });
      const repo = createLeadRepository(sb);

      const result = await repo.findByEmail("nobody@corp.com");

      expect(result).toBeNull();
    });

    it("propaga erro do select", async () => {
      const { sb } = mockSupabase({ error: new Error("select failed") });
      const repo = createLeadRepository(sb);

      await expect(repo.findByEmail("ana@corp.com")).rejects.toThrow("select failed");
    });
  });

  describe("create", () => {
    it("insere city e state junto aos demais campos do lead", async () => {
      const { sb, from, insert } = mockSupabase({ data: { id: "lead-new" }, error: null });
      const repo = createLeadRepository(sb);

      const id = await repo.create({
        name: "Ana",
        company: "Corp",
        phone: "11999999999",
        email: "ana@corp.com",
        role: "CDO",
        city: "São Paulo",
        state: "SP",
      });

      expect(from).toHaveBeenCalledWith("leads");
      expect(insert).toHaveBeenCalledWith({
        name: "Ana",
        company: "Corp",
        phone: "11999999999",
        email: "ana@corp.com",
        role: "CDO",
        city: "São Paulo",
        state: "SP",
        status: "pendente",
      });
      expect(id).toBe("lead-new");
    });

    it("insere null em city e state quando o lead não tem localização", async () => {
      const { sb, insert } = mockSupabase({ data: { id: "lead-new" }, error: null });
      const repo = createLeadRepository(sb);

      await repo.create({
        name: "Ana",
        company: "Corp",
        phone: "11999999999",
        email: "ana@corp.com",
        role: "CDO",
      });

      expect(insert).toHaveBeenCalledWith(
        expect.objectContaining({ city: null, state: null }),
      );
    });

    it("propaga erro do insert", async () => {
      const { sb } = mockSupabase({ error: new Error("insert failed") });
      const repo = createLeadRepository(sb);

      await expect(
        repo.create({
          name: "Ana",
          company: "Corp",
          phone: "11999999999",
          email: "ana@corp.com",
          role: "CDO",
          city: "São Paulo",
          state: "SP",
        }),
      ).rejects.toThrow("insert failed");
    });
  });

  describe("updateLocation", () => {
    it("atualiza city e state do lead pelo id", async () => {
      const { sb, from, update, updateEq } = mockSupabase({ error: null });
      const repo = createLeadRepository(sb);

      await repo.updateLocation("lead-1", { city: "Campinas", state: "SP" });

      expect(from).toHaveBeenCalledWith("leads");
      expect(update).toHaveBeenCalledWith({ city: "Campinas", state: "SP" });
      expect(updateEq).toHaveBeenCalledWith("id", "lead-1");
    });

    it("propaga erro do update", async () => {
      const { sb } = mockSupabase({ error: new Error("update failed") });
      const repo = createLeadRepository(sb);

      await expect(
        repo.updateLocation("lead-1", { city: "Campinas", state: "SP" }),
      ).rejects.toThrow("update failed");
    });
  });
});
