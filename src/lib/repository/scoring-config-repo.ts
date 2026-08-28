import type { SupabaseClient } from "@supabase/supabase-js";
import type { ScoringCalibration } from "@/lib/screener/scoring-calibration";

export interface ScoringConfigRow {
  id: string;
  version: string;
  config: ScoringCalibration;
  is_active: boolean;
  created_at: string;
  created_by: string;
}

export function createScoringConfigRepository(supabase: SupabaseClient) {
  return {
    async createVersion(params: {
      version: string;
      config: ScoringCalibration;
      createdBy: string;
    }): Promise<ScoringConfigRow> {
      const { data, error } = await supabase
        .from("scoring_versions")
        .insert({
          version: params.version,
          config: params.config,
          is_active: false,
          created_by: params.createdBy,
        })
        .select("id, version, config, is_active, created_at, created_by")
        .single();
      if (error) throw error;
      return data as ScoringConfigRow;
    },

    async listVersions(): Promise<ScoringConfigRow[]> {
      const { data, error } = await supabase
        .from("scoring_versions")
        .select("id, version, config, is_active, created_at, created_by")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as ScoringConfigRow[];
    },

    async getActiveVersion(): Promise<ScoringConfigRow | null> {
      const { data, error } = await supabase
        .from("scoring_versions")
        .select("id, version, config, is_active, created_at, created_by")
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as ScoringConfigRow | null;
    },

    async activateVersion(id: string): Promise<void> {
      const { error: deactivateError } = await supabase
        .from("scoring_versions")
        .update({ is_active: false })
        .eq("is_active", true);
      if (deactivateError) throw deactivateError;

      const { error: activateError } = await supabase
        .from("scoring_versions")
        .update({ is_active: true })
        .eq("id", id);
      if (activateError) throw activateError;
    },
  };
}

export type ScoringConfigRepository = ReturnType<
  typeof createScoringConfigRepository
>;
