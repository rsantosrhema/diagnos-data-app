import { describe, it, expect, vi, beforeAll, beforeEach } from "vitest";

const { mockVerifyInternalApiKey, mockRequireManager, mockUnauthorized } =
  vi.hoisted(() => ({
    mockVerifyInternalApiKey: vi.fn(),
    mockRequireManager: vi.fn(),
    mockUnauthorized: vi.fn(),
  }));

vi.mock("@/lib/auth/internal-key", () => ({
  verifyInternalApiKey: mockVerifyInternalApiKey,
}));

vi.mock("@/lib/auth/guard", () => ({
  requireManager: mockRequireManager,
  unauthorized: mockUnauthorized,
}));

const mockGetForManager = vi.fn();
vi.mock("@/lib/service/portal-service", () => ({
  createPortalService: vi.fn().mockReturnValue({
    getForManager: mockGetForManager,
    getByToken: vi.fn(),
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

beforeAll(() => {
  process.env.INTERNAL_API_KEY = "a".repeat(64) + "-test-key-for-portal-route";
});

beforeEach(() => {
  mockVerifyInternalApiKey.mockReset();
  mockRequireManager.mockReset();
  mockUnauthorized.mockReset();
  mockGetForManager.mockReset();
  mockVerifyInternalApiKey.mockReturnValue(true);
  mockRequireManager.mockResolvedValue({ id: "manager-1", email: "m@rhema.com" });
  mockUnauthorized.mockReturnValue(
    new Response(JSON.stringify({ error: "Não autenticado" }), {
      status: 401,
      headers: { "content-type": "application/json" },
    }),
  );
});

const VALID_UUID = "c0b1f2e3-4a5b-6c7d-8e9f-0a1b2c3d4e5f";

const MANAGER_DTO = {
  lead: { id: VALID_UUID, name: "João", company: "Corp" },
  email: "joao@corp.com",
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
    descricaoExecutiva: "Base técnica existe.",
    caracteristicas: [],
    sinaisRisco: [],
    comoSubir: [],
  },
  analysisStatus: "analisado",
  sources: [],
  commercialAnswer: "Alta.",
  share: { active: false, url: null, expiresAt: null },
};

function makeRequest() {
  return new Request(`http://localhost/api/admin/portal/${VALID_UUID}`, {
    method: "GET",
    headers: {
      "x-internal-api-key": process.env.INTERNAL_API_KEY!,
    },
  });
}

async function importRoute() {
  const mod = await import("./route");
  return mod.GET;
}

describe("GET /api/admin/portal/[leadId]", () => {
  it("retorna 401 sem internal key (PORTAL-03)", async () => {
    mockVerifyInternalApiKey.mockReturnValue(false);
    const GET = await importRoute();
    const res = await GET(makeRequest(), { params: { leadId: VALID_UUID } });
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe("Chave interna inválida");
  });

  it("retorna 401 quando não é gerente (PORTAL-03)", async () => {
    mockRequireManager.mockResolvedValue(null);
    const GET = await importRoute();
    const res = await GET(makeRequest(), { params: { leadId: VALID_UUID } });
    expect(res.status).toBe(401);
  });

  it("retorna 404 quando portal-service lança PortalServiceError 404 (lead sem diagnóstico)", async () => {
    const { PortalServiceError } = await import("@/lib/service/portal-service");
    mockGetForManager.mockRejectedValue(
      new PortalServiceError("Diagnóstico não encontrado", 404),
    );
    const GET = await importRoute();
    const res = await GET(makeRequest(), { params: { leadId: VALID_UUID } });
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe("Diagnóstico não encontrado");
  });

  it("retorna 200 com o DTO gerencial no happy path (PORTAL-01)", async () => {
    mockGetForManager.mockResolvedValue(MANAGER_DTO);
    const GET = await importRoute();
    const res = await GET(makeRequest(), { params: { leadId: VALID_UUID } });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual(MANAGER_DTO);
    expect(mockGetForManager).toHaveBeenCalledWith(VALID_UUID);
  });

  it("retorna 500 genérico quando o serviço falha com erro inesperado", async () => {
    mockGetForManager.mockRejectedValue(new Error("boom"));
    const GET = await importRoute();
    const res = await GET(makeRequest(), { params: { leadId: VALID_UUID } });
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe("Erro interno");
  });
});
