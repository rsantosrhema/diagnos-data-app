import { describe, it, expect, vi, beforeEach } from "vitest";
import { createPortalService, SHARE_TOKEN_TTL_DAYS } from "./portal-service";
import type { LeadRepository } from "@/lib/repository/lead-repo";
import type { AssessmentRepository } from "@/lib/repository/assessment-repo";
import type { MarketInsightsRepository } from "@/lib/repository/market-insights-repo";
import type { ShareTokenRepository } from "@/lib/repository/share-token-repo";
import { SCREENER_CONTRACT } from "@/lib/screener/contract";
import { createHash } from "node:crypto";

const LEAD_1_EMAIL = "joao@corp.com";
const LEAD_1_PHONE = "11999999999";

const LEAD_ROW = {
  id: "lead-1",
  name: "João",
  company: "Corp",
  email: LEAD_1_EMAIL,
  phone: LEAD_1_PHONE,
  role: "CTO",
  status: "concluido",
  created_at: "2026-08-01T00:00:00Z",
};

const AGENT_PAYLOAD = {
  versao: "1.0.0",
  solicitante: { nome: "João", cargo: "CTO" },
  empresa: {
    nome: "Corp",
    porte: "Grande",
    segmento: "Indústria",
    funcionarios: "500",
    faturamento: "R$ 900M",
  },
  contexto: {},
  perfil_empresa: {},
  respostas: [
    {
      dimensao_id: "dim_governanca",
      dimensao: "Governança e Responsabilidade",
      pergunta: "Como a área de negócio participa das políticas de dados?",
      nivel: 3,
      peso: 12,
      resposta: "Ritos formais aplicados.",
    },
  ],
  resposta_comercial: {
    pergunta: "Qual a prioridade?",
    resposta: "Prioridade alta.",
  },
  score: { valor: 2.9, faixa: "Estruturado", descricao: "Base técnica existe." },
  risco: { dimensao_id: "dim_governanca", nivel: 3 },
  desequilibrio: false,
  consentimento: {
    aceito: true,
    texto: "Consentimento.",
    aceito_em: "2026-08-01T00:00:00Z",
  },
};

const ENRICHED_ANALYSIS = {
  resumo: "Resumo executivo.",
  dores: [
    {
      dimensao_id: "dim_governanca",
      dimensao: "Governança e Responsabilidade",
      dor: "Dados divergentes.",
      evidencia_mercado: true,
      confianca: 0.9,
      nivel_atual: 2,
      impacto_negocio: "Decisões erradas.",
      recomendacao_curta: "Definir dono.",
    },
  ],
  contexto_concorrentes: [
    {
      nome: "Concorrente A",
      contexto: "BI maduro.",
      url: "https://a.com",
      diferencial: "Time dedicado.",
    },
  ],
  posicionamento_setor: "Setor prioriza área.",
  oportunidade_principal: "Unificar fontes.",
};

const INSIGHTS_BRIEF = {
  bullets: [
    {
      texto: "Formalize donos de dados.",
      prioridade: "alta" as const,
      titulo: "Governança mínima",
      dimensao_ids: ["dim_governanca"],
      proximo_passo: "Nomear donos.",
    },
  ],
};

const INSIGHTS_ROW_ANALISADO = {
  id: "mi-1",
  lead_id: "lead-1",
  research: null,
  analysis: ENRICHED_ANALYSIS,
  insights: INSIGHTS_BRIEF,
  sources: ["https://exemplo.com/fonte"],
  status: "analisado",
  error: null,
  created_at: "2026-08-01T00:00:00Z",
  updated_at: "2026-08-02T00:00:00Z",
  queued_at: null,
  processing_started_at: null,
  completed_at: "2026-08-02T00:00:00Z",
  attempts: 1,
};

const RAW_TEST_TOKEN = "meutoken";

const ACTIVE_TOKEN_ROW = {
  id: "tok-1",
  lead_id: "lead-1",
  token_hash: createHash("sha256").update(RAW_TEST_TOKEN).digest("hex"),
  expires_at: "2027-10-08T00:00:00Z",
  revoked_at: null,
  created_by: null,
  created_at: "2026-10-08T00:00:00Z",
};

const ASSESSMENT_ROW = {
  id: "resp-1",
  lead_id: "lead-1",
  context: null,
  answers: null,
  commercial_answer: null,
  consent: null,
  agent_payload: AGENT_PAYLOAD,
  created_at: "2026-08-01T00:00:00Z",
};

