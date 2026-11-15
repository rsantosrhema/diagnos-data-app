import type { SupabaseClient } from "@supabase/supabase-js";

export interface LeadRow {
  id: string;
  name: string;
  company: string;
  email: string;
  phone: string;
  role: string;
  status: string;
  created_at: string;
  city?: string | null;
  state?: string | null;
}

export interface LeadProfileRow {
  id: string;
  name: string;
  company: string;
  email: string;
  role: string;
  status: string;
}

export function createLeadRepository(supabase: SupabaseClient) {
  return {
    async findById(id: string): Promise<LeadRow | null> {
      const { data, error } = await supabase
        .from("leads")
        .select("id, name, company, email, phone, role, status, created_at, city, state")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },

    async findByEmail(email: string): Promise<LeadRow | null> {
      const { data, error } = await supabase
        .from("leads")
        .select("id, name, company, email, phone, role, status, created_at, city, state")
        .eq("email", email)
        .maybeSingle();
      if (error) throw error;
      return data;
    },

    async findByEmailAndStatus(email: string, status: string): Promise<{ id: string } | null> {
      const { data, error } = await supabase
        .from("leads")
        .select("id")
        .eq("email", email)
        .eq("status", status)
        .maybeSingle();
      if (error) throw error;
      return data;
    },

    async create(params: {
      name: string;
      company: string;
      phone: string;
      email: string;
      role: string;
      city?: string;
      state?: string;
    }): Promise<string> {
      const { data, error } = await supabase
        .from("leads")
        .insert({
          name: params.name,
          company: params.company,
          phone: params.phone,
          email: params.email,
          role: params.role,
          city: params.city ?? null,
          state: params.state ?? null,
          status: "pendente",
        })
        .select("id")
        .single();
      if (error) throw error;
      return data.id;
    },

    async updateLocation(id: string, location: { city: string; state: string }): Promise<void> {
      const { error } = await supabase
        .from("leads")
        .update({ city: location.city, state: location.state })
        .eq("id", id);
      if (error) throw error;
    },

    async updateStatus(id: string, status: string): Promise<void> {
      const { error } = await supabase
        .from("leads")
        .update({ status })
        .eq("id", id);
      if (error) throw error;
    },

    async findAll(): Promise<LeadRow[]> {
      const { data, error } = await supabase
        .from("leads")
        .select("id, name, company, email, phone, role, status, created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },

    async findNameAndEmail(id: string): Promise<{ name: string; email: string } | null> {
      const { data, error } = await supabase
        .from("leads")
        .select("name, email")
        .eq("id", id)
        .single();
      if (error) return null;
      return data;
    },

    async findProfileById(id: string): Promise<LeadProfileRow | null> {
      const { data, error } = await supabase
        .from("leads")
        .select("id, name, company, email, role, status")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  };
}

export type LeadRepository = ReturnType<typeof createLeadRepository>;
