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
import { agentPayloadSchema } from "@/lib/schemas/agent-payload";
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

function isAuthorized(req: Request): { ok: boolean; reason?: "internal" | "cron" | "missing-cron-secret" } {
  if (verifyInternalApiKey(req)) return { ok: true, reason: "internal" };

  const cronSecret = process.env.CRON_SECRET;
  const provided = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!cronSecret || !provided || !timingSafeEqualStr(provided, cronSecret)) {
    if (!cronSecret) return { ok: false, reason: "missing-cron-secret" };
    return { ok: false, reason: "internal" };
  }
  return { ok: true, reason: "cron" };
}

export async function POST(req: Request) {
  const auth = isAuthorized(req);
  if (!auth.ok) {
    if (auth.reason === "missing-cron-secret") {
      console.error(
        "[analysis-worker] CRON_SECRET não configurado — sem fallback de autorização para o cron.",
      );
      return NextResponse.json(
        { error: "Erro interno: CRON_SECRET não configurado" },
        { status: 500 },
      );
    }
    return NextResponse.json({ error: "Chave interna inválida" }, { status: 401 });
  }

  const supabase = getServiceClient();
  const assessmentRepo = createAssessmentRepository(supabase);
  const queueRepo = createAnalysisQueueRepository(supabase);
  const insightsRepo = createMarketInsightsRepository(supabase);

  const analysisService = createAnalysisService({
    queueRepo,
    insightsRepo,
    orchestrator: {
      research: async (payload: AgentPayload) => {
        const { createResearcherAgent } = await import("@/lib/agents/researcher");
        const { Exa } = await import("exa-js");
        const { getEnv } = await import("@/lib/env");
        const env = getEnv();
        return createResearcherAgent({ exa: new Exa(env.EXA_API_KEY) }).run(payload);
      },
      analyst: async (input: { research: unknown; payload: AgentPayload }) => {
        const { createAnalystAgent } = await import("@/lib/agents/analyst");
        const { getLlmModel } = await import("@/lib/agents/llm");
        return createAnalystAgent({ llm: getLlmModel() }).run(input as never);
      },
      writer: async (input: { analysis: unknown; payload: AgentPayload }) => {
        const { createWriterAgent } = await import("@/lib/agents/writer");
        const { getLlmModel } = await import("@/lib/agents/llm");
        return createWriterAgent({ llm: getLlmModel() }).run(input as never);
      },
    },
    payloadLoader: async (leadId: string): Promise<AgentPayload | null> => {
      const row = await assessmentRepo.findByLeadId(leadId);
      if (!row) return null;
      const candidate = row.agent_payload;
      if (!candidate || typeof candidate !== "object" || candidate === null) {
        return null;
      }
      const parsed = agentPayloadSchema.safeParse(candidate);
      if (!parsed.success) {
        console.error(
          `[analysis-worker] agent_payload inválido para lead ${leadId}:`,
          parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "),
        );
        return null;
      }
      return parsed.data;
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

export async function GET(req: Request) {
  const auth = isAuthorized(req);
  if (!auth.ok) {
    if (auth.reason === "missing-cron-secret") {
      return NextResponse.json(
        { ok: false, error: "CRON_SECRET não configurado" },
        { status: 200 },
      );
    }
    return NextResponse.json({ error: "Chave interna inválida" }, { status: 401 });
  }

  return NextResponse.json(
    {
      ok: true,
      envs: {
        llm: Boolean(process.env.LLM_BASE_URL && process.env.LLM_API_KEY),
        exa: Boolean(process.env.EXA_API_KEY),
        resend: Boolean(process.env.RESEND_API_KEY),
        cron: Boolean(process.env.CRON_SECRET),
      },
    },
    { status: 200 },
  );
}
