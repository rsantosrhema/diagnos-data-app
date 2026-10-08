import { describe, it, expect } from "vitest";
import {
  portalDTOSchema,
  managerPortalDTOSchema,
  stripPii,
} from "./portal";

const STAGE = {
  rotulo: "Estruturado",
  cor: "#4A2C7D",
  range: { min: 2.6, max: 3.4 },
  descricaoExecutiva: "Base técnica existe.",
  caracteristicas: ["Data warehouse em operação."],
  sinaisRisco: ["Governança não pauta decisões."],
  comoSubir: ["Formalize políticas de dados."],
};

const FULL_DTO = {
  lead: { id: "lead-1", name: "João", company: "Corp" },
  score: { valor: 2.9, faixa: "Estruturado", descricao: "Base técnica existe." },
  dimensions: [
    {
      id: "dim_governanca",
      name: "Governança e Responsabilidade",
      nivel: 3,
      peso: 12,
      score: 36,
      pergunta: "Como a área de negócio participa da definição de políticas de dados?",
      resposta: "Ritos formais aplicados nas decisões críticas.",
    },
  ],
  risk: { id: "dim_qualidade", name: "Qualidade de Dados", nivel: 2 },
  imbalance: false,
  stage: STAGE,
  analysisStatus: "analisado" as const,
  analysis: {
    resumo: "Resumo executivo.",
    dores: [
      {
        dimensao_id: "dim_qualidade",
        dimensao: "Qualidade de Dados",
        dor: "Dados críticos divergentes entre áreas.",
        evidencia_mercado: true,
        confianca: 0.88,
        nivel_atual: 2,
        impacto_negocio: "Decisões sobre números errados.",
        recomendacao_curta: "Definir dono e métrica de qualidade.",
      },
    ],
    contexto_concorrentes: [
      {
        nome: "Concorrente A",
        contexto: "Líder do setor em BI.",
        url: "https://concorrentea.com.br",
        diferencial: "Equipe dedicada de governança.",
      },
    ],
    posicionamento_setor: "Setor prioriza plataformas por área.",
    oportunidade_principal: "Unificar fontes em um warehouse.",
  },
  insights: {
    bullets: [
      {
        texto: "Formalize donos de dados críticos.",
        prioridade: "alta" as const,
        titulo: "Governança mínima viável",
        dimensao_ids: ["dim_qualidade"],
        proximo_passo: "Nomear donos e definir métricas em 30 dias.",
      },
    ],
  },
  sources: [
    { url: "https://exemplo.com/fonte" },
    { url: "https://exemplo.com/outra", titulo: "Relatório setorial" },
  ],
  commercialAnswer: "Prioridade alta para este semestre.",
};

describe("portalDTOSchema", () => {
  it("valida o DTO completo com campos enriquecidos (PORTAL-10)", () => {
    const result = portalDTOSchema.safeParse(FULL_DTO);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.score.faixa).toBe("Estruturado");
      expect(result.data.analysis?.dores[0]?.nivel_atual).toBe(2);
      expect(result.data.insights?.bullets[0]?.dimensao_ids).toEqual([
        "dim_qualidade",
      ]);
      expect(result.data.sources[1]?.titulo).toBe("Relatório setorial");
    }
  });

  it("valida análise antiga sem os campos enriquecidos (PORTAL-12)", () => {
    const legacyDto = {
      ...FULL_DTO,
      analysis: {
        resumo: "Resumo executivo.",
        dores: [
          {
            dimensao_id: "dim_qualidade",
            dimensao: "Qualidade de Dados",
            dor: "Dados críticos divergentes.",
            evidencia_mercado: false,
            confianca: 0.5,
          },
        ],
        contexto_concorrentes: [{ nome: "Concorrente A", contexto: "BI simples." }],
      },
      insights: { bullets: [{ texto: "Bullet antigo sem título.", prioridade: "baixa" }] },
    };
    const result = portalDTOSchema.safeParse(legacyDto);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.analysis?.dores[0]?.nivel_atual).toBeUndefined();
      expect(result.data.insights?.bullets[0]?.titulo).toBeUndefined();
    }
  });

  it("valida analysis/insights ausentes quando status não é analisado (PORTAL-02)", () => {
    const pending = {
      ...FULL_DTO,
      analysisStatus: "processando" as const,
      analysis: undefined,
      insights: undefined,
      sources: [],
    };
    const result = portalDTOSchema.safeParse(pending);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.analysis).toBeUndefined();
      expect(result.data.insights).toBeUndefined();
    }
  });

  it("rejeita chaves desconhecidas (strict)", () => {
    const bad = { ...FULL_DTO, extra: true };
    expect(portalDTOSchema.safeParse(bad).success).toBe(false);
  });

  it("rejeita analysisStatus fora da união (PORTAL-02)", () => {
    const bad = { ...FULL_DTO, analysisStatus: "cancelado" };
    expect(portalDTOSchema.safeParse(bad).success).toBe(false);
  });
});

describe("managerPortalDTOSchema", () => {
  it("valida o DTO gerencial com email e estado de link", () => {
    const manager = {
      ...FULL_DTO,
      email: "joao@corp.com",
      share: { active: true, url: "/r/tok123", expiresAt: "2027-01-01T00:00:00Z" },
    };
    const result = managerPortalDTOSchema.safeParse(manager);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBe("joao@corp.com");
      expect(result.data.share.active).toBe(true);
      expect(result.data.share.url).toBe("/r/tok123");
    }
  });

  it("valida share sem link ativo (url/expiresAt nulos)", () => {
    const manager = {
      ...FULL_DTO,
      email: "joao@corp.com",
      share: { active: false, url: null, expiresAt: null },
    };
    const result = managerPortalDTOSchema.safeParse(manager);
    expect(result.success).toBe(true);
  });
});

describe("stripPii", () => {
  it("remove email e phone do payload", () => {
    const input = {
      ...FULL_DTO,
      email: "joao@corp.com",
      phone: "11999999999",
    };
    const stripped = stripPii(input);
    expect("email" in stripped).toBe(false);
    expect("phone" in stripped).toBe(false);
    expect(stripped.lead.name).toBe("João");
  });

  it("mantém objetos sem email/phone intactos", () => {
    const stripped = stripPii(FULL_DTO);
    expect(stripped).toEqual(FULL_DTO);
  });
});
