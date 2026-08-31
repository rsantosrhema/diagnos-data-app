import { NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase/server";
import { requireManager, unauthorized } from "@/lib/auth/guard";
import { verifyInternalApiKey } from "@/lib/auth/internal-key";
import { createLeadRepository } from "@/lib/repository/lead-repo";
import { createAssessmentRepository } from "@/lib/repository/assessment-repo";
import { createMarketInsightsRepository } from "@/lib/repository/market-insights-repo";
import { createAnalysisQueueRepository } from "@/lib/repository/analysis-queue-repo";
import { createAnalysisService } from "@/lib/service/analysis-service";
import { createAdminService } from "@/lib/service/admin-service";

export async function GET(req: Request) {
  if (!verifyInternalApiKey(req)) {
    return NextResponse.json({ error: "Chave interna inválida" }, { status: 401 });
  }
  const manager = await requireManager(req);
  if (!manager) return unauthorized();

  const supabase = getServiceClient();
  const adminService = createAdminService({
    leadRepo: createLeadRepository(supabase),
    assessmentRepo: createAssessmentRepository(supabase),
    marketInsightsRepo: createMarketInsightsRepository(supabase),
    analysisService: createAnalysisService({
      queueRepo: createAnalysisQueueRepository(supabase),
      insightsRepo: createMarketInsightsRepository(supabase),
      orchestrator: {
        run: async () => {
          throw new Error("orchestrator não usado no dashboard");
        },
      },
      payloadLoader: async () => null,
      leadRepo: createLeadRepository(supabase),
      generatePdf: async () => ({ pdf: Buffer.from(""), filename: "" }),
      sendEmail: async () => undefined,
    }),
  });

  try {
    const result = await adminService.getDashboard();
    return NextResponse.json(result, { status: 200 });
  } catch {
    return NextResponse.json({ error: "Erro ao carregar dados" }, { status: 500 });
  }
}
