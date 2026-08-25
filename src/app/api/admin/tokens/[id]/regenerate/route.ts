import { NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase/server";
import { requireManager, unauthorized } from "@/lib/auth/guard";
import { verifyInternalApiKey } from "@/lib/auth/internal-key";
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

  const supabase = getServiceClient();
  const tokenService = createTokenService({
    tokenRepo: createTokenRepository(supabase),
    leadRepo: createLeadRepository(supabase),
    sessionRepo: createSessionRepository(supabase),
  });

  try {
    const result = await tokenService.regenerate(params.id);
    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    if (err instanceof TokenServiceError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Erro ao regerar token" }, { status: 500 });
  }
}
