import { NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase/server";
import { requireManager, unauthorized } from "@/lib/auth/guard";
import { verifyInternalApiKey } from "@/lib/auth/internal-key";
import { sendTokenEmail, buildMailtoFallback } from "@/lib/email/send-token";
import { createTokenRepository } from "@/lib/repository/token-repo";
import { createLeadRepository } from "@/lib/repository/lead-repo";
import { createSessionRepository } from "@/lib/repository/session-repo";
import { createTokenService, TokenServiceError } from "@/lib/service/token-service";

interface Params {
  params: { id: string };
}

export async function POST(req: Request, { params }: Params) {
  if (!verifyInternalApiKey(req)) {
    return NextResponse.json({ error: "Chave interna inválida" }, { status: 401 });
  }
  const manager = await requireManager(req);
  if (!manager) return unauthorized();

  const { token: bodyToken } = await req.json().catch(() => ({
    token: undefined as string | undefined,
  }));

  const supabase = getServiceClient();
  const tokenService = createTokenService({
    tokenRepo: createTokenRepository(supabase),
    leadRepo: createLeadRepository(supabase),
    sessionRepo: createSessionRepository(supabase),
  });

  try {
    const result = await tokenService.sendTokenEmail(
      params.id,
      bodyToken,
      sendTokenEmail,
      buildMailtoFallback,
    );

    if (result.mailto) {
      return NextResponse.json(
        { error: "Falha no envio de email", mailto: result.mailto },
        { status: 502 },
      );
    }

    return NextResponse.json({ sentAt: result.sentAt }, { status: 200 });
  } catch (err) {
    if (err instanceof TokenServiceError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Erro ao enviar token" }, { status: 500 });
  }
}
