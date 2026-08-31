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

const mockGenerateReport = vi.fn();
vi.mock("@/lib/service/admin-service", () => ({
  createAdminService: vi.fn().mockReturnValue({
    getDashboard: vi.fn(),
    generateReport: mockGenerateReport,
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
  mockGenerateReport.mockReset();
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
      host: "localhost",
    },
    body: JSON.stringify(body),
  });
}

function mockFetchOnce(impl: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>) {
  const fetchMock = vi.fn(impl);
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

beforeEach(() => {
  vi.unstubAllGlobals();
});

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

  it("retorna 400 quando o serviço lança AdminServiceError", async () => {
    const { AdminServiceError } = await import("@/lib/service/admin-service");
    mockGenerateReport.mockRejectedValue(
      new AdminServiceError("Lead sem relatório gerável", 400),
    );
    const { POST } = await import("./route");
    const res = await POST(makeRequest({ leadId: VALID_UUID }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Lead sem relatório gerável");
  });

  it("retorna 500 quando o enfileiramento falha (REPRO-04)", async () => {
    mockGenerateReport.mockRejectedValue(new Error("queue down"));
    const { POST } = await import("./route");
    const res = await POST(makeRequest({ leadId: VALID_UUID }));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe("Erro interno");
  });

  it("retorna 200 { ok: true } em sucesso (REPRO-01)", async () => {
    mockGenerateReport.mockResolvedValue({ ok: true, queued: true });
    const { POST } = await import("./route");
    const res = await POST(makeRequest({ leadId: VALID_UUID }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ ok: true, queued: true });
    expect(mockGenerateReport).toHaveBeenCalledWith(VALID_UUID);
  });

  it("dispara o worker fire-and-forget com INTERNAL_API_KEY após enfileirar (REL-01/REL-02/REL-05)", async () => {
    mockGenerateReport.mockResolvedValue({ ok: true, queued: true });
    const fetchMock = mockFetchOnce(() => Promise.resolve(new Response(JSON.stringify({ ok: true }), { status: 200 })));
    const { POST } = await import("./route");
    const res = await POST(makeRequest({ leadId: VALID_UUID }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ ok: true, queued: true });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("http://localhost/api/analysis-worker");
    expect(init?.method).toBe("POST");
    const headers = init?.headers as Record<string, string>;
    expect(headers["x-internal-api-key"]).toBe(process.env.INTERNAL_API_KEY);
  });

  it("usa NEXT_PUBLIC_APP_URL como base do worker quando disponível (REL-04)", async () => {
    mockGenerateReport.mockResolvedValue({ ok: true, queued: true });
    const fetchMock = mockFetchOnce(() => Promise.resolve(new Response(JSON.stringify({ ok: true }), { status: 200 })));
    const original = process.env.NEXT_PUBLIC_APP_URL;
    process.env.NEXT_PUBLIC_APP_URL = "https://diagnosdata.rhemadata.com/";
    const { POST } = await import("./route");
    await POST(makeRequest({ leadId: VALID_UUID }));
    const [url] = fetchMock.mock.calls[0] as [string];
    expect(url).toBe("https://diagnosdata.rhemadata.com/api/analysis-worker");
    process.env.NEXT_PUBLIC_APP_URL = original;
  });

  it("não bloqueia a resposta quando o fetch do worker rejeita (REL-06)", async () => {
    mockGenerateReport.mockResolvedValue({ ok: true, queued: true });
    const fetchMock = mockFetchOnce(() => Promise.reject(new Error("worker down")));
    const { POST } = await import("./route");
    const res = await POST(makeRequest({ leadId: VALID_UUID }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ ok: true, queued: true });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("pula o disparo quando INTERNAL_API_KEY não está configurada e segue com 200 (REL-06)", async () => {
    mockGenerateReport.mockResolvedValue({ ok: true, queued: true });
    const fetchMock = mockFetchOnce(() => Promise.resolve(new Response(JSON.stringify({ ok: true }), { status: 200 })));
    const original = process.env.INTERNAL_API_KEY;
    delete process.env.INTERNAL_API_KEY;
    const { POST } = await import("./route");
    const res = await POST(makeRequest({ leadId: VALID_UUID }));
    expect(res.status).toBe(200);
    expect(fetchMock).not.toHaveBeenCalled();
    process.env.INTERNAL_API_KEY = original;
  });
});
