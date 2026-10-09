import { NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase/server";
import { requireManager, unauthorized } from "@/lib/auth/guard";
import { verifyInternalApiKey } from "@/lib/auth/internal-key";
import { createLeadRepository } from "@/lib/repository/lead-repo";
import { createAssessmentRepository } from "@/lib/repository/assessment-repo";
import { createMarketInsightsRepository } from "@/lib/repository/market-insights-repo";
import { createAnalysisQueueRepository } from "@/lib/repository/analysis-queue-repo";
import { createAdminService, AdminServiceError } from "@/lib/service/admin-service";
import { generateScreenerPdf } from "@/lib/report/report-generator";

export async function GET(
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

  const supabase = getServiceClient();
  const queueRepo = createAnalysisQueueRepository(supabase);

  const adminService = createAdminService({
    leadRepo: createLeadRepository(supabase),
    assessmentRepo: createAssessmentRepository(supabase),
    marketInsightsRepo: createMarketInsightsRepository(supabase),
    queueRepo,
    logLoader: async () => [],
    analysisService: {
      enqueue: async (id: string) => queueRepo.enqueue(id),
    },
    generatePdf: generateScreenerPdf,
  });

  try {
    const { pdf, filename } = await adminService.getReportPdf(leadId);
    return new NextResponse(new Uint8Array(pdf), {
      status: 200,
      headers: {
        "content-type": "application/pdf",
        "content-disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (err) {
    if (err instanceof AdminServiceError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
