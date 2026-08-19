import { NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase/server";
import { requireManager, unauthorized } from "@/lib/auth/guard";
import { generateToken, hashToken } from "@/lib/auth/token";

interface Params {
  params: { id: string };
}

const TOKEN_TTL_MS = 20 * 60 * 1000;
const MAX_GENERATE_ATTEMPTS = 5;

export async function POST(req: Request, { params }: Params) {
  const manager = await requireManager(req);
  if (!manager) return unauthorized();

  const supabase = getServiceClient();

  const { data: tokenRow, error: tokenError } = await supabase
    .from("access_tokens")
    .select("id, lead_id")
    .eq("id", params.id)
    .maybeSingle();

  if (tokenError) return NextResponse.json({ error: "Erro ao buscar token" }, { status: 500 });
  if (!tokenRow) return NextResponse.json({ error: "Token não encontrado" }, { status: 404 });

  // invalida qualquer token ativo do mesmo lead
  await supabase
    .from("access_tokens")
    .update({ status: "cancelado" })
    .eq("lead_id", tokenRow.lead_id)
    .eq("status", "disponivel");

  for (let attempt = 0; attempt < MAX_GENERATE_ATTEMPTS; attempt++) {
    const token = generateToken();
    const tokenHash = hashToken(token);
    const expiresAt = new Date(Date.now() + TOKEN_TTL_MS).toISOString();

    const { data, error } = await supabase
      .from("access_tokens")
      .insert({
        lead_id: tokenRow.lead_id,
        token_hash: tokenHash,
        status: "disponivel",
        expires_at: expiresAt,
      })
      .select("id")
      .single();

    if (!error && data) {
      return NextResponse.json({ id: data.id, token }, { status: 201 });
    }

    if (error?.code !== "23505") {
      return NextResponse.json({ error: "Erro ao regerar token" }, { status: 500 });
    }
  }

  return NextResponse.json({ error: "Não foi possível regerar um token único" }, { status: 500 });
}
