import { NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase/server";
import { requireManager, unauthorized } from "@/lib/auth/guard";
import { verifyInternalApiKey } from "@/lib/auth/internal-key";
import { reprocessAnalysisSchema } from "@/lib/schemas/analysis";
import { createLeadRepository } from "@/lib/repository/lead-repo";
import { createAssessmentRepository } from "@/lib/repository/assessment-repo";
import { createMarketInsightsRepository } from "@/lib/repository/market-insights-repo";
import { createAnalysisQueueRepository } from "@/lib/repository/analysis-queue-repo";
import { createAdminService, AdminServiceError } from "@/lib/service/admin-service";
import type { AdminLogEntryDTO } from "@/lib/dto/admin";

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

  const parsed = reprocessAnalysisSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "leadId inválido" }, { status: 400 });
  }

  const supabase = getServiceClient();
  const queueRepo = createAnalysisQueueRepository(supabase);
  const insightsRepo = createMarketInsightsRepository(supabase);

  const adminService = createAdminService({
    leadRepo: createLeadRepository(supabase),
    assessmentRepo: createAssessmentRepository(supabase),
    marketInsightsRepo: insightsRepo,
    queueRepo,
    logLoader: async () => [],
    analysisService: {
      enqueue: async (leadId: string) => queueRepo.enqueue(leadId),
    },
  });

  try {
    const result = await adminService.generateReport(parsed.data.leadId);
    return NextResponse.json(result, { status: 200 });
  } catch (err) {
    if (err instanceof AdminServiceError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
