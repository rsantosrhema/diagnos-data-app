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
    it("chama rpc analysis_queue_enqueue com o lead_id e retorna {ok,queued}", async () => {
      const { sb, rpc } = mockSupabase({ data: { ok: true, queued: true }, error: null });
      const repo = createAnalysisQueueRepository(sb);

      const result = await repo.enqueue("lead-1");

      expect(rpc).toHaveBeenCalledWith("analysis_queue_enqueue", {
        p_lead_id: "lead-1",
      });
      expect(result).toEqual({ ok: true, queued: true });
    });

    it("retorna queued=false quando o job já existe (dedup)", async () => {
      const { sb } = mockSupabase({ data: { ok: true, queued: false }, error: null });
      const repo = createAnalysisQueueRepository(sb);

      const result = await repo.enqueue("lead-1");

      expect(result).toEqual({ ok: true, queued: false });
    });

    it("propaga erro do rpc", async () => {
      const { sb } = mockSupabase({ error: new Error("queue down") });
      const repo = createAnalysisQueueRepository(sb);

      await expect(repo.enqueue("lead-1")).rejects.toThrow("queue down");
    });
  });

  describe("read", () => {
    it("mapeia msg_id e lead_id do jsonb retornado", async () => {
      const { sb, rpc } = mockSupabase({
        data: { msg_id: 42, lead_id: "lead-7" },
        error: null,
      });
      const repo = createAnalysisQueueRepository(sb);

      const job = await repo.read();

      expect(rpc).toHaveBeenCalledWith("analysis_queue_read");
      expect(job).toEqual({ msgId: "42", leadId: "lead-7" });
    });

    it("retorna null quando a fila está vazia", async () => {
      const { sb } = mockSupabase({ data: null, error: null });
      const repo = createAnalysisQueueRepository(sb);

      const job = await repo.read();

      expect(job).toBeNull();
    });

    it("propaga erro do rpc", async () => {
      const { sb } = mockSupabase({ error: new Error("read failed") });
      const repo = createAnalysisQueueRepository(sb);

      await expect(repo.read()).rejects.toThrow("read failed");
    });
  });

  describe("ack", () => {
    it("chama analysis_queue_ack com status/erro/duração", async () => {
      const { sb, rpc } = mockSupabase({ error: null });
      const repo = createAnalysisQueueRepository(sb);

      await repo.ack("42", "lead-1", "falha", "boom", 1200);

      expect(rpc).toHaveBeenCalledWith("analysis_queue_ack", {
        p_msg_id: "42",
        p_lead_id: "lead-1",
        p_status: "falha",
        p_error: "boom",
        p_duration_ms: 1200,
      });
    });

    it("propaga erro do rpc", async () => {
      const { sb } = mockSupabase({ error: new Error("ack failed") });
      const repo = createAnalysisQueueRepository(sb);

      await expect(repo.ack("42", "lead-1", "analisado")).rejects.toThrow("ack failed");
    });
  });

  describe("stats", () => {
    it("retorna as contagens e a profundidade da fila", async () => {
      const { sb, rpc } = mockSupabase({
        data: {
          queue_length: 3,
          oldest_age_sec: 120,
          pendente: 2,
          processando: 1,
          analisado: 5,
          falha: 0,
        },
        error: null,
      });
      const repo = createAnalysisQueueRepository(sb);

      const stats = await repo.stats();

      expect(rpc).toHaveBeenCalledWith("analysis_queue_stats");
      expect(stats).toEqual({
        queueLength: 3,
        oldestAgeSec: 120,
        pendente: 2,
        processando: 1,
        analisado: 5,
        falha: 0,
      });
    });
  });
});
