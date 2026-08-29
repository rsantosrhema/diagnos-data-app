import { generateObject } from "ai";
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

export type AnalystDeps = {
  llm: LanguageModel;
  generateObject?: typeof generateObject;
  skillLoader?: typeof loadSegmentSkill;
};

export function createAnalystAgent(deps: AnalystDeps) {
  const doGenerate = deps.generateObject ?? generateObject;
  const loadSkill = deps.skillLoader ?? loadSegmentSkill;

  return {
    async run(input: {
      research: MarketAnalysis extends never ? never : MarketResearchLike;
      payload: AgentPayload;
    }): Promise<MarketAnalysis> {
      const { research, payload } = input;
      const skill = loadSkill(payload.empresa.segmento ?? "");

      const prompt = buildAnalystPrompt(payload, research, skill);

      let result;
      try {
        result = await doGenerate({
          model: deps.llm,
          schema: marketAnalysisSchema,
          prompt,
        });
      } catch (err) {
        throw new AnalystError(
          `Falha ao gerar análise: ${err instanceof Error ? err.message : "erro desconhecido"}`,
        );
      }

      const parsed = marketAnalysisSchema.safeParse(result.object);
      if (!parsed.success) {
        throw new AnalystError("Análise do LLM não validou o schema esperado");
      }

      return parsed.data;
    },
  };
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
    "Responda estritamente em JSON no formato definido pelo schema.",
  ].join("\n");
}
