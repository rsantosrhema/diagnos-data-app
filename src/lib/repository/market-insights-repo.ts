import type { SupabaseClient } from "@supabase/supabase-js";

export interface MarketInsightsRow {
  id: string;
  lead_id: string;
  research: unknown;
  analysis: unknown;
  insights: unknown;
  sources: unknown;
  status: string;
  error: string | null;
  created_at: string;
  updated_at: string;
  queued_at: string | null;
  processing_started_at: string | null;
  completed_at: string | null;
  attempts: number;
}

export interface UpsertMarketInsightsParams {
  leadId: string;
  research: unknown;
  analysis: unknown;
  insights: unknown;
  sources: unknown;
  status: MarketInsightsStatus;
}

export type MarketInsightsStatus = "pendente" | "processando" | "analisado" | "falha";

export type AnalysisJobLogStep =
  | "enqueued"
  | "started"
  | "researcher"
  | "analyst"
  | "writer"
  | "pdf"
  | "email"
  | "completed"
  | "failed";

export function createMarketInsightsRepository(supabase: SupabaseClient) {
  return {
    async upsert(params: UpsertMarketInsightsParams): Promise<void> {
      const { error } = await supabase.from("market_insights").upsert(
        {
          lead_id: params.leadId,
          research: params.research,
          analysis: params.analysis,
          insights: params.insights,
          sources: params.sources,
          status: params.status,
        },
        { onConflict: "lead_id" },
      );
      if (error) throw error;
    },

    async findByLeadId(leadId: string): Promise<MarketInsightsRow | null> {
      const { data, error } = await supabase
        .from("market_insights")
        .select(
          "id, lead_id, research, analysis, insights, sources, status, error, created_at, updated_at, queued_at, processing_started_at, completed_at, attempts",
        )
        .eq("lead_id", leadId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },

    async markStatus(
      leadId: string,
      status: MarketInsightsStatus,
      error?: string,
    ): Promise<void> {
      const { error: updateError } = await supabase
        .from("market_insights")
        .upsert(
          {
            lead_id: leadId,
            status,
            ...(error !== undefined ? { error } : {}),
            updated_at: new Date().toISOString(),
          },
          { onConflict: "lead_id" },
        );
      if (updateError) throw updateError;
    },

    async logEvent(
      leadId: string,
      step: AnalysisJobLogStep,
      message?: string,
      durationMs?: number,
    ): Promise<void> {
      const { error } = await supabase.from("analysis_job_logs").insert({
        lead_id: leadId,
        step,
        ...(message !== undefined ? { message } : {}),
        ...(durationMs !== undefined ? { duration_ms: durationMs } : {}),
      });
      if (error) throw error;
    },
  };
}

export type MarketInsightsRepository = ReturnType<
  typeof createMarketInsightsRepository
>;
