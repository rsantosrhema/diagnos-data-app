import { describe, it, expect, beforeAll } from "vitest";
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { createLeadRepository } from "@/lib/repository/lead-repo";
import { createAssessmentRepository } from "@/lib/repository/assessment-repo";
import { createMarketInsightsRepository } from "@/lib/repository/market-insights-repo";
import { createAnalysisQueueRepository } from "@/lib/repository/analysis-queue-repo";
import { createAnalysisService } from "@/lib/service/analysis-service";
import { createCommercialAgent } from "@/lib/agents/commercial";
import { commercialArsenalSchema } from "@/lib/agents/commercial-types";
import { getLlmModel } from "@/lib/agents/llm";
import { generateScreenerPdf } from "@/lib/report/report-generator";
import { getEnv } from "@/lib/env";
import type { AgentPayload } from "@/lib/screener/agent-payload";
import type { MarketAnalysis, MarketResearch, InsightsBrief } from "@/lib/agents/types";
import type { CommercialArsenal } from "@/lib/agents/commercial-types";

config({ path: ".env.local" });

const DIMS = ["d01", "d02", "d03", "d04", "d05", "d06", "d07", "d08", "d09", "d10"];
const LEVELS = [4, 2, 5, 1, 2, 3, 1, 2, 1, 2];
const C_LEVEL = "C-level (CEO, CTO, CFO, CIO)";
const LOCAL_SUPABASE = /^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?/;

const runSmoke = process.env.RUN_ARSENAL_E2E === "1";

function assertEnv(vars: string[]): void {
  const missing = vars.filter((v) => !process.env[v]);
  if (missing.length > 0) {
    throw new Error(`ARSENAL SMOKE: envs ausentes: ${missing.join(", ")}`);
  }
}

function researchFixture(company: string): MarketResearch {
  return {
    empresa: {
      segmento: "Indústria",
      faturamento: "R$ 5 a 50 milhões",
      funcionarios: "51 a 200",
      nome: company,
    },
    sections: [],
    sources: [],
  };
}

function analysisFixture(): MarketAnalysis {
  return {
    resumo:
      "Indústria de médio porte com plataforma de dados em uso, mas decisões de priorização informais e dependência de poucas pessoas para conciliar números.",
    dores: [
      {
        dimensao_id: "d04",
        dimensao: "Qualidade de Dados",
        dor: "Cadastros duplicados entre sistemas e conciliação manual dos indicadores.",
        evidencia_mercado: true,
        confianca: 0.8,
      },
      {
        dimensao_id: "d07",
        dimensao: "Segurança e Conformidade (LGPD)",
        dor: "Controle de acesso informal e LGPD tratada apenas no papel.",
        evidencia_mercado: true,
        confianca: 0.7,
      },
      {
        dimensao_id: "d09",
        dimensao: "IA, Modelos e Analytics Avançado",
        dor: "Iniciativas de IA sem base de dados confiável e sem dono definido.",
        evidencia_mercado: false,
        confianca: 0.6,
      },
    ],
    contexto_concorrentes: [
      {
        nome: "Concorrente regional",
        contexto: "Estruturou governança e comitê de priorização de dados.",
      },
    ],
  };
}

function insightsFixture(): InsightsBrief {
  return {
    bullets: [
      { texto: "Definir dono formal por domínio de dados.", prioridade: "alta", titulo: "Governança com dono" },
      { texto: "Tratar cadastros duplicados antes de novos indicadores.", prioridade: "alta", titulo: "Qualidade primeiro" },
      { texto: "Formalizar controle de acesso e base legal na LGPD.", prioridade: "media", titulo: "Segurança e LGPD" },
      { texto: "Criar trilha de capacitação para autonomia analítica.", prioridade: "baixa", titulo: "Autonomia analítica" },
    ],
  };
}