function mockLeadRepo(overrides: Partial<LeadRepository> = {}): LeadRepository {
  return {
    findById: vi.fn(),
    findByEmail: vi.fn(),
    findByEmailAndStatus: vi.fn(),
    create: vi.fn(),
    updateStatus: vi.fn(),
    findAll: vi.fn(),
    findNameAndEmail: vi.fn(),
    findProfileById: vi.fn(),
    ...overrides,
  };
}

function mockAssessmentRepo(
  overrides: Partial<AssessmentRepository> = {},
): AssessmentRepository {
  return {
    existsForLead: vi.fn(),
    createAssessmentResponse: vi.fn(),
    createDiagnostic: vi.fn(),
    findByLeadId: vi.fn(),
    ...overrides,
  };
}

function mockInsightsRepo(
  overrides: Partial<MarketInsightsRepository> = {},
): MarketInsightsRepository {
  return {
    upsert: vi.fn(),
    findByLeadId: vi.fn(),
    markStatus: vi.fn(),
    logEvent: vi.fn(),
    ...overrides,
  };
}

function mockShareTokenRepo(
  overrides: Partial<ShareTokenRepository> = {},
): ShareTokenRepository {
  return {
    create: vi.fn(),
    findByHash: vi.fn(),
    revokeByLeadId: vi.fn(),
    findActiveByLeadId: vi.fn(),
    ...overrides,
  };
}

interface PortalTestDeps {
  leadRepo?: Partial<LeadRepository>;
  assessmentRepo?: Partial<AssessmentRepository>;
  insightsRepo?: Partial<MarketInsightsRepository>;
  shareTokenRepo?: Partial<ShareTokenRepository>;
}

function buildService(overrides: PortalTestDeps = {}) {
  return createPortalService({
    leadRepo: mockLeadRepo({
      findById: vi.fn().mockResolvedValue(LEAD_ROW),
      ...overrides.leadRepo,
    }),
    assessmentRepo: mockAssessmentRepo({
      findByLeadId: vi.fn().mockResolvedValue(ASSESSMENT_ROW),
      ...overrides.assessmentRepo,
    }),
    marketInsightsRepo: mockInsightsRepo({
      findByLeadId: vi.fn().mockResolvedValue(INSIGHTS_ROW_ANALISADO),
      ...overrides.insightsRepo,
    }),
    shareTokenRepo: mockShareTokenRepo({
      findActiveByLeadId: vi.fn().mockResolvedValue(ACTIVE_TOKEN_ROW),
      ...overrides.shareTokenRepo,
    }),
    contract: SCREENER_CONTRACT,
  });
}

