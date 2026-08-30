import { generateText, Output } from "ai";
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

function extractJson(text: string): unknown {
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fenced) {
      try {
        return JSON.parse(fenced[1].trim());
      } catch {
        /* fallthrough */
      }
    }
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(trimmed.slice(start, end + 1));
      } catch {
        /* fallthrough */
      }
    }
    throw new WriterError("Resposta do LLM não contém JSON válido");
  }
}

export function createWriterAgent(deps: WriterDeps) {
  return {
    async run(input: {
      analysis: MarketAnalysis;
      payload: AgentPayload;
    }): Promise<InsightsBrief> {
      const { analysis, payload } = input;
      const prompt = buildWriterPrompt(analysis, payload);

      let raw: { bullets?: unknown };
      if (deps.generateObject) {
        try {
          const result = await deps.generateObject({
            model: deps.llm,
            schema: insightsBriefSchema,
            prompt,
          });
          raw = result.object as { bullets?: unknown };
        } catch (err) {
          throw new WriterError(
            `Falha ao gerar brief: ${err instanceof Error ? err.message : "erro desconhecido"}`,
          );
        }
      } else {
        raw = await generateWriterObject(deps.llm, prompt);
      }

      const bullets = Array.isArray(raw?.bullets) ? raw.bullets.slice(0, MAX_BULLETS) : [];

      const parsed = insightsBriefSchema.safeParse({ bullets });
      if (!parsed.success) {
        throw new WriterError("Brief do LLM não validou o schema esperado");
      }

      return parsed.data;
    },
  };
}

async function generateWriterObject(
  llm: LanguageModel,
  prompt: string,
): Promise<{ bullets?: unknown }> {
  try {
    const { output } = await generateText({
      model: llm,
      prompt,
      output: Output.object({ schema: insightsBriefSchema }),
    });
    return output as { bullets?: unknown };
  } catch {
    const { text } = await generateText({ model: llm, prompt });
    const parsed = extractJson(text) as { bullets?: unknown };
    if (Array.isArray(parsed?.bullets)) return parsed;
    throw new WriterError("Resposta do LLM não contém campo bullets");
  }
}

const WRITER_JSON_EXAMPLE = {
  bullets: [
    {
      texto: "A empresa ainda não tem um dono definido para os dados críticos, enquanto o mercado já trata isso como pré-requisito.",
      prioridade: "alta",
    },
  ],
};

const WRITER_OUTPUT_SCHEMA_HINT = JSON.stringify(
  {
    type: "object",
    properties: {
      bullets: {
        type: "array",
        maxItems: 10,
        items: {
          type: "object",
          properties: {
            texto: { type: "string" },
            prioridade: { type: "string", enum: ["alta", "media", "baixa"] },
          },
          required: ["texto", "prioridade"],
        },
      },
    },
    required: ["bullets"],
  },
  null,
  2,
);

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
    "## Formato de saída",
    "Responda APENAS com JSON válido (sem markdown, sem texto antes/depois), no seguinte schema:",
    "```json",
    WRITER_OUTPUT_SCHEMA_HINT,
    "```",
    "Exemplo do formato esperado:",
    "```json",
    JSON.stringify(WRITER_JSON_EXAMPLE, null, 2),
    "```",
    "A prioridade 'alta' deve ser usada quando a dor é ao mesmo tempo forte na empresa E confirmada pelo mercado.",
  ].join("\n");
}
