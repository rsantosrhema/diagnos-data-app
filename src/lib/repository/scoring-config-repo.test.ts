import { describe, it, expect, vi } from "vitest";
import { createScoringConfigRepository } from "./scoring-config-repo";
import type { ScoringCalibration } from "@/lib/screener/scoring-calibration";

function mockSupabase(response: { data?: unknown; error?: unknown }) {
  const builder: Record<string, unknown> = {};
  builder.select = vi.fn().mockReturnValue(builder);
  builder.insert = vi.fn().mockReturnValue(builder);
  builder.update = vi.fn().mockReturnValue(builder);
  builder.eq = vi.fn().mockReturnValue(builder);
  builder.order = vi.fn().mockReturnValue(builder);
  builder.limit = vi.fn().mockReturnValue(builder);
  builder.single = vi.fn().mockResolvedValue(response);
  builder.maybeSingle = vi.fn().mockResolvedValue(response);
  return {
    from: vi.fn().mockReturnValue(builder),
  } as unknown as import("@supabase/supabase-js").SupabaseClient;
}

const mockConfig = { version: "1.0.0", dimensions: {} } as unknown as ScoringCalibration;

describe("createScoringConfigRepository", () => {
  it("createVersion insere no Supabase", async () => {
    const row = { id: "uuid-1", version: "1.0.0", config: mockConfig, is_active: false, created_at: "2025-01-01", created_by: "admin" };
    const supabase = mockSupabase({ data: row });
    const repo = createScoringConfigRepository(supabase);

    const result = await repo.createVersion({ version: "1.0.0", config: mockConfig, createdBy: "admin" });
    expect(result.id).toBe("uuid-1");
    expect(supabase.from).toHaveBeenCalledWith("scoring_versions");
  });

  it("listVersions retorna array", async () => {
    const supabase = mockSupabase({ data: [] });
    const repo = createScoringConfigRepository(supabase);

    const result = await repo.listVersions();
    expect(result).toEqual([]);
  });

  it("getActiveVersion retorna null quando não há versão ativa", async () => {
    const supabase = mockSupabase({ data: null });
    const repo = createScoringConfigRepository(supabase);

    const result = await repo.getActiveVersion();
    expect(result).toBeNull();
  });

  it("activateVersion desativa todas e ativa a selecionada", async () => {
    const supabase = mockSupabase({ data: null });
    const repo = createScoringConfigRepository(supabase);

    await repo.activateVersion("uuid-1");
    expect(supabase.from).toHaveBeenCalledWith("scoring_versions");
  });
});