function expectedTokenHash(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

describe("PortalService.getForManager", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("retorna DTO completo com email e estado do link ativo (PORTAL-01)", async () => {
    const service = buildService();
    const dto = await service.getForManager("lead-1");

    expect(dto.lead).toEqual({ id: "lead-1", name: "João", company: "Corp" });
    expect(dto.email).toBe(LEAD_1_EMAIL);
    expect(dto.score).toEqual({
      valor: 2.9,
      faixa: "Estruturado",
      descricao: "Base técnica existe.",
    });
    expect(dto.dimensions).toHaveLength(1);
    expect(dto.dimensions[0]?.id).toBe("dim_governanca");
    expect(dto.dimensions[0]?.nivel).toBe(3);
    expect(dto.dimensions[0]?.score).toBe(36);
    expect(dto.dimensions[0]?.pergunta).toBe(AGENT_PAYLOAD.respostas[0].pergunta);
    expect(dto.dimensions[0]?.resposta).toBe(AGENT_PAYLOAD.respostas[0].resposta);
    expect(dto.risk).toEqual({
      id: "dim_governanca",
      name: "Governança e Responsabilidade",
      nivel: 3,
    });
    expect(dto.stage.rotulo).toBe("Estruturado");
    expect(dto.commercialAnswer).toBe("Prioridade alta.");
    expect(dto.share).toEqual({
      active: true,
      url: null,
      expiresAt: ACTIVE_TOKEN_ROW.expires_at,
    });
  });

  it("inclui analysis, insights e sources quando status é analisado", async () => {
    const service = buildService();
    const dto = await service.getForManager("lead-1");

    expect(dto.analysisStatus).toBe("analisado");
    expect(dto.analysis?.dores[0]?.nivel_atual).toBe(2);
    expect(dto.insights?.bullets[0]?.dimensao_ids).toEqual(["dim_governanca"]);
    expect(dto.sources).toEqual([{ url: "https://exemplo.com/fonte" }]);
  });

  it("retorna sem analysis/insights quando status não é analisado (PORTAL-02)", async () => {
    const service = buildService({
      insightsRepo: {
        findByLeadId: vi.fn().mockResolvedValue({
          ...INSIGHTS_ROW_ANALISADO,
          status: "processando",
        }),
      },
    });
    const dto = await service.getForManager("lead-1");

    expect(dto.analysisStatus).toBe("processando");
    expect(dto.analysis).toBeUndefined();
    expect(dto.insights).toBeUndefined();
    expect(dto.sources).toEqual([]);
    expect(dto.score.valor).toBe(2.9);
  });

  it("usando analysisStatus pendente quando market_insights ausente (PORTAL-02)", async () => {
    const service = buildService({
      insightsRepo: { findByLeadId: vi.fn().mockResolvedValue(null) },
    });
    const dto = await service.getForManager("lead-1");

    expect(dto.analysisStatus).toBe("pendente");
    expect(dto.analysis).toBeUndefined();
    expect(dto.share.active).toBe(true);
  });

  it("aceita análise antiga sem campos enriquecidos (PORTAL-12)", async () => {
    const service = buildService({
      insightsRepo: {
        findByLeadId: vi.fn().mockResolvedValue({
          ...INSIGHTS_ROW_ANALISADO,
          analysis: {
            resumo: "Resumo.",
            dores: [
              {
                dimensao_id: "dim_governanca",
                dimensao: "Governança e Responsabilidade",
                dor: "Antiga.",
                evidencia_mercado: false,
                confianca: 0.4,
              },
            ],
            contexto_concorrentes: [],
          },
          insights: { bullets: [{ texto: "Antigo.", prioridade: "baixa" }] },
        }),
      },
    });
    const dto = await service.getForManager("lead-1");

    expect(dto.analysisStatus).toBe("analisado");
    expect(dto.analysis?.dores[0]?.nivel_atual).toBeUndefined();
    expect(dto.insights?.bullets[0]?.titulo).toBeUndefined();
  });

  it("lança 404 quando o lead não existe", async () => {
    const service = buildService({
      leadRepo: { findById: vi.fn().mockResolvedValue(null) },
    });

    await expect(service.getForManager("lead-2")).rejects.toMatchObject({
      status: 404,
    });
  });

  it("lança 404 quando o lead não tem diagnóstico", async () => {
    const service = buildService({
      assessmentRepo: { findByLeadId: vi.fn().mockResolvedValue(null) },
    });

    await expect(service.getForManager("lead-1")).rejects.toMatchObject({
      status: 404,
    });
  });

  it("lança 404 e loga server-side quando agent_payload é inválido", async () => {
    const errorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => {})
      .mockName("console.error");
    const service = buildService({
      assessmentRepo: {
        findByLeadId: vi.fn().mockResolvedValue({
          ...ASSESSMENT_ROW,
          agent_payload: { quebrado: true },
        }),
      },
      shareTokenRepo: {},
    });

    await expect(service.getForManager("lead-1")).rejects.toMatchObject({
      status: 404,
    });
    expect(errorSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
  });
});

