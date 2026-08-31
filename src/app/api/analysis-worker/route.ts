import { NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase/server";
import { verifyInternalApiKey } from "@/lib/auth/internal-key";
import { createAssessmentRepository } from "@/lib/repository/assessment-repo";
import { createMarketInsightsRepository } from "@/lib/repository/market-insights-repo";
import { createAnalysisQueueRepository } from "@/lib/repository/analysis-queue-repo";
import { createLeadRepository } from "@/lib/repository/lead-repo";
import { createAnalysisService } from "@/lib/service/analysis-service";
import { generateScreenerPdf } from "@/lib/report/report-generator";
import { sendReportEmail } from "@/lib/email/send-report";
import type { AgentPayload } from "@/lib/screener/agent-payload";

const MAX_JOBS_PER_RUN = 5;

/** Tempo máximo que um job pode ficar na fila antes de ser marcado como falha. */
const MAX_STALE_MINUTES = 30;

function timingSafeEqualStr(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  const { createHash, timingSafeEqual } = require("node:crypto") as typeof import("node:crypto");
  return timingSafeEqual(
    createHash("sha256").update(a).digest(),
    createHash("sha256").update(b).digest(),
  );
}

export async function POST(req: Request) {
  if (!verifyInternalApiKey(req)) {
    // Vercel Cron sends the CRON_SECRET header; the internal key header is not
    // forwarded by the platform cron. Accept either the internal key (manual /
    // admin reprocess) or the cron secret (scheduled drain).
    const cronSecret = process.env.CRON_SECRET;
    const provided = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
    if (!cronSecret || !provided || !timingSafeEqualStr(provided, cronSecret)) {
      return NextResponse.json({ error: "Chave interna inválida" }, { status: 401 });
    }
  }

  const supabase = getServiceClient();
  const assessmentRepo = createAssessmentRepository(supabase);
  const queueRepo = createAnalysisQueueRepository(supabase);
  const insightsRepo = createMarketInsightsRepository(supabase);

  const analysisService = createAnalysisService({
    queueRepo,
    insightsRepo,
    orchestrator: {
      run: async (payload: AgentPayload) => {
        const { createAgentOrchestrator } = await import("@/lib/agents/orchestrator");
        const { createResearcherAgent } = await import("@/lib/agents/researcher");
        const { createAnalystAgent } = await import("@/lib/agents/analyst");
        const { createWriterAgent } = await import("@/lib/agents/writer");
        const { getLlmModel } = await import("@/lib/agents/llm");
        const { Exa } = await import("exa-js");
        const { getEnv } = await import("@/lib/env");

        const env = getEnv();
        const orchestrator = createAgentOrchestrator({
          researcher: createResearcherAgent({ exa: new Exa(env.EXA_API_KEY) }),
          analyst: createAnalystAgent({ llm: getLlmModel() }),
          writer: createWriterAgent({ llm: getLlmModel() }),
        });
        return orchestrator.run(payload);
      },
    },
    payloadLoader: async (leadId: string): Promise<AgentPayload | null> => {
      const row = await assessmentRepo.findByLeadId(leadId);
      if (!row) return null;
      const candidate = row.agent_payload;
      if (!candidate || typeof candidate !== "object" || candidate === null) {
        return null;
      }
      return candidate as AgentPayload;
    },
    leadRepo: createLeadRepository(supabase),
    generatePdf: generateScreenerPdf,
    sendEmail: sendReportEmail,
  });

  // Marca como falha jobs presos na fila por mais de MAX_STALE_MINUTES,
  // para não ficarem "pendente/processando" para sempre.
  let staleFailed = 0;
  try {
    staleFailed = await analysisService.failStale(MAX_STALE_MINUTES);
  } catch (err) {
    console.error("[analysis-worker] falha ao expirar jobs presos na fila:", err);
  }

  let processed = 0;
  for (let i = 0; i < MAX_JOBS_PER_RUN; i++) {
    const { processed: didProcess } = await analysisService.processNext();
    if (!didProcess) break;
    processed++;
  }

  return NextResponse.json({ ok: true, processed, staleFailed }, { status: 200 });
}
