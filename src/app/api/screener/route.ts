import { NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase/server";
import { screenerSubmissionSchema } from "@/lib/schemas/screener";
import { verifyInternalApiKey } from "@/lib/auth/internal-key";
import { readLeadFromSession } from "@/lib/auth/session";
import { createLeadRepository } from "@/lib/repository/lead-repo";
import { createAssessmentRepository } from "@/lib/repository/assessment-repo";
import { createScoringConfigRepository } from "@/lib/repository/scoring-config-repo";
import { createScoringConfigService } from "@/lib/service/scoring-config-service";
import { createScreenService, ScreenServiceError } from "@/lib/service/screen-service";
import { createAnalysisService } from "@/lib/service/analysis-service";
import { createAnalysisQueueRepository } from "@/lib/repository/analysis-queue-repo";
import { createMarketInsightsRepository } from "@/lib/repository/market-insights-repo";
import { SCREENER_CONTRACT } from "@/lib/screener/contract";
import type { AgentPayload } from "@/lib/screener/agent-payload";

export async function POST(req: Request) {
  if (!verifyInternalApiKey(req)) {
    return NextResponse.json({ error: "Chave interna inválida" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const parsed = screenerSubmissionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Dados inválidos", issues: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const session = await readLeadFromSession(req);
  const isMaster = session?.isMaster ?? false;

  const supabase = getServiceClient();
  const configRepo = createScoringConfigRepository(supabase);
  const configService = createScoringConfigService({ configRepo });
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
      const assessmentRepo = createAssessmentRepository(supabase);
      const row = await assessmentRepo.findByLeadId(leadId);
      if (!row) return null;
      const candidate = row.agent_payload;
      if (!candidate || typeof candidate !== "object" || candidate === null) {
        return null;
      }
      return candidate as AgentPayload;
    },
  });
  const screenService = createScreenService({
    leadRepo: createLeadRepository(supabase),
    assessmentRepo: createAssessmentRepository(supabase),
    contract: SCREENER_CONTRACT,
    loadActiveCalibration: () => configService.loadActiveCalibration(),
    enqueueAnalysis: analysisService.enqueue,
  });

  try {
    const result = await screenService.submitScreener(parsed.data, { isMaster });
    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    if (err instanceof ScreenServiceError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
