import { NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase/server";
import { verifyInternalApiKey } from "@/lib/auth/internal-key";
import { SCREENER_CONTRACT } from "@/lib/screener/contract";
import { createLeadRepository } from "@/lib/repository/lead-repo";
import { createAssessmentRepository } from "@/lib/repository/assessment-repo";
import { createMarketInsightsRepository } from "@/lib/repository/market-insights-repo";
import { createShareTokenRepository } from "@/lib/repository/share-token-repo";
import { createPortalService, PortalServiceError, logPortalError } from "@/lib/service/portal-service";

const GENERIC_NOT_FOUND = "Link inválido ou expirado";

export async function GET(
  req: Request,
  { params }: { params: { token: string } },
) {
  if (!verifyInternalApiKey(req)) {
    return NextResponse.json({ error: "Chave interna inválida" }, { status: 401 });
  }

  const { token } = params;
  if (!token) {
    return NextResponse.json({ error: GENERIC_NOT_FOUND }, { status: 404 });
  }

  const supabase = getServiceClient();
  const portalService = createPortalService({
    leadRepo: createLeadRepository(supabase),
    assessmentRepo: createAssessmentRepository(supabase),
    marketInsightsRepo: createMarketInsightsRepository(supabase),
    shareTokenRepo: createShareTokenRepository(supabase),
    contract: SCREENER_CONTRACT,
  });

  try {
    const result = await portalService.getByToken(token);
    return NextResponse.json(result, { status: 200 });
  } catch (err) {
    if (err instanceof PortalServiceError) {
      return NextResponse.json({ error: GENERIC_NOT_FOUND }, { status: 404 });
    }
    logPortalError("getByToken", token, err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
