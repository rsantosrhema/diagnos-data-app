import { describe, it, expect, vi, beforeAll, beforeEach } from "vitest";

const mockProcessNext = vi.fn();
const mockFailStale = vi.fn();

const { mockVerifyInternalApiKey } = vi.hoisted(() => ({
  mockVerifyInternalApiKey: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  getServiceClient: vi.fn().mockReturnValue({}),
}));

vi.mock("@/lib/auth/internal-key", () => ({
  verifyInternalApiKey: mockVerifyInternalApiKey,
}));

vi.mock("@/lib/repository/assessment-repo", () => ({
  createAssessmentRepository: vi.fn().mockReturnValue({
    findByLeadId: vi.fn().mockResolvedValue(null),
  }),
}));

vi.mock("@/lib/repository/market-insights-repo", () => ({
  createMarketInsightsRepository: vi.fn().mockReturnValue({
    upsert: vi.fn(),
    findByLeadId: vi.fn(),
    markStatus: vi.fn(),
  }),
}));

vi.mock("@/lib/repository/analysis-queue-repo", () => ({
  createAnalysisQueueRepository: vi.fn().mockReturnValue({
    enqueue: vi.fn(),
    pop: vi.fn(),
  }),
}));

vi.mock("@/lib/service/analysis-service", () => ({
  createAnalysisService: vi.fn().mockReturnValue({
    enqueue: vi.fn(),
    processNext: mockProcessNext,
    failStale: mockFailStale,
  }),
}));

beforeAll(() => {
  process.env.INTERNAL_API_KEY = "a".repeat(64) + "-test-key-for-worker-route";
  process.env.CRON_SECRET = "cron-secret-real";
});

beforeEach(() => {
  mockVerifyInternalApiKey.mockReset();
  mockProcessNext.mockReset();
  mockFailStale.mockReset();
  mockVerifyInternalApiKey.mockReturnValue(true);
  mockProcessNext.mockResolvedValue({ processed: true });
  mockFailStale.mockResolvedValue(0);
});

function makeRequest() {
  return new Request("http://localhost/api/analysis-worker", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-internal-api-key": process.env.INTERNAL_API_KEY!,
    },
  });
}

describe("POST /api/analysis-worker", () => {
  it("retorna 401 sem internal key", async () => {
    mockVerifyInternalApiKey.mockReturnValue(false);
    const { POST } = await import("./route");
    const req = new Request("http://localhost/api/analysis-worker", {
      method: "POST",
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("retorna 500 claro quando CRON_SECRET não está configurado", async () => {
    mockVerifyInternalApiKey.mockReturnValue(false);
    const original = process.env.CRON_SECRET;
    delete process.env.CRON_SECRET;
    const { POST } = await import("./route");
    const req = new Request("http://localhost/api/analysis-worker", {
      method: "POST",
    });
    const res = await POST(req);
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body).toMatchObject({ error: expect.stringContaining("CRON_SECRET") });
    process.env.CRON_SECRET = original;
  });

  it("retorna 401 sem internal key e com cron secret errado", async () => {
    mockVerifyInternalApiKey.mockReturnValue(false);
    const { POST } = await import("./route");
    const req = new Request("http://localhost/api/analysis-worker", {
      method: "POST",
      headers: { authorization: "Bearer cron-secret-errado" },
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("retorna 200 com cron secret válido via Authorization", async () => {
    mockVerifyInternalApiKey.mockReturnValue(false);
    const { POST } = await import("./route");
    const req = new Request("http://localhost/api/analysis-worker", {
      method: "POST",
      headers: { authorization: "Bearer cron-secret-real" },
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toMatchObject({ ok: true });
  });

  it("retorna 200 com internal key válida", async () => {
    const { POST } = await import("./route");
    const res = await POST(makeRequest());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toMatchObject({ ok: true });
  });

  it("chama failStale com 30 minutos no início do drain", async () => {
    const { POST } = await import("./route");
    const res = await POST(makeRequest());
    expect(res.status).toBe(200);
    expect(mockFailStale).toHaveBeenCalledWith(30);
  });

  it("não derruba o worker quando failStale falha (loga e segue)", async () => {
    mockFailStale.mockRejectedValue(new Error("stale rpc down"));
    const { POST } = await import("./route");
    const res = await POST(makeRequest());
    expect(res.status).toBe(200);
    expect(mockProcessNext).toHaveBeenCalled();
  });
});
