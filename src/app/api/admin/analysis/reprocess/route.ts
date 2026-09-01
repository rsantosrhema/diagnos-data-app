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

const WORKER_FETCH_TIMEOUT_MS = 4_000;

function getWorkerBaseUrl(req: Request): string {
  const envBase = process.env.NEXT_PUBLIC_APP_URL;
  if (envBase) return envBase.replace(/\/+$/, "");
  const proto = req.headers.get("x-forwarded-proto") ?? new URL(req.url).protocol.replace(":", "");
  const host = req.headers.get("host") ?? new URL(req.url).host;
  return `${proto}://${host}`;
}

async function dispatchWorker(req: Request): Promise<void> {
  const key = process.env.INTERNAL_API_KEY;
  if (!key) return;
  const url = `${getWorkerBaseUrl(req)}/api/analysis-worker`;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "x-internal-api-key": key },
      signal: AbortSignal.timeout(WORKER_FETCH_TIMEOUT_MS),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      console.error(
        `[reprocess] worker respondeu ${res.status}${detail ? `: ${detail}` : ""}`,
      );
    }
  } catch (err) {
    console.error("[reprocess] falha ao acionar worker:", err);
  }
}

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

  let result: { ok: true; queued: true } | undefined;
  try {
    result = await adminService.generateReport(parsed.data.leadId);
  } catch (err) {
    if (err instanceof AdminServiceError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }

  await dispatchWorker(req);
  return NextResponse.json(result, { status: 200 });
}
