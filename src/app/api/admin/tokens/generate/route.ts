import { NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase/server";
import { generateTokenSchema } from "@/lib/schemas/token";
import { requireManager, unauthorized } from "@/lib/auth/guard";
import { verifyInternalApiKey } from "@/lib/auth/internal-key";
import { createTokenRepository } from "@/lib/repository/token-repo";
import { createLeadRepository } from "@/lib/repository/lead-repo";
import { createSessionRepository } from "@/lib/repository/session-repo";
import { createTokenService, TokenServiceError } from "@/lib/service/token-service";

export async function POST(req: Request) {
  if (!verifyInternalApiKey(req)) {
    return NextResponse.json({ error: "Chave interna inválida" }, { status: 401 });
  }
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
  const tokenService = createTokenService({
    tokenRepo: createTokenRepository(supabase),
    leadRepo: createLeadRepository(supabase),
    sessionRepo: createSessionRepository(supabase),
  });

  try {
    const result = await tokenService.generateForLead(parsed.data.leadId);
    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    if (err instanceof TokenServiceError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Erro ao gerar token" }, { status: 500 });
  }
}
