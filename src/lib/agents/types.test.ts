import { describe, it, expect } from "vitest";
import {
  marketResearchSchema,
  marketAnalysisSchema,
  insightsBriefSchema,
  researchSectionSchema,
  researchResultSchema,
  analysisPainSchema,
  competitorContextSchema,
  insightBulletSchema,
  type MarketResearch,
  type MarketAnalysis,
  type InsightsBrief,
} from "./types";

const RESEARCH_RESULT = {
  title: "Pain points de dados na Indústria",
  url: "https://exemplo.com/industria",
  snippet: "Problemas de qualidade de dados...",
};

const RESEARCH_SECTION = {
  key: "segmento" as const,
  query: "maturidade de dados indústria pt OR en",
  results: [RESEARCH_RESULT],
  status: "ok" as const,
};

const MARKET_RESEARCH: MarketResearch = {
  empresa: {
    segmento: "Indústria",
    faturamento: "R$ 5 a 50 milhões",
    funcionarios: "51 a 200",
    nome: "Corp LTDA",
  },
  sections: [RESEARCH_SECTION],
  sources: ["https://exemplo.com/industria"],
};

const MARKET_ANALYSIS: MarketAnalysis = {
  resumo: "A empresa enfrenta dores típicas do segmento.",
  dores: [
    {
      dimensao_id: "d01",
      dimensao: "Governança",
      dor: "Falta de governança de dados",
      evidencia_mercado: true,
      confianca: 0.85,
    },
  ],
  contexto_concorrentes: [
    { nome: "Concorrente X", contexto: "Investe em dados" },
  ],
};

const INSIGHTS_BRIEF: InsightsBrief = {
  bullets: [
    { texto: "Priorizar governança", prioridade: "alta" },
    { texto: "Investir em qualidade", prioridade: "media" },
  ],
};

describe("researchResultSchema", () => {
  it("aceita resultado válido", () => {
    expect(researchResultSchema.safeParse(RESEARCH_RESULT).success).toBe(true);
  });

  it("rejeita resultado sem url", () => {
    const { url, ...semUrl } = RESEARCH_RESULT;
    expect(researchResultSchema.safeParse(semUrl).success).toBe(false);
  });

  it("rejeita chaves extras", () => {
    expect(
      researchResultSchema.safeParse({ ...RESEARCH_RESULT, extra: true }).success,
    ).toBe(false);
  });
});

describe("researchSectionSchema", () => {
  it("aceita seção ok", () => {
    expect(researchSectionSchema.safeParse(RESEARCH_SECTION).success).toBe(true);
  });

  it("aceita seção com status erro e error", () => {
    expect(
      researchSectionSchema.safeParse({
        ...RESEARCH_SECTION,
        status: "erro",
        error: "timeout",
        results: [],
      }).success,
    ).toBe(true);
  });

  it("rejeita key fora do conjunto", () => {
    expect(
      researchSectionSchema.safeParse({ ...RESEARCH_SECTION, key: "outro" }).success,
    ).toBe(false);
  });

  it("rejeita status inválido", () => {
    expect(
      researchSectionSchema.safeParse({ ...RESEARCH_SECTION, status: "falhou" }).success,
    ).toBe(false);
  });
});

describe("marketResearchSchema", () => {
  it("aceita payload válido", () => {
    expect(marketResearchSchema.safeParse(MARKET_RESEARCH).success).toBe(true);
  });

  it("aceita empresa com campos nulos", () => {
    const { nome, ...semNome } = MARKET_RESEARCH.empresa;
    expect(
      marketResearchSchema.safeParse({
        ...MARKET_RESEARCH,
        empresa: { ...semNome, nome: null },
      }).success,
    ).toBe(true);
  });

  it("rejeita chave desconhecida", () => {
    expect(
      marketResearchSchema.safeParse({ ...MARKET_RESEARCH, outras: [] }).success,
    ).toBe(false);
  });

  it("tipo inferido é atribuível a MarketResearch", () => {
    const parsed = marketResearchSchema.parse(MARKET_RESEARCH);
    const verificado: MarketResearch = parsed;
    expect(verificado.sources).toContain("https://exemplo.com/industria");
  });
});

