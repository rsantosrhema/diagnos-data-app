import { describe, it, expect, vi, beforeEach } from "vitest";
import { createShareTokenRepository } from "./share-token-repo";
import type { SupabaseClient } from "@supabase/supabase-js";

interface Builder {
  select: ReturnType<typeof vi.fn>;
  eq: ReturnType<typeof vi.fn>;
  is: ReturnType<typeof vi.fn>;
  gt: ReturnType<typeof vi.fn>;
  single: ReturnType<typeof vi.fn>;
  maybeSingle: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
  insert: ReturnType<typeof vi.fn>;
}

function mockSupabase(response: {
  data?: unknown;
  error?: unknown;
  updateError?: unknown;
  insertError?: unknown;
}) {
  const builder = {} as Builder;
  builder.select = vi.fn().mockReturnValue(builder);
  builder.eq = vi.fn().mockReturnValue(builder);
  builder.is = vi.fn().mockReturnValue(builder);
  builder.gt = vi.fn().mockReturnValue(builder);
  builder.maybeSingle = vi.fn().mockResolvedValue({
    data: response.data ?? null,
    error: response.error ?? null,
  });
  builder.single = vi.fn().mockResolvedValue({
    data: response.data ?? null,
    error: response.error ?? null,
  });
  const updateFinal = vi.fn().mockResolvedValue({
    data: null,
    error: response.updateError ?? null,
  });
  const updateEq = vi.fn().mockReturnValue({ is: updateFinal });
  builder.update = vi.fn().mockReturnValue({ eq: updateEq });
  builder.insert = vi.fn().mockResolvedValue({
    data: null,
    error: response.insertError ?? null,
  });
  const sb = { from: vi.fn().mockReturnValue(builder) } as unknown as SupabaseClient;
  return {
    sb,
    from: sb.from as ReturnType<typeof vi.fn>,
    builder,
    select: builder.select,
    queryEq: builder.eq,
    maybeSingle: builder.maybeSingle,
    update: builder.update,
    updateEq,
    updateFinal,
    insert: builder.insert,
  };
}

const TOKEN_ROW = {
  id: "tok-1",
  lead_id: "lead-1",
  token_hash: "abc123",
  expires_at: "2026-11-01T00:00:00Z",
  revoked_at: null,
  created_by: null,
  created_at: "2026-08-01T00:00:00Z",
};

describe("ShareTokenRepository", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("create", () => {
    it("revoga token ativo anterior do lead e insere o novo", async () => {
      const { sb, from, update, updateEq, updateFinal, insert } = mockSupabase({});
      const repo = createShareTokenRepository(sb);

      await repo.create({
        leadId: "lead-1",
        tokenHash: "abc123",
        expiresAt: "2026-11-01T00:00:00Z",
      });

      expect(from).toHaveBeenCalledWith("share_tokens");
      expect(update).toHaveBeenCalledWith({ revoked_at: expect.any(String) });
      expect(updateEq).toHaveBeenCalledWith("lead_id", "lead-1");
      expect(updateFinal).toHaveBeenCalledWith("revoked_at", null);
      expect(insert).toHaveBeenCalledWith({
        lead_id: "lead-1",
        token_hash: "abc123",
        expires_at: "2026-11-01T00:00:00Z",
      });
    });

    it("propaga erro do insert", async () => {
      const { sb } = mockSupabase({ insertError: new Error("insert failed") });
      const repo = createShareTokenRepository(sb);

      await expect(
        repo.create({
          leadId: "lead-1",
          tokenHash: "abc",
          expiresAt: "2026-11-01T00:00:00Z",
        }),
      ).rejects.toThrow("insert failed");
    });
  });

  describe("findByHash", () => {
    it("busca por token_hash e retorna a linha com colunas explícitas", async () => {
      const { sb, from, select, queryEq, maybeSingle } = mockSupabase({
        data: TOKEN_ROW,
      });
      const repo = createShareTokenRepository(sb);

      const result = await repo.findByHash("abc123");

      expect(from).toHaveBeenCalledWith("share_tokens");
      expect(select).toHaveBeenCalledWith(
        "id, lead_id, token_hash, expires_at, revoked_at, created_by, created_at",
      );
      expect(queryEq).toHaveBeenCalledWith("token_hash", "abc123");
      expect(maybeSingle).toHaveBeenCalled();
      expect(result).toEqual(TOKEN_ROW);
    });

    it("retorna null quando não existe linha", async () => {
      const { sb } = mockSupabase({ data: null });
      const repo = createShareTokenRepository(sb);

      const result = await repo.findByHash("desconhecido");

      expect(result).toBeNull();
    });
  });

  describe("findActiveByLeadId", () => {
    it("filtra por lead ainda não revogado e não expirado", async () => {
      const { sb, builder, from, queryEq } = mockSupabase({ data: TOKEN_ROW });
      const repo = createShareTokenRepository(sb);

      const result = await repo.findActiveByLeadId("lead-1");

      expect(from).toHaveBeenCalledWith("share_tokens");
      expect(queryEq).toHaveBeenCalledWith("lead_id", "lead-1");
      expect(builder.is).toHaveBeenCalledWith("revoked_at", null);
      expect(builder.select).toHaveBeenCalledWith(
        "id, lead_id, token_hash, expires_at, revoked_at, created_by, created_at",
      );
      expect(result).toEqual(TOKEN_ROW);
    });

    it("retorna null quando não há token ativo", async () => {
      const { sb } = mockSupabase({ data: null });
      const repo = createShareTokenRepository(sb);

      const result = await repo.findActiveByLeadId("lead-1");

      expect(result).toBeNull();
    });
  });

  describe("revokeByLeadId", () => {
    it("seta revoked_at apenas em linhas ainda não revogadas", async () => {
      const { sb, from, update, updateEq, updateFinal } = mockSupabase({});
      const repo = createShareTokenRepository(sb);

      await repo.revokeByLeadId("lead-1");

      expect(from).toHaveBeenCalledWith("share_tokens");
      expect(update).toHaveBeenCalledWith({ revoked_at: expect.any(String) });
      expect(updateEq).toHaveBeenCalledWith("lead_id", "lead-1");
      expect(updateFinal).toHaveBeenCalledWith("revoked_at", null);
    });

    it("propaga erro do update", async () => {
      const { sb } = mockSupabase({ updateError: new Error("revoke failed") });
      const repo = createShareTokenRepository(sb);

      await expect(repo.revokeByLeadId("lead-1")).rejects.toThrow("revoke failed");
    });
  });
});
