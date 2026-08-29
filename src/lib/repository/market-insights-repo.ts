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
          "id, lead_id, research, analysis, insights, sources, status, error, created_at, updated_at",
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
        .update({
          status,
          ...(error !== undefined ? { error } : {}),
          updated_at: new Date().toISOString(),
        })
        .eq("lead_id", leadId);
      if (updateError) throw updateError;
    },
  };
}

export type MarketInsightsRepository = ReturnType<
  typeof createMarketInsightsRepository
>;