describe.skipIf(!runSmoke)("Arsenal Comercial — smoke local com agente real (e-mail no-op)", () => {
  let outDir = "";

  beforeAll(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
    if (!LOCAL_SUPABASE.test(url)) {
      throw new Error("ARSENAL SMOKE: só roda contra o Supabase local");
    }
    assertEnv([
      "ARSENAL_OUT_DIR",
      "SUPABASE_SERVICE_ROLE_KEY",
      "LLM_BASE_URL",
      "LLM_API_KEY",
    ]);
    mkdirSync(process.env.ARSENAL_OUT_DIR as string, { recursive: true });
    outDir = process.env.ARSENAL_OUT_DIR as string;
  });

  async function seedScenario(
    scenario: string,
    commercial: (input: {
      payload: AgentPayload;
      analysis: MarketAnalysis;
      insights: InsightsBrief;
    }) => Promise<CommercialArsenal>,
  ) {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL as string,
      process.env.SUPABASE_SERVICE_ROLE_KEY as string,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );
    const leadRepo = createLeadRepository(supabase);
    const assessmentRepo = createAssessmentRepository(supabase);
    const insightsRepo = createMarketInsightsRepository(supabase);
    const queueRepo = createAnalysisQueueRepository(supabase);

    const suffix = randomUUID().slice(0, 8);
    const email = `arsenal-smoke-${scenario}-${suffix}@diagnos.test`;
    const company = `Empresa Arsenal ${suffix}`;
    await leadRepo.create({ name: "Ana Teste", company, phone: "", email, role: C_LEVEL });
    const lead = await leadRepo.findByEmail(email);
    if (!lead) throw new Error("ARSENAL SMOKE: lead não criado");
    const leadId = lead.id;

    const { buildAgentPayload } = await import("@/lib/screener/agent-payload");
    const { computeScores } = await import("@/lib/screener/scoring");
    const { SCREENER_CONTRACT } = await import("@/lib/screener/contract");
    const answers = DIMS.map((id, i) => ({ dimensionId: id, nivel: LEVELS[i] }));
    const profile = {
      perfil_01: "Indústria",
      perfil_02: "51 a 200",
      perfil_03: "R$ 5 a 50 milhões",
    };
    const commercialAnswer = "Entre R$ 250 mil e R$ 1 milhão";
    const consent = { accepted: true, text: "Autorizo", acceptedAt: new Date().toISOString() };
    const result = computeScores(SCREENER_CONTRACT, answers, {}, C_LEVEL);

    const agentPayload = buildAgentPayload({
      contract: SCREENER_CONTRACT,
      respondent: { name: "Ana Teste", role: C_LEVEL },
      company: { name: company, size: "51 a 200" },
      profileAnswers: profile,
      contextAnswers: {},
      dimensionAnswers: answers,
      commercialAnswer,
      result,
      consent,
    });

    await assessmentRepo.createAssessmentResponse({
      leadId,
      context: {},
      profile,
      answers,
      commercialAnswer,
      consent,
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

    const emailCalls = { count: 0 };
    const service = createAnalysisService({
      queueRepo,
      insightsRepo,
      orchestrator: {
        research: async () => researchFixture(company),
        analyst: async () => analysisFixture(),
        writer: async () => insightsFixture(),
        commercial,
      },
      payloadLoader: async (id: string) => {
        const row = await assessmentRepo.findByLeadId(id);
        if (!row) return null;
        const parsed = (await import("@/lib/schemas/agent-payload")).agentPayloadSchema.safeParse(
          row.agent_payload,
        );
        return parsed.success ? parsed.data : null;
      },
      leadRepo,
      generatePdf: async (input) => {
        const generated = await generateScreenerPdf(input);
        writeFileSync(join(outDir, `${scenario}.pdf`), generated.pdf);
        return generated;
      },
      sendEmail: async () => {
        emailCalls.count += 1;
      },
    });

    await service.enqueue(leadId);
    const processed = await service.processNext();
    const row = await insightsRepo.findByLeadId(leadId);
    const { data: logs, error: logsError } = await supabase
      .from("analysis_job_logs")
      .select("step, message")
      .eq("lead_id", leadId);
    if (logsError) throw logsError;

    return { leadId, processed, row, logs: logs ?? [], emailCalls };
  }

  it(
    "cenário real: o agente comercial gera e persiste o Arsenal no pipeline",
    async () => {
      const { leadId, processed, row, logs, emailCalls } = await seedScenario(
        "real",
        (input) => createCommercialAgent({ llm: getLlmModel() }).run(input),
      );

      expect(processed).toEqual({ processed: true });
      expect(row?.status).toBe("analisado");
      expect(commercialArsenalSchema.safeParse(row?.arsenal).success).toBe(true);
      expect(logs.some((log) => log.step === "arsenal")).toBe(true);
      expect(logs.some((log) => log.step === "arsenal_failed")).toBe(false);
      expect(emailCalls.count).toBe(1);

      writeFileSync(join(outDir, "real-arsenal.json"), JSON.stringify(row?.arsenal, null, 2));
      writeFileSync(join(outDir, "real-lead-id.txt"), leadId);
    },
    300_000,
  );

  it(
    "cenário de falha: o Arsenal cai, o PDF sai sem ele e o job segue analisado",
    async () => {
      const { processed, row, logs, emailCalls } = await seedScenario("failed", async () => {
        throw new Error("falha simulada");
      });

      expect(processed).toEqual({ processed: true });
      expect(row?.status).toBe("analisado");
      expect(row?.arsenal).toBeNull();
      const failed = logs.find((log) => log.step === "arsenal_failed");
      expect(failed?.message).toBe("falha simulada");
      expect(existsSync(join(outDir, "failed.pdf"))).toBe(true);
      expect(emailCalls.count).toBe(1);
    },
    300_000,
  );
});
