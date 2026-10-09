import type { SupabaseClient } from "@supabase/supabase-js";

const TOKEN_COLUMNS =
  "id, lead_id, token_hash, expires_at, revoked_at, created_by, created_at";

export interface ShareTokenRow {
  id: string;
  lead_id: string;
  token_hash: string;
  expires_at: string;
  revoked_at: string | null;
  created_by: string | null;
  created_at: string;
}

export interface CreateShareTokenParams {
  leadId: string;
  tokenHash: string;
  expiresAt: string;
}

export function createShareTokenRepository(supabase: SupabaseClient) {
  return {
    async create(params: CreateShareTokenParams): Promise<void> {
      const revokedAt = new Date().toISOString();
      const { error: revokeError } = await supabase
        .from("share_tokens")
        .update({ revoked_at: revokedAt })
        .eq("lead_id", params.leadId)
        .is("revoked_at", null);
      if (revokeError) throw revokeError;

      const { error } = await supabase.from("share_tokens").insert({
        lead_id: params.leadId,
        token_hash: params.tokenHash,
        expires_at: params.expiresAt,
      });
      if (error) throw error;
    },

    async findByHash(tokenHash: string): Promise<ShareTokenRow | null> {
      const { data, error } = await supabase
        .from("share_tokens")
        .select(TOKEN_COLUMNS)
        .eq("token_hash", tokenHash)
        .maybeSingle();
      if (error) throw error;
      return data;
    },

    async revokeByLeadId(leadId: string): Promise<void> {
      const { error } = await supabase
        .from("share_tokens")
        .update({ revoked_at: new Date().toISOString() })
        .eq("lead_id", leadId)
        .is("revoked_at", null);
      if (error) throw error;
    },

    async findActiveByLeadId(leadId: string): Promise<ShareTokenRow | null> {
      const { data, error } = await supabase
        .from("share_tokens")
        .select(TOKEN_COLUMNS)
        .eq("lead_id", leadId)
        .is("revoked_at", null)
        .gt("expires_at", new Date().toISOString())
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  };
}

export type ShareTokenRepository = ReturnType<typeof createShareTokenRepository>;