describe("PortalService.getByToken", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("retorna DTO público sem email/phone quando o token resolve (PORTAL-07/08)", async () => {
    const rawToken = RAW_TEST_TOKEN;
    const service = buildService({
      shareTokenRepo: {
        findByHash: vi.fn().mockResolvedValue(ACTIVE_TOKEN_ROW),
      },
    });

    const dto = await service.getByToken(rawToken);

    expect(dto.lead.name).toBe("João");
    expect(dto.lead.company).toBe("Corp");
    expect(dto.score.valor).toBe(2.9);
    expect("email" in dto).toBe(false);
    expect("phone" in dto).toBe(false);

    const json = JSON.stringify(dto);
    expect(json).not.toContain(LEAD_1_EMAIL);
    expect(json).not.toContain(LEAD_1_PHONE);
  });

  it("passa apenas o hash SHA-256 para o repo, nunca o token cru (PORTAL-04)", async () => {
    const rawToken = RAW_TEST_TOKEN;
    const findByHash = vi.fn().mockResolvedValue(ACTIVE_TOKEN_ROW);
    const service = buildService({ shareTokenRepo: { findByHash } });

    await service.getByToken(rawToken);

    expect(findByHash).toHaveBeenCalledTimes(1);
    expect(findByHash).toHaveBeenCalledWith(expectedTokenHash(rawToken));
    expect(findByHash.mock.calls[0]?.[0]).not.toBe(rawToken);
  });

  it("lança 404 genérico quando o hash não existe no banco", async () => {
    const service = buildService({
      shareTokenRepo: { findByHash: vi.fn().mockResolvedValue(null) },
    });

    await expect(service.getByToken("desconhecido")).rejects.toMatchObject({
      status: 404,
    });
  });

  it("lança 404 genérico quando o token está revogado (PORTAL-06)", async () => {
    const service = buildService({
      shareTokenRepo: {
        findByHash: vi.fn().mockResolvedValue({
          ...ACTIVE_TOKEN_ROW,
          revoked_at: "2026-10-01T00:00:00Z",
        }),
      },
    });

    await expect(service.getByToken(RAW_TEST_TOKEN)).rejects.toMatchObject({
      status: 404,
    });
  });

  it("lança 404 genérico quando o token está expirado (PORTAL-06)", async () => {
    const service = buildService({
      shareTokenRepo: {
        findByHash: vi.fn().mockResolvedValue({
          ...ACTIVE_TOKEN_ROW,
          expires_at: "2020-01-01T00:00:00Z",
        }),
      },
    });

    await expect(service.getByToken(RAW_TEST_TOKEN)).rejects.toMatchObject({
      status: 404,
    });
  });

  it("lança 404 quando o lead do token não tem diagnóstico", async () => {
    const service = buildService({
      assessmentRepo: { findByLeadId: vi.fn().mockResolvedValue(null) },
      shareTokenRepo: {
        findByHash: vi.fn().mockResolvedValue(ACTIVE_TOKEN_ROW),
      },
    });

    await expect(service.getByToken(RAW_TEST_TOKEN)).rejects.toMatchObject({
      status: 404,
    });
  });

  it("lança 404 quando agent_payload do token é inválido", async () => {
    const service = buildService({
      assessmentRepo: {
        findByLeadId: vi.fn().mockResolvedValue({
          ...ASSESSMENT_ROW,
          agent_payload: null,
        }),
      },
      shareTokenRepo: {
        findByHash: vi.fn().mockResolvedValue(ACTIVE_TOKEN_ROW),
      },
    });

    await expect(service.getByToken(RAW_TEST_TOKEN)).rejects.toMatchObject({
      status: 404,
    });
  });
});

describe("PortalService.createShareToken", () => {
  it("gera token base64url de 32 bytes, persiste só o hash com TTL de 90 dias e invalida o anterior (PORTAL-04/05)", async () => {
    const create = vi.fn().mockResolvedValue(undefined);
    const shares = mockShareTokenRepo({ create });
    const service = buildService({ shareTokenRepo: shares });

    const result = await service.createShareToken("lead-1");

    expect(result.token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(result.url).toBe(`/r/${result.token}`);
    const params = create.mock.calls[0]?.[0] as {
      leadId: string;
      tokenHash: string;
      expiresAt: string;
    };
    expect(params.leadId).toBe("lead-1");
    expect(params.tokenHash).toBe(expectedTokenHash(result.token));
    expect(params.expiresAt.length).toBeGreaterThan(0);
    const expectedMax = Date.now() + SHARE_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000;
    expect(new Date(params.expiresAt).getTime()).toBeLessThanOrEqual(expectedMax);
    expect(new Date(params.expiresAt).getTime()).toBeGreaterThan(
      expectedMax - 60_000,
    );
    expect(JSON.stringify(create.mock.calls)).not.toContain(result.token);

    const expires = new Date(result.expiresAt).getTime();
    expect(expires).toBeLessThanOrEqual(expectedMax);
    expect(expires).toBeGreaterThan(expectedMax - 60_000);
  });

  it("gera tokens distintos em chamadas seguidas", async () => {
    const create = vi.fn().mockResolvedValue(undefined);
    const service = buildService({
      shareTokenRepo: mockShareTokenRepo({ create }),
    });

    const first = await service.createShareToken("lead-1");
    const second = await service.createShareToken("lead-1");

    expect(first.token).not.toBe(second.token);
  });
});

describe("PortalService.revokeShareToken", () => {
  it("revoga via repo pelo leadId e token sem hash correspondente vira 404 (PORTAL-06)", async () => {
    const revokeByLeadId = vi.fn().mockResolvedValue(undefined);
    const findByHash = vi.fn().mockResolvedValue(null);
    const service = buildService({
      shareTokenRepo: mockShareTokenRepo({ revokeByLeadId, findByHash }),
    });

    await service.revokeShareToken("lead-1");

    expect(revokeByLeadId).toHaveBeenCalledWith("lead-1");
    await expect(service.getByToken("qualquer-token")).rejects.toMatchObject({
      status: 404,
    });
  });
});
