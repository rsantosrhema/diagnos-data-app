import type { SupabaseClient } from "@supabase/supabase-js";

export interface AnalysisQueueJob {
  msgId: string;
  leadId: string;
}

export interface EnqueueResult {
  ok: boolean;
  queued: boolean;
}

export interface AnalysisQueueStats {
  queueLength: number;
  oldestAgeSec: number | null;
  pendente: number;
  processando: number;
  analisado: number;
  falha: number;
}

export function createAnalysisQueueRepository(supabase: SupabaseClient) {
  return {
    async enqueue(leadId: string): Promise<EnqueueResult> {
      const { data, error } = await supabase.rpc("analysis_queue_enqueue", {
        p_lead_id: leadId,
      });
      if (error) throw error;
      const result = data as { ok?: boolean; queued?: boolean } | null;
      return { ok: result?.ok ?? true, queued: result?.queued ?? true };
    },

    async read(): Promise<AnalysisQueueJob | null> {
      const { data, error } = await supabase.rpc("analysis_queue_read");
      if (error) throw error;
      if (!data) return null;
      return {
        msgId: String(data.msg_id),
        leadId: data.lead_id as string,
      };
    },

    async ack(
      msgId: string,
      leadId: string,
      status: "analisado" | "falha",
      errorMessage?: string,
      durationMs?: number,
    ): Promise<void> {
      const { error } = await supabase.rpc("analysis_queue_ack", {
        p_msg_id: msgId,
        p_lead_id: leadId,
        p_status: status,
        p_error: errorMessage ?? null,
        p_duration_ms: durationMs ?? null,
      });
      if (error) throw error;
    },

    async requeue(msgId: string): Promise<void> {
      const { error } = await supabase.rpc("analysis_queue_requeue", {
        p_msg_id: msgId,
      });
      if (error) throw error;
    },

    async failStale(maxAgeMinutes: number): Promise<number> {
      const { data, error } = await supabase.rpc("analysis_queue_fail_stale", {
        p_max_age: `${maxAgeMinutes} minutes`,
      });
      if (error) throw error;
      return (data as number) ?? 0;
    },

    async stats(): Promise<AnalysisQueueStats> {
      const { data, error } = await supabase.rpc("analysis_queue_stats");
      if (error) throw error;
      const s = (data ?? {}) as {
        queue_length?: number;
        oldest_age_sec?: number | null;
        pendente?: number;
        processando?: number;
        analisado?: number;
        falha?: number;
      };
      return {
        queueLength: s.queue_length ?? 0,
        oldestAgeSec: s.oldest_age_sec ?? null,
        pendente: s.pendente ?? 0,
        processando: s.processando ?? 0,
        analisado: s.analisado ?? 0,
        falha: s.falha ?? 0,
      };
    },
  };
}

export type AnalysisQueueRepository = ReturnType<
  typeof createAnalysisQueueRepository
>;
