import { NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase/server";
import { leadSchema, sanitizeText } from "@/lib/schemas/lead";
import { checkRateLimit } from "@/lib/rate-limit";
import { verifyInternalApiKey } from "@/lib/auth/internal-key";

function getClientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}

export async function POST(req: Request) {
  if (!verifyInternalApiKey(req)) {
    return NextResponse.json({ error: "Chave interna inválida" }, { status: 401 });
  }

  const ip = getClientIp(req);
  const rl = checkRateLimit(`lead:${ip}`, 5, 10 * 60 * 1000);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Muitas tentativas. Tente novamente em alguns minutos." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSeconds ?? 600) } }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const parsed = leadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Dados inválidos", issues: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  // honeypot: bot preencheu o campo invisível
  if (parsed.data.website && parsed.data.website.trim() !== "") {
    return NextResponse.json({ ok: true }, { status: 200 });
  }

  const email = parsed.data.email.trim().toLowerCase();
  const supabase = getServiceClient();

  const { data: existing, error: existingError } = await supabase
    .from("leads")
    .select("id")
    .eq("email", email)
    .eq("status", "pendente")
    .maybeSingle();

  if (existingError) {
    return NextResponse.json({ error: "Erro ao verificar cadastro" }, { status: 500 });
  }

  if (existing) {
    return NextResponse.json(
      { error: "Já existe uma solicitação pendente para este email." },
      { status: 409 }
    );
  }

  const { error } = await supabase.from("leads").insert({
    name: sanitizeText(parsed.data.name),
    company: sanitizeText(parsed.data.company),
    phone: sanitizeText(parsed.data.phone),
    email,
    role: sanitizeText(parsed.data.role),
    status: "pendente",
  });

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json(
        { error: "Já existe uma solicitação pendente para este email." },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: "Erro ao salvar cadastro" }, { status: 500 });
  }

  return NextResponse.json({ ok: true }, { status: 201 });
}
