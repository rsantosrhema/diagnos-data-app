import { NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase/server";
import { validateTokenSchema } from "@/lib/schemas/token";
import { verifyInternalApiKey } from "@/lib/auth/internal-key";
import { createTokenRepository } from "@/lib/repository/token-repo";
import { createLeadRepository } from "@/lib/repository/lead-repo";
import { createSessionRepository } from "@/lib/repository/session-repo";
import { createTokenService, TokenServiceError } from "@/lib/service/token-service";

export async function POST(req: Request) {
  if (!verifyInternalApiKey(req)) {
    return NextResponse.json({ error: "Chave interna inválida" }, { status: 401 });
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

  const supabase = getServiceClient();
  const tokenService = createTokenService({
    tokenRepo: createTokenRepository(supabase),
    leadRepo: createLeadRepository(supabase),
    sessionRepo: createSessionRepository(supabase),
  });

  try {
    // Master token: bypass normal validation, create reusable session
    const masterResult = await tokenService.validateMasterToken(parsed.data.token);
    if (masterResult) {
      const res = NextResponse.json({ redirect: "/diagnostico" }, { status: 200 });
      res.cookies.set("diagnos_session", masterResult.sessionToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        expires: masterResult.sessionExpires,
        path: "/",
      });
      return res;
    }

    // Normal token flow
    const { sessionToken, sessionExpires } = await tokenService.validateAndCreateSession(
      parsed.data.token,
    );

    const res = NextResponse.json({ redirect: "/diagnostico" }, { status: 200 });
    res.cookies.set("diagnos_session", sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      expires: sessionExpires,
      path: "/",
    });
    return res;
  } catch (err) {
    if (err instanceof TokenServiceError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Erro ao validar token" }, { status: 500 });
  }
}
