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

const mockReprocessAnalysis = vi.fn();
vi.mock("@/lib/service/admin-service", () => ({
  createAdminService: vi.fn().mockReturnValue({
    getTokensDashboard: vi.fn(),
    reprocessAnalysis: mockReprocessAnalysis,
  }),
  AdminServiceError: class AdminServiceError extends Error {
    status: number;
    constructor(message: string, status: number) {
      super(message);
      this.status = status;
    }
  },
}));

vi.mock("@/lib/supabase/server", () => ({
  getServiceClient: vi.fn().mockReturnValue({}),
}));

beforeAll(() => {
  process.env.INTERNAL_API_KEY = "a".repeat(64) + "-test-key-for-reprocess-route";
});

beforeEach(() => {
  mockVerifyInternalApiKey.mockReset();
  mockRequireManager.mockReset();
  mockUnauthorized.mockReset();
  mockReprocessAnalysis.mockReset();
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

function makeRequest(body: unknown) {
  return new Request("http://localhost/api/admin/analysis/reprocess", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-internal-api-key": process.env.INTERNAL_API_KEY!,
    },
    body: JSON.stringify(body),
  });
}

describe("POST /api/admin/analysis/reprocess", () => {
  it("retorna 401 sem internal key (REPRO-05)", async () => {
    mockVerifyInternalApiKey.mockReturnValue(false);
    const { POST } = await import("./route");
    const res = await POST(makeRequest({ leadId: VALID_UUID }));
    expect(res.status).toBe(401);
  });

  it("retorna 401 quando não é gerente (REPRO-05)", async () => {
    mockRequireManager.mockResolvedValue(null);
    const { POST } = await import("./route");
    const res = await POST(makeRequest({ leadId: VALID_UUID }));
    expect(res.status).toBe(401);
  });

  it("retorna 400 para leadId inválido (REPRO-06)", async () => {
    const { POST } = await import("./route");
    const res = await POST(makeRequest({ leadId: "nao-uuid" }));
    expect(res.status).toBe(400);
  });

  it("retorna 400 para campos extras (.strict) (REPRO-06)", async () => {
    const { POST } = await import("./route");
    const res = await POST(
      makeRequest({ leadId: VALID_UUID, status: "analisado" }),
    );
    expect(res.status).toBe(400);
  });

  it("retorna 400 quando o serviço lança AdminServiceError (REPRO-02/03)", async () => {
    const { AdminServiceError } = await import("@/lib/service/admin-service");
    mockReprocessAnalysis.mockRejectedValue(
      new AdminServiceError("Lead sem análise reprocessável", 400),
    );
    const { POST } = await import("./route");
    const res = await POST(makeRequest({ leadId: VALID_UUID }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Lead sem análise reprocessável");
  });

  it("retorna 500 quando o enfileiramento falha (REPRO-04)", async () => {
    mockReprocessAnalysis.mockRejectedValue(new Error("queue down"));
    const { POST } = await import("./route");
    const res = await POST(makeRequest({ leadId: VALID_UUID }));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe("Erro interno");
  });

  it("retorna 200 { ok: true } em sucesso (REPRO-01)", async () => {
    mockReprocessAnalysis.mockResolvedValue({ ok: true });
    const { POST } = await import("./route");
    const res = await POST(makeRequest({ leadId: VALID_UUID }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ ok: true });
    expect(mockReprocessAnalysis).toHaveBeenCalledWith(VALID_UUID);
  });
});
