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

const mockGetReportPdf = vi.fn();
vi.mock("@/lib/service/admin-service", () => ({
  createAdminService: vi.fn().mockReturnValue({
    getReportPdf: mockGetReportPdf,
  }),
  AdminServiceError: class AdminServiceError extends Error {
    status: number;
    constructor(message: string, status: number) {
      super(message);
      this.status = status;
    }
  },
}));

vi.mock("@/lib/report/report-generator", () => ({
  generateScreenerPdf: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  getServiceClient: vi.fn().mockReturnValue({}),
}));

vi.mock("@/lib/repository/lead-repo", () => ({ createLeadRepository: vi.fn().mockReturnValue({}) }));
vi.mock("@/lib/repository/assessment-repo", () => ({ createAssessmentRepository: vi.fn().mockReturnValue({}) }));
vi.mock("@/lib/repository/market-insights-repo", () => ({ createMarketInsightsRepository: vi.fn().mockReturnValue({}) }));
vi.mock("@/lib/repository/analysis-queue-repo", () => ({ createAnalysisQueueRepository: vi.fn().mockReturnValue({}) }));

beforeAll(() => {
  process.env.INTERNAL_API_KEY = "a".repeat(64) + "-test-key-for-report-pdf-route";
});

beforeEach(() => {
  mockVerifyInternalApiKey.mockReset();
  mockRequireManager.mockReset();
  mockUnauthorized.mockReset();
  mockGetReportPdf.mockReset();
  mockVerifyInternalApiKey.mockReturnValue(true);
  mockRequireManager.mockResolvedValue({ id: "manager-1", email: "m@rhema.com" });
  mockUnauthorized.mockReturnValue(
    new Response(JSON.stringify({ error: "Não autenticado" }), {
      status: 401,
      headers: { "content-type": "application/json" },
    }),
  );
});

const LEAD_ID = "c0b1f2e3-4a5b-6c7d-8e9f-0a1b2c3d4e5f";

function makeRequest() {
  return new Request(`http://localhost/api/admin/portal/${LEAD_ID}/report-pdf`, {
    method: "GET",
    headers: {
      "x-internal-api-key": process.env.INTERNAL_API_KEY!,
      host: "localhost",
    },
  });
}

function makeContext() {
  return { params: { leadId: LEAD_ID } };
}

describe("GET /api/admin/portal/[leadId]/report-pdf", () => {
  it("retorna 401 sem internal key", async () => {
    mockVerifyInternalApiKey.mockReturnValue(false);
    const { GET } = await import("./route");
    const res = await GET(makeRequest(), makeContext());
    expect(res.status).toBe(401);
  });

  it("retorna 401 quando não é gerente", async () => {
    mockRequireManager.mockResolvedValue(null);
    const { GET } = await import("./route");
    const res = await GET(makeRequest(), makeContext());
    expect(res.status).toBe(401);
  });

  it("retorna o PDF com headers de download em sucesso", async () => {
    mockGetReportPdf.mockResolvedValue({
      pdf: Buffer.from("%PDF-1.7 fake"),
      filename: "diagnostico-alice.pdf",
    });
    const { GET } = await import("./route");
    const res = await GET(makeRequest(), makeContext());

    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("application/pdf");
    expect(res.headers.get("content-disposition")).toBe(
      'attachment; filename="diagnostico-alice.pdf"',
    );
    const buf = Buffer.from(await res.arrayBuffer());
    expect(buf.toString("latin1")).toContain("%PDF-1.7");
    expect(mockGetReportPdf).toHaveBeenCalledWith(LEAD_ID);
  });

  it("mapeia AdminServiceError para o status do serviço", async () => {
    const { AdminServiceError } = await import("@/lib/service/admin-service");
    mockGetReportPdf.mockRejectedValue(
      new AdminServiceError("Relatório ainda não disponível", 409),
    );
    const { GET } = await import("./route");
    const res = await GET(makeRequest(), makeContext());
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.error).toBe("Relatório ainda não disponível");
  });

  it("retorna 500 para erros inesperados sem vazar detalhes", async () => {
    mockGetReportPdf.mockRejectedValue(new Error("boom"));
    const { GET } = await import("./route");
    const res = await GET(makeRequest(), makeContext());
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe("Erro interno");
  });
});
