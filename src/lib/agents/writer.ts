import { generateObject } from "ai";
import { insightsBriefSchema, type InsightsBrief, type MarketAnalysis } from "./types";
import type { AgentPayload } from "@/lib/screener/agent-payload";
import type { LanguageModel } from "ai";

export class WriterError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "WriterError";
  }
}

const MAX_BULLETS = 10;

export type GenerateObjectFn = (options: {
  model: LanguageModel;
  schema: typeof insightsBriefSchema;
  prompt: string;
}) => Promise<{ object: unknown }>;

export type WriterDeps = {
  llm: LanguageModel;
  generateObject?: GenerateObjectFn;
};

export function createWriterAgent(deps: WriterDeps) {
  const doGenerate =
    deps.generateObject ?? (generateObject as unknown as GenerateObjectFn);

  return {
    async run(input: {
      analysis: MarketAnalysis;
      payload: AgentPayload;
    }): Promise<InsightsBrief> {
      const { analysis, payload } = input;
      const prompt = buildWriterPrompt(analysis, payload);

      let result;
      try {
        result = await doGenerate({
          model: deps.llm,
          schema: insightsBriefSchema,
          prompt,
        });
      } catch (err) {
        throw new WriterError(
          `Falha ao gerar brief: ${err instanceof Error ? err.message : "erro desconhecido"}`,
        );
      }

      const raw = result.object as { bullets?: unknown };
      const bullets = Array.isArray(raw?.bullets) ? raw.bullets.slice(0, MAX_BULLETS) : [];

      const parsed = insightsBriefSchema.safeParse({ bullets });
      if (!parsed.success) {
        throw new WriterError("Brief do LLM não validou o schema esperado");
      }

      return parsed.data;
    },
  };
}

function buildWriterPrompt(analysis: MarketAnalysis, payload: AgentPayload): string {
  const dores = analysis.dores
    .map(
      (d) =>
        `- ${d.dimensao}: ${d.dor} (evidência de mercado: ${d.evidencia_mercado ? "sim" : "não"}, confiança ${d.confianca})`,
    )
    .join("\n");

  const concorrentes =
    analysis.contexto_concorrentes.length === 0
      ? "(sem contexto de concorrentes)"
      : analysis.contexto_concorrentes
          .map((c) => `- ${c.nome}: ${c.contexto}`)
          .join("\n");

  return [
    "Você é um redator comercial. A partir da análise de mercado abaixo, escreva um brief de insights para a reunião comercial com o lead.",
    "Regras: no máximo 10 bullets, em português do Brasil, linguagem clara e objetiva para um comercial (não-técnico).",
    "Cada bullet deve ter uma prioridade entre 'alta', 'media' e 'baixa', baseada na dor da empresa combinada com a evidência de mercado.",
    "",
    `## Empresa: ${payload.empresa.nome ?? "não informada"}`,
    "",
    "## Análise",
    `Resumo: ${analysis.resumo}`,
    "",
    "### Dores",
    dores,
    "",
    "### Contexto de concorrentes",
    concorrentes,
    "",
    "Responda estritamente em JSON no formato definido pelo schema.",
  ].join("\n");
}