describe("analysisPainSchema", () => {
  it("aceita dor válida", () => {
    expect(analysisPainSchema.safeParse(MARKET_ANALYSIS.dores[0]).success).toBe(true);
  });

  it("rejeita confianca fora de 0-1", () => {
    expect(
      analysisPainSchema.safeParse({
        ...MARKET_ANALYSIS.dores[0],
        confianca: 1.5,
      }).success,
    ).toBe(false);
  });

  it("rejeita evidencia_mercado não booleano", () => {
    expect(
      analysisPainSchema.safeParse({
        ...MARKET_ANALYSIS.dores[0],
        evidencia_mercado: "sim",
      }).success,
    ).toBe(false);
  });
});

describe("competitorContextSchema", () => {
  it("aceita contexto de concorrente válido", () => {
    expect(
      competitorContextSchema.safeParse(MARKET_ANALYSIS.contexto_concorrentes[0]).success,
    ).toBe(true);
  });

  it("rejeita contexto sem nome", () => {
    const { nome, ...semNome } = MARKET_ANALYSIS.contexto_concorrentes[0];
    expect(competitorContextSchema.safeParse(semNome).success).toBe(false);
  });
});

describe("marketAnalysisSchema", () => {
  it("aceita payload válido", () => {
    expect(marketAnalysisSchema.safeParse(MARKET_ANALYSIS).success).toBe(true);
  });

  it("aceita listas vazias", () => {
    expect(
      marketAnalysisSchema.safeParse({ ...MARKET_ANALYSIS, dores: [], contexto_concorrentes: [] }).success,
    ).toBe(true);
  });

  it("rejeita chave desconhecida", () => {
    expect(
      marketAnalysisSchema.safeParse({ ...MARKET_ANALYSIS, extra: 1 }).success,
    ).toBe(false);
  });

  it("tipo inferido é atribuível a MarketAnalysis", () => {
    const parsed = marketAnalysisSchema.parse(MARKET_ANALYSIS);
    const verificado: MarketAnalysis = parsed;
    expect(verificado.dores).toHaveLength(1);
  });
});

describe("insightBulletSchema", () => {
  it("aceita bullet válido", () => {
    expect(insightBulletSchema.safeParse(INSIGHTS_BRIEF.bullets[0]).success).toBe(true);
  });

  it("rejeita prioridade fora do conjunto", () => {
    expect(
      insightBulletSchema.safeParse({ texto: "x", prioridade: "urgente" }).success,
    ).toBe(false);
  });
});

