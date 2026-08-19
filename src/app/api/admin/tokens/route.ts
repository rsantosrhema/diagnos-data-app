import { NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase/server";
import { requireManager, unauthorized } from "@/lib/auth/guard";

export async function GET(req: Request) {
  const manager = await requireManager(req);
  if (!manager) return unauthorized();

  const supabase = getServiceClient();

  // lazy expiry antes de montar KPIs
  await supabase.rpc("mark_expired_tokens");

  const { data: leads, error: leadsError } = await supabase
    .from("leads")
    .select("id, name, company, email, status, created_at")
    .order("created_at", { ascending: false });

  if (leadsError) {
    return NextResponse.json({ error: "Erro ao carregar clientes" }, { status: 500 });
  }

  const { data: tokens, error: tokensError } = await supabase
    .from("access_tokens")
    .select("id, lead_id, status, expires_at, sent_at, created_at")
    .order("created_at", { ascending: false });

  if (tokensError) {
    return NextResponse.json({ error: "Erro ao carregar tokens" }, { status: 500 });
  }

  const latestTokenByLead = new Map<string, (typeof tokens)[number]>();
  for (const t of tokens ?? []) {
    if (!latestTokenByLead.has(t.lead_id)) latestTokenByLead.set(t.lead_id, t);
  }

  const rows = (leads ?? []).map((lead) => {
    const token = latestTokenByLead.get(lead.id) ?? null;
    return {
      leadId: lead.id,
      name: lead.name,
      company: lead.company,
      email: lead.email,
      leadStatus: lead.status,
      tokenId: token?.id ?? null,
      tokenStatus: token?.status ?? null,
      tokenExpiresAt: token?.expires_at ?? null,
      tokenSentAt: token?.sent_at ?? null,
    };
  });

  const now = Date.now();
  const kpis = {
    pendentesEnvio: (tokens ?? []).filter(
      (t) => t.status === "disponivel" && !t.sent_at && new Date(t.expires_at).getTime() > now
    ).length,
    expirados: (tokens ?? []).filter((t) => t.status === "expirado").length,
    cadastrados: leads?.length ?? 0,
  };

  return NextResponse.json({ kpis, rows }, { status: 200 });
}
