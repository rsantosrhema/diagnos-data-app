import { NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase/server";
import { requireManager, unauthorized } from "@/lib/auth/guard";
import { sendTokenEmail, buildMailtoFallback } from "@/lib/email/send-token";
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
    .select("id, lead_id, status, expires_at")
    .eq("id", params.id)
    .maybeSingle();

  if (tokenError) return NextResponse.json({ error: "Erro ao buscar token" }, { status: 500 });
  if (!tokenRow) return NextResponse.json({ error: "Token não encontrado" }, { status: 404 });

  if (tokenRow.status !== "disponivel") {
    return NextResponse.json(
      { error: `Token não está disponível (status: ${tokenRow.status}).` },
      { status: 409 }
    );
  }

  if (new Date(tokenRow.expires_at).getTime() <= Date.now()) {
    await supabase.from("access_tokens").update({ status: "expirado" }).eq("id", tokenRow.id);
    return NextResponse.json({ error: "Token expirado. Gere um novo." }, { status: 409 });
  }

  const { data: lead, error: leadError } = await supabase
    .from("leads")
    .select("name, email")
    .eq("id", tokenRow.lead_id)
    .single();

  if (leadError || !lead) {
    return NextResponse.json({ error: "Cliente não encontrado" }, { status: 404 });
  }

  // o texto puro do token não é recuperável do hash; exige nova geração para envio
  const { token } = await req.json().catch(() => ({ token: undefined as string | undefined }));

  if (!token) {
    return NextResponse.json(
      { error: "Token em texto puro é necessário para envio; gere um novo token." },
      { status: 400 }
    );
  }

  try {
    await sendTokenEmail({ to: lead.email, name: lead.name, token });
  } catch {
    const mailto = buildMailtoFallback({ to: lead.email, name: lead.name, token });
    return NextResponse.json({ error: "Falha no envio de email", mailto }, { status: 502 });
  }

  const sentAt = new Date().toISOString();
  await supabase.from("access_tokens").update({ sent_at: sentAt }).eq("id", tokenRow.id);

  return NextResponse.json({ sentAt }, { status: 200 });
}
