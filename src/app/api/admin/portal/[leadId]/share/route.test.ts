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

const mockCreateShareToken = vi.fn();
const mockRevokeShareToken = vi.fn();
vi.mock("@/lib/service/portal-service", () => ({
  createPortalService: vi.fn().mockReturnValue({
    getForManager: vi.fn(),
    getByToken: vi.fn(),
    createShareToken: mockCreateShareToken,
    revokeShareToken: mockRevokeShareToken,
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
  process.env.INTERNAL_API_KEY = "a".repeat(64) + "-test-key-for-share-route";
});

beforeEach(() => {
  mockVerifyInternalApiKey.mockReset();
  mockRequireManager.mockReset();
  mockUnauthorized.mockReset();
  mockCreateShareToken.mockReset();
  mockRevokeShareToken.mockReset();
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

function makeRequest(method: "POST" | "DELETE") {
  return new Request(`http://localhost/api/admin/portal/${VALID_UUID}/share`, {
    method,
    headers: {
      "x-internal-api-key": process.env.INTERNAL_API_KEY!,
    },
  });
}

async function importRoute() {
  const mod = await import("./route");
  return { POST: mod.POST, DELETE: mod.DELETE };
}

describe("POST /api/admin/portal/[leadId]/share", () => {
  it("retorna 401 sem internal key (PORTAL-05)", async () => {
    mockVerifyInternalApiKey.mockReturnValue(false);
    const { POST } = await importRoute();
    const res = await POST(makeRequest("POST"), { params: { leadId: VALID_UUID } });
    expect(res.status).toBe(401);
  });

  it("retorna 401 quando não é gerente (PORTAL-05)", async () => {
    mockRequireManager.mockResolvedValue(null);
    const { POST } = await importRoute();
    const res = await POST(makeRequest("POST"), { params: { leadId: VALID_UUID } });
    expect(res.status).toBe(401);
  });

  it("retorna 200 {url, expiresAt} sem expor o token cru em campo separado (PORTAL-04)", async () => {
    mockCreateShareToken.mockResolvedValue({
      token: "tok-abc-123",
      url: "/r/tok-abc-123",
      expiresAt: "2027-01-06T00:00:00Z",
    });
    const { POST } = await importRoute();
    const res = await POST(makeRequest("POST"), { params: { leadId: VALID_UUID } });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ url: "/r/tok-abc-123", expiresAt: "2027-01-06T00:00:00Z" });
    expect("token" in body).toBe(false);
    expect(mockCreateShareToken).toHaveBeenCalledWith(VALID_UUID);
  });

  it("mapeia PortalServiceError 404 do serviço (PORTAL-03)", async () => {
    const { PortalServiceError } = await import("@/lib/service/portal-service");
    mockCreateShareToken.mockRejectedValue(
      new PortalServiceError("Lead não encontrado", 404),
    );
    const { POST } = await importRoute();
    const res = await POST(makeRequest("POST"), { params: { leadId: VALID_UUID } });
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe("Lead não encontrado");
  });

  it("retorna 500 genérico em erro inesperado", async () => {
    mockCreateShareToken.mockRejectedValue(new Error("boom"));
    const { POST } = await importRoute();
    const res = await POST(makeRequest("POST"), { params: { leadId: VALID_UUID } });
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe("Erro interno");
  });
});

describe("DELETE /api/admin/portal/[leadId]/share", () => {
  it("retorna 401 sem internal key", async () => {
    mockVerifyInternalApiKey.mockReturnValue(false);
    const { DELETE } = await importRoute();
    const res = await DELETE(makeRequest("DELETE"), { params: { leadId: VALID_UUID } });
    expect(res.status).toBe(401);
  });

  it("retorna 401 quando não é gerente", async () => {
    mockRequireManager.mockResolvedValue(null);
    const { DELETE } = await importRoute();
    const res = await DELETE(makeRequest("DELETE"), { params: { leadId: VALID_UUID } });
    expect(res.status).toBe(401);
  });

  it("retorna 200 {ok:true} e chama revokeShareToken (PORTAL-05/06)", async () => {
    mockRevokeShareToken.mockResolvedValue(undefined);
    const { DELETE } = await importRoute();
    const res = await DELETE(makeRequest("DELETE"), { params: { leadId: VALID_UUID } });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ ok: true });
    expect(mockRevokeShareToken).toHaveBeenCalledWith(VALID_UUID);
  });

  it("mapeia PortalServiceError do serviço para o status correto", async () => {
    const { PortalServiceError } = await import("@/lib/service/portal-service");
    mockRevokeShareToken.mockRejectedValue(
      new PortalServiceError("Lead não encontrado", 404),
    );
    const { DELETE } = await importRoute();
    const res = await DELETE(makeRequest("DELETE"), { params: { leadId: VALID_UUID } });
    expect(res.status).toBe(404);
  });
});