describe("campos opcionais do portal (back-compat)", () => {
  it("fixture antiga de dor sem campos novos continua validando", () => {
    const legado = {
      dimensao_id: "d01",
      dimensao: "Governança",
      dor: "x",
      evidencia_mercado: true,
      confianca: 0.8,
    };
    expect(analysisPainSchema.safeParse(legado).success).toBe(true);
  });

  it("dor enriquecida valida com nivel_atual, impacto_negocio e recomendacao_curta", () => {
    const enriquecida = {
      dimensao_id: "d01",
      dimensao: "Governança",
      dor: "x",
      evidencia_mercado: true,
      confianca: 0.8,
      nivel_atual: 2,
      impacto_negocio: "Decisões lentas",
      recomendacao_curta: "Definir dono de dados",
    };
    const parsed = analysisPainSchema.safeParse(enriquecida);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.nivel_atual).toBe(2);
      expect(parsed.data.impacto_negocio).toBe("Decisões lentas");
      expect(parsed.data.recomendacao_curta).toBe("Definir dono de dados");
    }
  });

  it("rejeita nivel_atual fora de 1..5", () => {
    expect(
      analysisPainSchema.safeParse({
        dimensao_id: "d01",
        dimensao: "Governança",
        dor: "x",
        evidencia_mercado: true,
        confianca: 0.8,
        nivel_atual: 6,
      }).success,
    ).toBe(false);
  });

  it("rejeita impacto_negocio acima de 300 chars", () => {
    expect(
      analysisPainSchema.safeParse({
        dimensao_id: "d01",
        dimensao: "Governança",
        dor: "x",
        evidencia_mercado: true,
        confianca: 0.8,
        impacto_negocio: "a".repeat(301),
      }).success,
    ).toBe(false);
  });

  it("concorrente legado valida; enriquecido aceita url e diferencial", () => {
    const legado = { nome: "Concorrente X", contexto: "Investe em dados" };
    expect(competitorContextSchema.safeParse(legado).success).toBe(true);

    const enriquecido = {
      ...legado,
      url: "https://concorrente.com",
      diferencial: "Atua com analytics avançado",
    };
    const parsed = competitorContextSchema.safeParse(enriquecido);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.url).toBe("https://concorrente.com");
      expect(parsed.data.diferencial).toBe("Atua com analytics avançado");
    }
  });

  it("análise legada valida e mantém .strict() para chaves desconhecidas; enriched valida", () => {
    expect(marketAnalysisSchema.safeParse(MARKET_ANALYSIS).success).toBe(true);
    const enriquecida = {
      ...MARKET_ANALYSIS,
      posicionamento_setor: "Líder regional em analytics",
      oportunidade_principal: "Governança de dados como diferencial",
    };
    const parsed = marketAnalysisSchema.safeParse(enriquecida);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.posicionamento_setor).toBe("Líder regional em analytics");
      expect(parsed.data.oportunidade_principal).toBe(
        "Governança de dados como diferencial",
      );
    }
    expect(
      marketAnalysisSchema.safeParse({ ...enriquecida, extra: 1 }).success,
    ).toBe(false);
  });

  it("rejeita posicionamento_setor acima de 500 chars", () => {
    expect(
      marketAnalysisSchema.safeParse({
        ...MARKET_ANALYSIS,
        posicionamento_setor: "a".repeat(501),
      }).success,
    ).toBe(false);
  });

  it("bullet legado valida; enriquecido aceita titulo, dimensao_ids e proximo_passo", () => {
    const legado = { texto: "Priorizar governança", prioridade: "alta" as const };
    expect(insightBulletSchema.safeParse(legado).success).toBe(true);

    const enriquecido = {
      ...legado,
      titulo: "Definir dono de dados",
      dimensao_ids: ["d01", "d02"],
      proximo_passo: "Nomear responsável em 30 dias",
    };
    const parsed = insightBulletSchema.safeParse(enriquecido);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.titulo).toBe("Definir dono de dados");
      expect(parsed.data.dimensao_ids).toEqual(["d01", "d02"]);
      expect(parsed.data.proximo_passo).toBe("Nomear responsável em 30 dias");
    }
  });

  it("rejeita titulo acima de 70 chars e proximo_passo acima de 300", () => {
    expect(
      insightBulletSchema.safeParse({
        texto: "x",
        prioridade: "alta",
        titulo: "a".repeat(71),
      }).success,
    ).toBe(false);
    expect(
      insightBulletSchema.safeParse({
        texto: "x",
        prioridade: "alta",
        proximo_passo: "a".repeat(301),
      }).success,
    ).toBe(false);
  });
});

describe("insightsBriefSchema", () => {
  it("aceita brief válido", () => {
    expect(insightsBriefSchema.safeParse(INSIGHTS_BRIEF).success).toBe(true);
  });

  it("aceita até 10 bullets", () => {
    const bullets = Array.from({ length: 10 }, (_, i) => ({
      texto: `Bullet ${i}`,
      prioridade: "media" as const,
    }));
    expect(insightsBriefSchema.safeParse({ bullets }).success).toBe(true);
  });

  it("rejeita mais de 10 bullets", () => {
    const bullets = Array.from({ length: 11 }, (_, i) => ({
      texto: `Bullet ${i}`,
      prioridade: "media" as const,
    }));
    expect(insightsBriefSchema.safeParse({ bullets }).success).toBe(false);
  });

  it("rejeita chave desconhecida", () => {
    expect(
      insightsBriefSchema.safeParse({ ...INSIGHTS_BRIEF, titulo: "x" }).success,
    ).toBe(false);
  });

  it("tipo inferido é atribuível a InsightsBrief", () => {
    const parsed = insightsBriefSchema.parse(INSIGHTS_BRIEF);
    const verificado: InsightsBrief = parsed;
    expect(verificado.bullets).toHaveLength(2);
  });
});
