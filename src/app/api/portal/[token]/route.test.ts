import { describe, it, expect, vi, beforeAll, beforeEach } from "vitest";

const mockGetByToken = vi.fn();
vi.mock("@/lib/service/portal-service", () => ({
  createPortalService: vi.fn().mockReturnValue({
    getForManager: vi.fn(),
    getByToken: mockGetByToken,
    createShareToken: vi.fn(),
    revokeShareToken: vi.fn(),
  }),
  PortalServiceError: class PortalServiceError extends Error {
    status: number;
    constructor(message: string, status: number) {
      super(message);
      this.status = status;
    }
  },
  logPortalError: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  getServiceClient: vi.fn().mockReturnValue({}),
}));

const RAW_TOKEN = "tok-publico-123";

const PUBLIC_DTO = {
  lead: { id: "lead-1", name: "João", company: "Corp" },
  score: { valor: 2.9, faixa: "Estruturado", descricao: "Base técnica existe." },
  dimensions: [
    {
      id: "dim_governanca",
      name: "Governança e Responsabilidade",
      nivel: 3,
      peso: 12,
      score: 36,
      pergunta: "P?",
      resposta: "R.",
    },
  ],
  risk: { id: "dim_governanca", name: "Governança e Responsabilidade", nivel: 3 },
  imbalance: false,
  stage: {
    rotulo: "Estruturado",
    cor: "#4A2C7D",
    range: { min: 2.6, max: 3.4 },
    descricaoExecutiva: "Base.",
    caracteristicas: [],
    sinaisRisco: [],
    comoSubir: [],
  },
  analysisStatus: "analisado",
  analysis: {
    resumo: "Resumo.",
    dores: [
      {
        dimensao_id: "dim_governanca",
        dimensao: "Governança e Responsabilidade",
        dor: "Dor.",
        evidencia_mercado: true,
        confianca: 0.9,
      },
    ],
    contexto_concorrentes: [],
  },
  insights: { bullets: [{ texto: "B.", prioridade: "alta" }] },
  sources: [{ url: "https://exemplo.com" }],
  commercialAnswer: "Alta.",
};

function makeRequest(headers: Record<string, string> = {}) {
  return new Request(`http://localhost/api/portal/${RAW_TOKEN}`, {
    method: "GET",
    headers,
  });
}

async function importRoute() {
  const mod = await import("./route");
  return mod.GET;
}

describe("GET /api/portal/[token]", () => {
  beforeAll(() => {
    process.env.INTERNAL_API_KEY = "a".repeat(64) + "-test-key-for-public-portal";
  });

  beforeEach(() => {
    mockGetByToken.mockReset();
  });

  it("retorna 401 sem internal key", async () => {
    const GET = await importRoute();
    const res = await GET(makeRequest(), { params: { token: RAW_TOKEN } });
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe("Chave interna inválida");
    expect(mockGetByToken).not.toHaveBeenCalled();
  });

  it("retorna 200 com DTO público sem email/phone no payload (PORTAL-07/08)", async () => {
    mockGetByToken.mockResolvedValue(PUBLIC_DTO);
    const GET = await importRoute();
    const res = await GET(makeRequest({ "x-internal-api-key": process.env.INTERNAL_API_KEY! }), {
      params: { token: RAW_TOKEN },
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual(PUBLIC_DTO);
    expect("email" in body).toBe(false);
    expect("phone" in body).toBe(false);
    expect(JSON.stringify(body)).not.toContain("@");
    expect(mockGetByToken).toHaveBeenCalledWith(RAW_TOKEN);
  });

  it("retorna 404 genérico para token inválido/expirado/revogado (PORTAL-06)", async () => {
    const { PortalServiceError } = await import("@/lib/service/portal-service");
    mockGetByToken.mockRejectedValue(new PortalServiceError("Link inválido ou expirado", 404));
    const GET = await importRoute();
    const res = await GET(makeRequest({ "x-internal-api-key": process.env.INTERNAL_API_KEY! }), {
      params: { token: RAW_TOKEN },
    });
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe("Link inválido ou expirado");
  });

  it("mapeia qualquer PortalServiceError para 404 genérico, sem expor motivo", async () => {
    const { PortalServiceError } = await import("@/lib/service/portal-service");
    mockGetByToken.mockRejectedValue(new PortalServiceError("Lead não encontrado", 404));
    const GET = await importRoute();
    const res = await GET(makeRequest({ "x-internal-api-key": process.env.INTERNAL_API_KEY! }), {
      params: { token: RAW_TOKEN },
    });
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe("Link inválido ou expirado");
  });

  it("retorna 500 genérico em erro inesperado", async () => {
    mockGetByToken.mockRejectedValue(new Error("boom"));
    const GET = await importRoute();
    const res = await GET(makeRequest({ "x-internal-api-key": process.env.INTERNAL_API_KEY! }), {
      params: { token: RAW_TOKEN },
    });
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe("Erro interno");
  });
});
