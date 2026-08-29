import { NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase/server";
import { verifyInternalApiKey } from "@/lib/auth/internal-key";
import { createAssessmentRepository } from "@/lib/repository/assessment-repo";
import { createMarketInsightsRepository } from "@/lib/repository/market-insights-repo";
import { createAnalysisQueueRepository } from "@/lib/repository/analysis-queue-repo";
import { createAnalysisService } from "@/lib/service/analysis-service";
import type { AgentPayload } from "@/lib/screener/agent-payload";

const MAX_JOBS_PER_RUN = 5;

export async function POST(req: Request) {
  if (!verifyInternalApiKey(req)) {
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
  });

  let processed = 0;
  for (let i = 0; i < MAX_JOBS_PER_RUN; i++) {
    const { processed: didProcess } = await analysisService.processNext();
    if (!didProcess) break;
    processed++;
  }

  return NextResponse.json({ ok: true, processed }, { status: 200 });
}
