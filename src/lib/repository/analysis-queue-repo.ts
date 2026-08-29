import type { SupabaseClient } from "@supabase/supabase-js";

export interface AnalysisQueueJob {
  msgId: string;
  leadId: string;
}

export function createAnalysisQueueRepository(supabase: SupabaseClient) {
  return {
    async enqueue(leadId: string): Promise<void> {
      const { error } = await supabase.rpc("analysis_queue_enqueue", {
        p_lead_id: leadId,
      });
      if (error) throw error;
    },

    async pop(): Promise<AnalysisQueueJob | null> {
      const { data, error } = await supabase.rpc("analysis_queue_pop");
      if (error) throw error;
      if (!data) return null;
      return {
        msgId: String(data.msg_id),
        leadId: data.lead_id as string,
      };
    },
  };
}

export type AnalysisQueueRepository = ReturnType<
  typeof createAnalysisQueueRepository
>;
