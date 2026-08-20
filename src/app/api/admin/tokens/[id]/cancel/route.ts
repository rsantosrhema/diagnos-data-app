import { NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase/server";
import { requireManager, unauthorized } from "@/lib/auth/guard";
import { verifyInternalApiKey } from "@/lib/auth/internal-key";

interface Params {
  params: { id: string };
}

export async function POST(req: Request, { params }: Params) {
  if (!verifyInternalApiKey(req)) {
    return NextResponse.json({ error: "Chave interna inválida" }, { status: 401 });
  }
  const manager = await requireManager(req);
  if (!manager) return unauthorized();

  const supabase = getServiceClient();

  const { data: tokenRow, error: tokenError } = await supabase
    .from("access_tokens")
    .select("id")
    .eq("id", params.id)
    .maybeSingle();

  if (tokenError) return NextResponse.json({ error: "Erro ao buscar token" }, { status: 500 });
  if (!tokenRow) return NextResponse.json({ error: "Token não encontrado" }, { status: 404 });

  const { error } = await supabase
    .from("access_tokens")
    .update({ status: "cancelado" })
    .eq("id", params.id);

  if (error) return NextResponse.json({ error: "Erro ao cancelar token" }, { status: 500 });

  return NextResponse.json({ ok: true }, { status: 200 });
}
