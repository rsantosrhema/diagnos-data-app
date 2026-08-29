import { describe, it, expect, vi } from "vitest";
import { createAnalysisQueueRepository } from "./analysis-queue-repo";
import type { SupabaseClient } from "@supabase/supabase-js";

function mockSupabase(rpcResult: { data?: unknown; error?: unknown }) {
  const rpc = vi.fn().mockResolvedValue(rpcResult);
  const sb = { rpc } as unknown as SupabaseClient;
  return { sb, rpc };
}

describe("AnalysisQueueRepository", () => {
  describe("enqueue", () => {
    it("chama rpc analysis_queue_enqueue com o lead_id", async () => {
      const { sb, rpc } = mockSupabase({ error: null });
      const repo = createAnalysisQueueRepository(sb);

      await repo.enqueue("lead-1");

      expect(rpc).toHaveBeenCalledWith("analysis_queue_enqueue", {
        p_lead_id: "lead-1",
      });
    });

    it("propaga erro do rpc", async () => {
      const { sb } = mockSupabase({ error: new Error("queue down") });
      const repo = createAnalysisQueueRepository(sb);

      await expect(repo.enqueue("lead-1")).rejects.toThrow("queue down");
    });
  });

  describe("pop", () => {
    it("mapeia msg_id e lead_id do jsonb retornado", async () => {
      const { sb, rpc } = mockSupabase({
        data: { msg_id: 42, lead_id: "lead-7" },
        error: null,
      });
      const repo = createAnalysisQueueRepository(sb);

      const job = await repo.pop();

      expect(rpc).toHaveBeenCalledWith("analysis_queue_pop");
      expect(job).toEqual({ msgId: "42", leadId: "lead-7" });
    });

    it("retorna null quando a fila está vazia", async () => {
      const { sb } = mockSupabase({ data: null, error: null });
      const repo = createAnalysisQueueRepository(sb);

      const job = await repo.pop();

      expect(job).toBeNull();
    });

    it("propaga erro do rpc", async () => {
      const { sb } = mockSupabase({ error: new Error("pop failed") });
      const repo = createAnalysisQueueRepository(sb);

      await expect(repo.pop()).rejects.toThrow("pop failed");
    });
  });
});
