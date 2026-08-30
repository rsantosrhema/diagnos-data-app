import type { AgentPayload } from "@/lib/screener/agent-payload";
import type { Exa } from "exa-js";
import type {
  MarketResearch,
  ResearchResult,
  ResearchSection,
} from "./types";

type SectionKey = ResearchSection["key"];

function buildQueries(payload: AgentPayload): { key: SectionKey; query: string }[] {
  const { segmento, faturamento, funcionarios, nome } = payload.empresa;

  const queries: { key: SectionKey; query: string }[] = [
    {
      key: "segmento",
      query: `Problemas de maturidade de dados no segmento ${segmento ?? "de mercado"} — data maturity challenges in the ${segmento ?? "market"} segment`,
    },
    {
      key: "faturamento",
      query: faturamento
        ? `Desafios de gestão de dados para empresas com faturamento ${faturamento} — data management challenges for companies with revenue ${faturamento}`
        : `Desafios de gestão de dados para empresas por faixa de faturamento — data management challenges for companies by revenue range`,
    },
    {
      key: "porte",
      query: funcionarios
        ? `Problemas de dados em empresas de ${funcionarios} funcionários — data problems in companies with ${funcionarios} employees`
        : `Problemas de dados em empresas por porte de funcionários — data problems in companies by employee headcount`,
    },
  ];

  if (nome) {
    queries.push({
      key: "concorrentes",
      query: `${nome} concorrentes análise de dados — ${nome} competitors data analytics`,
    });
  }

  return queries;
}

function mapResult(result: {
  title: string | null;
  url: string;
  highlights?: string[];
}): ResearchResult {
  return {
    title: result.title ?? "",
    url: result.url,
    snippet: result.highlights?.join(" ") ?? "",
  };
}

function buildSection(
  key: SectionKey,
  query: string,
  status: "ok" | "erro",
  results: ResearchResult[],
  error?: string,
): ResearchSection {
  return { key, query, results, status, ...(error ? { error } : {}) };
}

export function createResearcherAgent({ exa }: { exa: Pick<Exa, "search"> }) {
  return {
    async run(payload: AgentPayload): Promise<MarketResearch> {
      const queries = buildQueries(payload);

      const settled = await Promise.allSettled(
        queries.map(({ query }) =>
          exa.search(query, {
            type: "auto",
            numResults: 5,
            contents: { highlights: true },
          }),        ),
      );

      const sections: ResearchSection[] = queries.map(({ key, query }, index) => {
        const outcome = settled[index];
        if (outcome.status === "rejected") {
          return buildSection(key, query, "erro", [], String(outcome.reason));
        }
        const results = outcome.value.results.map(mapResult);
        return buildSection(key, query, "ok", results);
      });

      const sources = [
        ...new Set(sections.flatMap((s) => s.results.map((r) => r.url))),
      ];

      return {
        empresa: { ...payload.empresa },
        sections,
        sources,
      };
    },
  };
}
