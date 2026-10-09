import { NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase/server";
import { requireManager, unauthorized } from "@/lib/auth/guard";
import { verifyInternalApiKey } from "@/lib/auth/internal-key";
import { SCREENER_CONTRACT } from "@/lib/screener/contract";
import { createLeadRepository } from "@/lib/repository/lead-repo";
import { createAssessmentRepository } from "@/lib/repository/assessment-repo";
import { createMarketInsightsRepository } from "@/lib/repository/market-insights-repo";
import { createShareTokenRepository } from "@/lib/repository/share-token-repo";
import { createPortalService, PortalServiceError, logPortalError } from "@/lib/service/portal-service";

function buildService() {
  const supabase = getServiceClient();
  return createPortalService({
    leadRepo: createLeadRepository(supabase),
    assessmentRepo: createAssessmentRepository(supabase),
    marketInsightsRepo: createMarketInsightsRepository(supabase),
    shareTokenRepo: createShareTokenRepository(supabase),
    contract: SCREENER_CONTRACT,
  });
}

export async function POST(
  req: Request,
  { params }: { params: { leadId: string } },
) {
  if (!verifyInternalApiKey(req)) {
    return NextResponse.json({ error: "Chave interna inválida" }, { status: 401 });
  }
  const manager = await requireManager(req);
  if (!manager) return unauthorized();

  const { leadId } = params;
  if (!leadId) {
    return NextResponse.json({ error: "leadId obrigatório" }, { status: 400 });
  }

  try {
    const { url, expiresAt } = await buildService().createShareToken(leadId);
    return NextResponse.json({ url, expiresAt }, { status: 200 });
  } catch (err) {
    if (err instanceof PortalServiceError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    logPortalError("createShareToken", leadId, err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: { leadId: string } },
) {
  if (!verifyInternalApiKey(req)) {
    return NextResponse.json({ error: "Chave interna inválida" }, { status: 401 });
  }
  const manager = await requireManager(req);
  if (!manager) return unauthorized();

  const { leadId } = params;
  if (!leadId) {
    return NextResponse.json({ error: "leadId obrigatório" }, { status: 400 });
  }

  try {
    await buildService().revokeShareToken(leadId);
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err) {
    if (err instanceof PortalServiceError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    logPortalError("revokeShareToken", leadId, err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
