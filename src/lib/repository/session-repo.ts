import type { SupabaseClient } from "@supabase/supabase-js";

export function createSessionRepository(supabase: SupabaseClient) {
  return {
    async create(params: {
      tokenHash: string;
      leadId: string;
      expiresAt: string;
      isMaster?: boolean;
    }): Promise<void> {
      const { error } = await supabase.from("sessions").insert({
        token_hash: params.tokenHash,
        lead_id: params.leadId,
        expires_at: params.expiresAt,
        is_master: params.isMaster ?? false,
      });
      if (error) throw error;
    },

    async findActiveByHash(tokenHash: string): Promise<{ lead_id: string; expires_at: string; is_master: boolean } | null> {
      const { data, error } = await supabase
        .from("sessions")
        .select("lead_id, expires_at, is_master")
        .eq("token_hash", tokenHash)
        .maybeSingle();
      if (error) return null;
      if (!data) return null;
      if (new Date(data.expires_at).getTime() <= Date.now()) return null;
      return data;
    },

    async deleteByHash(tokenHash: string): Promise<void> {
      const { error } = await supabase
        .from("sessions")
        .delete()
        .eq("token_hash", tokenHash);
      if (error) throw error;
    },
  };
}

export type SessionRepository = ReturnType<typeof createSessionRepository>;
