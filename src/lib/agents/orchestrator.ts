import type { AgentPayload } from "@/lib/screener/agent-payload";
import type {
  InsightsBrief,
  MarketAnalysis,
  MarketResearch,
} from "./types";

export interface AgentOutput {
  research: MarketResearch;
  analysis: MarketAnalysis;
  insights: InsightsBrief;
}

export function createAgentOrchestrator(deps: {
  researcher: { run(payload: AgentPayload): Promise<MarketResearch> };
  analyst: {
    run(input: { research: MarketResearch; payload: AgentPayload }): Promise<MarketAnalysis>;
  };
  writer: {
    run(input: { analysis: MarketAnalysis; payload: AgentPayload }): Promise<InsightsBrief>;
  };
}) {
  return {
    async run(payload: AgentPayload): Promise<AgentOutput> {
      const research = await deps.researcher.run(payload);
      const analysis = await deps.analyst.run({ research, payload });
      const insights = await deps.writer.run({ analysis, payload });
      return { research, analysis, insights };
    },
  };
}
