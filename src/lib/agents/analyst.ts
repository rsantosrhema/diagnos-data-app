import { generateText, Output } from "ai";
import { marketAnalysisSchema, type MarketAnalysis } from "./types";
import { loadSegmentSkill } from "./segment-skills";
import type { AgentPayload } from "@/lib/screener/agent-payload";
import type { LanguageModel } from "ai";

export class AnalystError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "AnalystError";
  }
}

const ANALYST_JSON_EXAMPLE = {
  resumo: "Síntese objetiva sobre a maturidade de dados da empresa frente ao mercado.",
  dores: [
    {
      dimensao_id: "d01",
      dimensao: "Governança e Responsabilidade",
      dor: "Descrição objetiva da dor em 1 frase.",
      evidencia_mercado: true,
      confianca: 0.7,
    },
  ],
  contexto_concorrentes: [
    { nome: "Concorrente X", contexto: "Como o concorrente atua nesse tema em 1 frase." },
  ],
};

const ANALYST_OUTPUT_SCHEMA_HINT = JSON.stringify(
  {
    type: "object",
    properties: {
      resumo: { type: "string" },
      dores: {
        type: "array",
        items: {
          type: "object",
          properties: {
            dimensao_id: { type: "string" },
            dimensao: { type: "string" },
            dor: { type: "string" },
            evidencia_mercado: { type: "boolean" },
            confianca: { type: "number" },
          },
          required: ["dimensao_id", "dimensao", "dor", "evidencia_mercado", "confianca"],
        },
      },
      contexto_concorrentes: {
        type: "array",
        items: {
          type: "object",
          properties: { nome: { type: "string" }, contexto: { type: "string" } },
          required: ["nome", "contexto"],
        },
      },
    },
    required: ["resumo", "dores", "contexto_concorrentes"],
  },
  null,
  2,
);

export type GenerateObjectFn = (options: {
  model: LanguageModel;
  schema: typeof marketAnalysisSchema;
  prompt: string;
}) => Promise<{ object: unknown }>;

export type AnalystDeps = {
  llm: LanguageModel;
  generateObject?: GenerateObjectFn;
  skillLoader?: typeof loadSegmentSkill;
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
    throw new AnalystError("Resposta do LLM não contém JSON válido");
  }
}

export function createAnalystAgent(deps: AnalystDeps) {
  const loadSkill = deps.skillLoader ?? loadSegmentSkill;

  return {
    async run(input: {
      research: MarketAnalysis extends never ? never : MarketResearchLike;
      payload: AgentPayload;
    }): Promise<MarketAnalysis> {
      const { research, payload } = input;
      const skill = loadSkill(payload.empresa.segmento ?? "");

      const prompt = buildAnalystPrompt(payload, research, skill);

      let object: unknown;
      if (deps.generateObject) {
        try {
          const result = await deps.generateObject({
            model: deps.llm,
            schema: marketAnalysisSchema,
            prompt,
          });
          object = result.object;
        } catch (err) {
          throw new AnalystError(
            `Falha ao gerar análise: ${err instanceof Error ? err.message : "erro desconhecido"}`,
          );
        }
      } else {
        object = await generateAnalystObject(deps.llm, prompt);
      }

      const parsed = marketAnalysisSchema.safeParse(object);
      if (!parsed.success) {
        throw new AnalystError("Análise do LLM não validou o schema esperado");
      }

      return parsed.data;
    },
  };
}

async function generateAnalystObject(
  llm: LanguageModel,
  prompt: string,
): Promise<unknown> {
  try {
    const { output } = await generateText({
      model: llm,
      prompt,
      output: Output.object({ schema: marketAnalysisSchema }),
    });
    return output;
  } catch {
    const { text } = await generateText({ model: llm, prompt });
    return extractJson(text);
  }
}

export type MarketResearchLike = {
  empresa: {
    segmento: string | null;
    faturamento: string | null;
    funcionarios: string | null;
    nome: string | null;
  };
  sections: {
    key: string;
    query: string;
    status: string;
    error?: string;
    results: { title: string; url: string; snippet: string }[];
  }[];
  sources: string[];
};

function buildAnalystPrompt(
  payload: AgentPayload,
  research: MarketResearchLike,
  skill: string,
): string {
  const scores = payload.respostas
    .map(
      (r) =>
        `- ${r.dimensao} (${r.dimensao_id}): nível ${r.nivel}, peso ${r.peso} — "${r.resposta}"`,
    )
    .join("\n");

  const evidencias = research.sections
    .map((s) => {
      const head = `### ${s.key} — ${s.query}\n${s.status === "erro" ? `(pesquisa falhou: ${s.error ?? "desconhecido"})` : ""}`;
      const itens = s.results.map((r) => `- ${r.title} (${r.url}): ${r.snippet}`).join("\n");
      return `${head}\n${itens}`;
    })
    .join("\n\n");

  return [
    "Você é um analista de mercado de maturidade de dados. Correlacione os scores do diagnóstico da empresa com as evidências de mercado pesquisadas e com a skill de segmento, produzindo uma análise criteriosa da dor do lead.",
    "",
    "## Empresa",
    JSON.stringify(payload.empresa),
    "",
    "## Scores do diagnóstico",
    scores,
    "",
    `## Score geral: ${payload.score.valor} (${payload.score.faixa}) — ${payload.score.descricao}`,
    `Risco principal: ${payload.risco.dimensao_id} (nível ${payload.risco.nivel})`,
    `Desequilíbrio: ${payload.desequilibrio ? "sim" : "não"}`,
    "",
    "## Skill de segmento",
    skill,
    "",
    "## Evidências de mercado",
    evidencias,
    "",
    "## Formato de saída",
    "Responda APENAS com JSON válido (sem markdown, sem texto antes/depois), no seguinte schema:",
    "```json",
    ANALYST_OUTPUT_SCHEMA_HINT,
    "```",
    "Exemplo do formato esperado:",
    "```json",
    JSON.stringify(ANALYST_JSON_EXAMPLE, null, 2),
    "```",
    "A `confianca` deve ser um número entre 0 e 1. `evidencia_mercado` deve ser `true` somente se a dor foi confirmada nas evidências de mercado.",
  ].join("\n");
}
