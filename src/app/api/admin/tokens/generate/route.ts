import { NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase/server";
import { generateTokenSchema } from "@/lib/schemas/token";
import { generateToken, hashToken } from "@/lib/auth/token";
import { requireManager, unauthorized } from "@/lib/auth/guard";

const TOKEN_TTL_MS = 20 * 60 * 1000;
const MAX_GENERATE_ATTEMPTS = 5;

export async function POST(req: Request) {
  const manager = await requireManager(req);
  if (!manager) return unauthorized();

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const parsed = generateTokenSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "leadId inválido" }, { status: 400 });
  }

  const supabase = getServiceClient();
  const { leadId } = parsed.data;

  const { data: lead, error: leadError } = await supabase
    .from("leads")
    .select("id, email, name, status")
    .eq("id", leadId)
    .maybeSingle();

  if (leadError) return NextResponse.json({ error: "Erro ao buscar cliente" }, { status: 500 });
  if (!lead) return NextResponse.json({ error: "Cliente não encontrado" }, { status: 404 });

  // invalida tokens ativos anteriores (um token ativo por lead)
  await supabase
    .from("access_tokens")
    .update({ status: "cancelado" })
    .eq("lead_id", leadId)
    .eq("status", "disponivel");

  for (let attempt = 0; attempt < MAX_GENERATE_ATTEMPTS; attempt++) {
    const token = generateToken();
    const tokenHash = hashToken(token);
    const expiresAt = new Date(Date.now() + TOKEN_TTL_MS).toISOString();

    const { data, error } = await supabase
      .from("access_tokens")
      .insert({ lead_id: leadId, token_hash: tokenHash, status: "disponivel", expires_at: expiresAt })
      .select("id")
      .single();

    if (!error && data) {
      await supabase.from("leads").update({ status: "token_gerado" }).eq("id", leadId);
      // token em texto puro só é retornado aqui, uma única vez
      return NextResponse.json({ id: data.id, token }, { status: 201 });
    }

    // 23505 = unique violation (colisão de hash) → tenta regerar
    if (error?.code !== "23505") {
      return NextResponse.json({ error: "Erro ao gerar token" }, { status: 500 });
    }
  }

  return NextResponse.json({ error: "Não foi possível gerar um token único" }, { status: 500 });
}
