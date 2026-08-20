import { NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase/server";
import { validateTokenSchema } from "@/lib/schemas/token";
import { hashToken, isValidTokenFormat, createSessionToken, hashSessionToken } from "@/lib/auth/token";
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
  const rl = checkRateLimit(`validate:${ip}`, 10, 10 * 60 * 1000);
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

  const parsed = validateTokenSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Token inválido" }, { status: 401 });
  }

  const token = parsed.data.token.trim().toUpperCase();
  if (!isValidTokenFormat(token)) {
    return NextResponse.json({ error: "Token inválido" }, { status: 401 });
  }

  const supabase = getServiceClient();
  const tokenHash = hashToken(token);

  const { data: row, error } = await supabase
    .from("access_tokens")
    .select("id, lead_id, status, expires_at")
    .eq("token_hash", tokenHash)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: "Erro ao validar token" }, { status: 500 });
  }

  if (!row) {
    return NextResponse.json({ error: "Token inválido" }, { status: 401 });
  }

  // lazy expiry
  if (row.status === "disponivel" && new Date(row.expires_at).getTime() <= Date.now()) {
    await supabase.from("access_tokens").update({ status: "expirado" }).eq("id", row.id);
    return NextResponse.json({ error: "Token expirado. Solicite um novo token." }, { status: 401 });
  }

  if (row.status === "usado") {
    return NextResponse.json({ error: "Token já utilizado. Solicite um novo token." }, { status: 401 });
  }
  if (row.status === "cancelado") {
    return NextResponse.json({ error: "Token cancelado. Solicite um novo token." }, { status: 401 });
  }
  if (row.status === "expirado") {
    return NextResponse.json({ error: "Token expirado. Solicite um novo token." }, { status: 401 });
  }

  // consome o token e cria sessão de 2h
  const { error: consumeError } = await supabase
    .from("access_tokens")
    .update({ status: "usado", used_at: new Date().toISOString() })
    .eq("id", row.id)
    .eq("status", "disponivel");

  if (consumeError) {
    return NextResponse.json({ error: "Erro ao consumir token" }, { status: 500 });
  }

  const sessionToken = createSessionToken();
  const sessionHash = hashSessionToken(sessionToken);
  const sessionExpires = new Date(Date.now() + 2 * 60 * 60 * 1000);

  const { error: sessionError } = await supabase.from("sessions").insert({
    token_hash: sessionHash,
    lead_id: row.lead_id,
    expires_at: sessionExpires.toISOString(),
  });

  if (sessionError) {
    return NextResponse.json({ error: "Erro ao criar sessão" }, { status: 500 });
  }

  const res = NextResponse.json({ redirect: "/chat" }, { status: 200 });
  res.cookies.set("diagnos_session", sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    expires: sessionExpires,
    path: "/",
  });
  return res;
}
