import { NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase/server";
import { requireManager, unauthorized } from "@/lib/auth/guard";
import { verifyInternalApiKey } from "@/lib/auth/internal-key";
import { createLeadRepository } from "@/lib/repository/lead-repo";
import { createAssessmentRepository } from "@/lib/repository/assessment-repo";
import { createMarketInsightsRepository } from "@/lib/repository/market-insights-repo";
import { createAnalysisQueueRepository } from "@/lib/repository/analysis-queue-repo";
import { createAdminService } from "@/lib/service/admin-service";
import type { AdminLogEntryDTO } from "@/lib/dto/admin";

export async function GET(req: Request) {
  if (!verifyInternalApiKey(req)) {
    return NextResponse.json({ error: "Chave interna inválida" }, { status: 401 });
  }
  const manager = await requireManager(req);
  if (!manager) return unauthorized();

  const supabase = getServiceClient();
  const queueRepo = createAnalysisQueueRepository(supabase);

  const adminService = createAdminService({
    leadRepo: createLeadRepository(supabase),
    assessmentRepo: createAssessmentRepository(supabase),
    marketInsightsRepo: createMarketInsightsRepository(supabase),
    queueRepo,
    analysisService: {
      enqueue: async (leadId: string) => queueRepo.enqueue(leadId),
    },
    logLoader: async (limit: number): Promise<AdminLogEntryDTO[]> => {
      const { data, error } = await supabase
        .from("analysis_job_logs")
        .select("lead_id, step, message, duration_ms, created_at")
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) throw error;

      const rows = data ?? [];
      const leadIds = [...new Set(rows.map((r) => r.lead_id as string))];
      const leadRepo = createLeadRepository(supabase);
      const names = new Map<string, string>();
      for (const id of leadIds) {
        const lead = await leadRepo.findNameAndEmail(id);
        if (lead) names.set(id, lead.name);
      }

      return rows.map((r) => ({
        leadId: r.lead_id as string,
        leadName: names.get(r.lead_id as string) ?? null,
        step: r.step as string,
        message: (r.message as string | null) ?? null,
        durationMs: (r.duration_ms as number | null) ?? null,
        createdAt: r.created_at as string,
      }));
    },
  });

  try {
    const result = await adminService.getDashboard();
    return NextResponse.json(result, { status: 200 });
  } catch {
    return NextResponse.json({ error: "Erro ao carregar dados" }, { status: 500 });
  }
}
