import { describe, it, expect, beforeAll } from "vitest";
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
import { createLeadRepository } from "@/lib/repository/lead-repo";
import { createAssessmentRepository } from "@/lib/repository/assessment-repo";
import { createMarketInsightsRepository } from "@/lib/repository/market-insights-repo";
import { createAnalysisQueueRepository } from "@/lib/repository/analysis-queue-repo";
import { createAnalysisService } from "@/lib/service/analysis-service";
import { createAgentOrchestrator } from "@/lib/agents/orchestrator";
import { createResearcherAgent } from "@/lib/agents/researcher";
import { createAnalystAgent } from "@/lib/agents/analyst";
import { createWriterAgent } from "@/lib/agents/writer";
import { getLlmModel } from "@/lib/agents/llm";
import { getEnv } from "@/lib/env";
import { Exa } from "exa-js";

config({ path: ".env.local" });

const DIMS = ["d01","d02","d03","d04","d05","d06","d07","d08","d09","d10"];

function assertEnv(vars: string[]): void {
  const missing = vars.filter((v) => !process.env[v]);
  if (missing.length > 0) {
    throw new Error(`SMOKE E2E: envs ausentes no .env.local: ${missing.join(", ")}`);
  }
}

async function buildPipeline() {
  const env = getEnv();
  const llm = getLlmModel();
  const exa = new Exa(env.EXA_API_KEY);

  return createAgentOrchestrator({
    researcher: createResearcherAgent({ exa }),
    analyst: createAnalystAgent({ llm }),
    writer: createWriterAgent({ llm }),
  });
}

describe("Smoke E2E — fluxo real (Supabase + Resend + Exa + LLM)", () => {
  beforeAll(() => {
    assertEnv([
      "NEXT_PUBLIC_SUPABASE_URL",
      "SUPABASE_SERVICE_ROLE_KEY",
      "INTERNAL_API_KEY",
      "MANAGER_NOTIFICATION_EMAIL",
      "RESEND_API_KEY",
      "EXA_API_KEY",
      "LLM_BASE_URL",
      "LLM_API_KEY",
    ]);
  });

  it(
    "empresa de teste: submit → worker → market_insights analisado",
    async () => {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
      const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
      const supabase = createClient(url, serviceKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      });

      const leadRepo = createLeadRepository(supabase);
      const assessmentRepo = createAssessmentRepository(supabase);
      const insightsRepo = createMarketInsightsRepository(supabase);
      const queueRepo = createAnalysisQueueRepository(supabase);

      // 1. Cria lead de teste único
      const suffix = randomUUID().slice(0, 8);
      const email = `smoke-${suffix}@diagnos.test`;
      const company = `Empresa Teste ${suffix}`;
      await leadRepo.create({
        name: "Ana Teste",
        company,
        phone: "",
        email,
        role: "CTO",
      });

      const lead = await leadRepo.findByEmail(email);
      if (!lead) throw new Error("lead não criado");
      const leadId = lead.id;

      // 2. Gera token (usa repositório de tokens) e cria sessão
      const tokenRepo = (await import("@/lib/repository/token-repo")).createTokenRepository(supabase);
      const sessionRepo = (await import("@/lib/repository/session-repo")).createSessionRepository(supabase);
      const { generateToken, hashToken, createSessionToken, hashSessionToken } =
        await import("@/lib/auth/token");

      const token = generateToken();
      const expiresAt = new Date(Date.now() + 20 * 60 * 1000).toISOString();
      const tokenRow = await tokenRepo.create({
        leadId,
        tokenHash: hashToken(token),
        expiresAt,
      });
      if (!tokenRow) throw new Error("token não criado");
      await leadRepo.updateStatus(leadId, "token_gerado");

      const sessionToken = createSessionToken();
      await sessionRepo.create({
        tokenHash: hashSessionToken(sessionToken),
        leadId,
        expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
      });

      // 3. Monta payload de agentes (simula o que o submitScreener persistiria)
      const { buildAgentPayload } = await import("@/lib/screener/agent-payload");
      const { computeScores } = await import("@/lib/screener/scoring");
      const { SCREENER_CONTRACT } = await import("@/lib/screener/contract");
      const answers = DIMS.map((id, i) => ({
        dimensionId: id,
        nivel: [2, 2, 3, 1, 2, 3, 1, 2, 1, 2][i],
      }));
      const profile = {
        perfil_01: "Indústria",
        perfil_02: "51 a 200",
        perfil_03: "R$ 5 a 50 milhões",
      };
      const result = computeScores(SCREENER_CONTRACT, answers, {}, "CTO");

      const agentPayload = buildAgentPayload({
        contract: SCREENER_CONTRACT,
        respondent: { name: "Ana Teste", role: "CTO" },
        company: { name: company, size: "51 a 200" },
        profileAnswers: profile,
        contextAnswers: {},
        dimensionAnswers: answers,
        commercialAnswer: "Até R$ 50 mil",
        result,
        consent: { accepted: true, text: "Autorizo", acceptedAt: new Date().toISOString() },
      });

      // 4. Persiste agent_payload (como o submit faria)
      await assessmentRepo.createAssessmentResponse({
        leadId,
        context: {},
        profile,
        answers,
        commercialAnswer: "Até R$ 50 mil",
        consent: { accepted: true, text: "Autorizo", acceptedAt: new Date().toISOString() },
        agentPayload,
      });
      await assessmentRepo.createDiagnostic({
        leadId,
        overallScore: result.score,
        overallLevel: 2,
        dimensionScores: result.dimensionScores,
        narrative: { faixa: result.band.rotulo, descricao: result.band.descricao },
        chartData: result.dimensionScores.map((d) => ({ dimension: d.name, score: d.nivel })),
      });
      await leadRepo.updateStatus(leadId, "concluido");

      // 5. Enfileira e processa via worker (serviços reais)
      const analysisService = createAnalysisService({
        queueRepo,
        insightsRepo,
        orchestrator: await buildPipeline(),
        payloadLoader: async (id: string) => {
          const row = await assessmentRepo.findByLeadId(id);
          if (!row) return null;
          return row.agent_payload as never;
        },
      });

      await analysisService.enqueue(leadId);
      const resultWorker = await analysisService.processNext();

      // 6. Verifica market_insights
      const insight = await insightsRepo.findByLeadId(leadId);
      expect(resultWorker).toEqual({ processed: true });
      expect(insight).not.toBeNull();
      expect(insight?.status).toBe("analisado");

      const research = insight?.research as { sources?: string[] };
      const analysis = insight?.analysis as { dores?: unknown[]; resumo?: string };
      const brief = insight?.insights as { bullets?: unknown[] };

      expect(Array.isArray(research?.sources)).toBe(true);
      expect((research?.sources ?? []).length).toBeGreaterThan(0);
      expect(Array.isArray(analysis?.dores)).toBe(true);
      expect((analysis?.dores ?? []).length).toBeGreaterThan(0);
      expect(typeof analysis?.resumo).toBe("string");
      expect(Array.isArray(brief?.bullets)).toBe(true);
      expect((brief?.bullets ?? []).length).toBeGreaterThan(0);
      expect((brief?.bullets ?? [])[0]).toHaveProperty("prioridade");

      console.log(
        `SMOKE OK — lead=${leadId} status=${insight?.status} sources=${research?.sources?.length} dores=${analysis?.dores?.length} bullets=${brief?.bullets?.length}`,
      );
    },
    300_000,
  );
});
