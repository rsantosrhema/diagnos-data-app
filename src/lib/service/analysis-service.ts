import type { AnalysisQueueRepository } from "@/lib/repository/analysis-queue-repo";
import type { MarketInsightsRepository } from "@/lib/repository/market-insights-repo";
import type { AgentPayload } from "@/lib/screener/agent-payload";
import type { AgentOutput } from "@/lib/agents/orchestrator";

export class AnalysisServiceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AnalysisServiceError";
  }
}

export interface AnalysisServiceDeps {
  queueRepo: AnalysisQueueRepository;
  insightsRepo: MarketInsightsRepository;
  orchestrator: { run(payload: AgentPayload): Promise<AgentOutput> };
  payloadLoader: (leadId: string) => Promise<AgentPayload | null>;
}

export function createAnalysisService(deps: AnalysisServiceDeps) {
  const { queueRepo, insightsRepo, orchestrator, payloadLoader } = deps;

  return {
    async enqueue(leadId: string): Promise<void> {
      try {
        await queueRepo.enqueue(leadId);
      } catch (err) {
        // AC INS-03: falha de enfileiramento nunca quebra o submit
        console.error(
          `[analysis-service] falha ao enfileirar análise para lead ${leadId}:`,
          err instanceof Error ? err.message : err,
        );
      }
    },

    async processNext(): Promise<{ processed: boolean }> {
      let job;
      try {
        job = await queueRepo.pop();
      } catch (err) {
        // infra: fila indisponível — não derruba o worker
        console.error("[analysis-service] falha ao popular job:", err);
        return { processed: false };
      }

      if (!job) return { processed: false };

      const leadId = job.leadId;

      try {
        const payload = await payloadLoader(leadId);
        if (!payload) {
          await insightsRepo.markStatus(
            leadId,
            "falha",
            "agent_payload não encontrado para o lead",
          );
          return { processed: true };
        }

        const agentOutput = await orchestrator.run(payload);
        await insightsRepo.upsert({
          leadId,
          research: agentOutput.research,
          analysis: agentOutput.analysis,
          insights: agentOutput.insights,
          sources: agentOutput.research.sources,
          status: "analisado",
        });

        return { processed: true };
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "erro desconhecido no pipeline";
        console.error(`[analysis-service] pipeline falhou para lead ${leadId}:`, message);
        try {
          await insightsRepo.markStatus(leadId, "falha", message);
        } catch (markErr) {
          console.error(
            `[analysis-service] falha ao marcar status do lead ${leadId}:`,
            markErr,
          );
        }
        return { processed: true };
      }
    },
  };
}
