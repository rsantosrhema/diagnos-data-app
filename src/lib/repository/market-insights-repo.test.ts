import { describe, it, expect, vi } from "vitest";
import { createMarketInsightsRepository } from "./market-insights-repo";
import type { SupabaseClient } from "@supabase/supabase-js";

function mockSupabase(response: { data?: unknown; error?: unknown }) {
  const builder: Record<string, unknown> = {};
  builder.upsert = vi
    .fn()
    .mockResolvedValue({ data: null, error: response.error ?? null });
  builder.select = vi.fn().mockReturnValue(builder);
  builder.eq = vi.fn().mockReturnValue(builder);
  builder.maybeSingle = vi.fn().mockResolvedValue(response);
  const updateEq = vi
    .fn()
    .mockResolvedValue({ data: null, error: response.error ?? null });
  builder.update = vi.fn().mockReturnValue({ eq: updateEq });
  const sb = { from: vi.fn().mockReturnValue(builder) } as unknown as SupabaseClient;
  return {
    sb,
    from: sb.from as ReturnType<typeof vi.fn>,
    upsert: builder.upsert as ReturnType<typeof vi.fn>,
    update: builder.update as ReturnType<typeof vi.fn>,
    updateEq,
    queryEq: builder.eq as ReturnType<typeof vi.fn>,
  };
}

const row = {
  id: "mi-1",
  lead_id: "lead-1",
  research: { empresa: { nome: "Corp" }, sections: [], sources: [] },
  analysis: { resumo: "x" },
  insights: { bullets: [] },
  sources: ["https://example.com"],
  status: "analisado",
  error: null,
  created_at: "2026-08-29T00:00:00Z",
  updated_at: "2026-08-29T00:00:00Z",
};

describe("MarketInsightsRepository", () => {
  describe("upsert", () => {
    it("faz upsert na tabela market_insights com onConflict lead_id", async () => {
      const { sb, from, upsert } = mockSupabase({ error: null });      const repo = createMarketInsightsRepository(sb);

      await repo.upsert({
        leadId: "lead-1",
        research: row.research,
        analysis: row.analysis,
        insights: row.insights,
        sources: row.sources,
        status: "analisado",
      });

      expect(from).toHaveBeenCalledWith("market_insights");
      expect(upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          lead_id: "lead-1",
          research: row.research,
          analysis: row.analysis,
          insights: row.insights,
          sources: row.sources,
          status: "analisado",
        }),
        { onConflict: "lead_id" },
      );
    });

    it("propaga erro do upsert", async () => {
      const { sb } = mockSupabase({ error: new Error("upsert failed") });
      const repo = createMarketInsightsRepository(sb);

      await expect(
        repo.upsert({
          leadId: "lead-1",
          research: {},
          analysis: {},
          insights: [],
          sources: [],
          status: "analisado",
        }),
      ).rejects.toThrow("upsert failed");
    });
  });

  describe("findByLeadId", () => {
    it("busca pela lead_id e retorna a linha", async () => {
      const { sb, from, queryEq } = mockSupabase({ data: row, error: null });
      const repo = createMarketInsightsRepository(sb);

      const result = await repo.findByLeadId("lead-1");

      expect(from).toHaveBeenCalledWith("market_insights");
      expect(queryEq).toHaveBeenCalledWith("lead_id", "lead-1");
      expect(result).toEqual(row);
    });

    it("retorna null quando não existe linha", async () => {
      const { sb } = mockSupabase({ data: null, error: null });
      const repo = createMarketInsightsRepository(sb);

      const result = await repo.findByLeadId("lead-x");

      expect(result).toBeNull();
    });

    it("propaga erro do select", async () => {
      const { sb } = mockSupabase({ error: new Error("select failed") });
      const repo = createMarketInsightsRepository(sb);

      await expect(repo.findByLeadId("lead-1")).rejects.toThrow("select failed");
    });
  });

  describe("markStatus", () => {
    it("atualiza status e erro na linha do lead", async () => {
      const { sb, update, updateEq } = mockSupabase({ error: null });
      const repo = createMarketInsightsRepository(sb);

      await repo.markStatus("lead-1", "falha", "boom");

      expect(update).toHaveBeenCalledWith({
        status: "falha",
        error: "boom",
        updated_at: expect.any(String),
      });
      expect(updateEq).toHaveBeenCalledWith("lead_id", "lead-1");
    });

    it("atualiza apenas o status quando não há erro", async () => {
      const { sb, update } = mockSupabase({ error: null });
      const repo = createMarketInsightsRepository(sb);

      await repo.markStatus("lead-1", "processando");

      expect(update).toHaveBeenCalledWith({
        status: "processando",
        updated_at: expect.any(String),
      });
    });

    it("propaga erro do update", async () => {
      const { sb } = mockSupabase({ error: new Error("update failed") });
      const repo = createMarketInsightsRepository(sb);

      await expect(repo.markStatus("lead-1", "falha")).rejects.toThrow("update failed");
    });
  });
});
