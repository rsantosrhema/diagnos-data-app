import type { SupabaseClient } from "@supabase/supabase-js";

export interface TokenRow {
  id: string;
  lead_id: string;
  status: string;
  expires_at: string;
  sent_at: string | null;
  created_at: string;
}

export function createTokenRepository(supabase: SupabaseClient) {
  return {
    async findByHash(tokenHash: string): Promise<TokenRow | null> {
      const { data, error } = await supabase
        .from("access_tokens")
        .select("id, lead_id, status, expires_at, sent_at, created_at")
        .eq("token_hash", tokenHash)
        .maybeSingle();
      if (error) throw error;
      return data;
    },

    async findById(id: string): Promise<TokenRow | null> {
      const { data, error } = await supabase
        .from("access_tokens")
        .select("id, lead_id, status, expires_at, sent_at, created_at")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },

    async markExpired(id: string): Promise<void> {
      const { error } = await supabase
        .from("access_tokens")
        .update({ status: "expirado" })
        .eq("id", id);
      if (error) throw error;
    },

    async consume(id: string): Promise<void> {
      const { error } = await supabase
        .from("access_tokens")
        .update({ status: "usado", used_at: new Date().toISOString() })
        .eq("id", id)
        .eq("status", "disponivel");
      if (error) throw error;
    },

    async cancel(id: string): Promise<void> {
      const { error } = await supabase
        .from("access_tokens")
        .update({ status: "cancelado" })
        .eq("id", id);
      if (error) throw error;
    },

    async cancelActiveByLeadId(leadId: string): Promise<void> {
      const { error } = await supabase
        .from("access_tokens")
        .update({ status: "cancelado" })
        .eq("lead_id", leadId)
        .eq("status", "disponivel");
      if (error) throw error;
    },

    async create(params: {
      leadId: string;
      tokenHash: string;
      expiresAt: string;
    }): Promise<{ id: string } | null> {
      const { data, error } = await supabase
        .from("access_tokens")
        .insert({
          lead_id: params.leadId,
          token_hash: params.tokenHash,
          status: "disponivel",
          expires_at: params.expiresAt,
        })
        .select("id")
        .single();
      if (error) {
        if (error.code === "23505") return null;
        throw error;
      }
      return data;
    },

    async updateSentAt(id: string, sentAt: string): Promise<void> {
      const { error } = await supabase
        .from("access_tokens")
        .update({ sent_at: sentAt })
        .eq("id", id);
      if (error) throw error;
    },

    async markExpiredTokens(): Promise<void> {
      const { error } = await supabase.rpc("mark_expired_tokens");
      if (error) throw error;
    },

    async findAll(): Promise<TokenRow[]> {
      const { data, error } = await supabase
        .from("access_tokens")
        .select("id, lead_id, status, expires_at, sent_at, created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  };
}

export type TokenRepository = ReturnType<typeof createTokenRepository>;
