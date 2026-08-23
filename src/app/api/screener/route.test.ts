import { describe, it, expect, vi, beforeAll } from "vitest";

vi.mock("@/lib/supabase/server", () => ({
  getServiceClient: vi.fn().mockReturnValue({}),
}));

vi.mock("@/lib/report/report-generator", () => ({
  generateScreenerPdf: vi.fn().mockResolvedValue({
    pdf: Buffer.from("fake-pdf"),
    filename: "diagnostico.pdf",
  }),
}));

vi.mock("@/lib/email/send-report", () => ({
  sendReportEmail: vi.fn().mockResolvedValue(undefined),
}));

const mockSubmitScreener = vi.fn().mockResolvedValue({ ok: true });
vi.mock("@/lib/service/screen-service", () => ({
  createScreenService: vi.fn().mockReturnValue({
    submitScreener: mockSubmitScreener,
  }),
  ScreenServiceError: class ScreenServiceError extends Error {
    status: number;
    constructor(message: string, status: number) {
      super(message);
      this.status = status;
    }
  },
}));

beforeAll(() => {
  process.env.INTERNAL_API_KEY = "a".repeat(64) + "-test-key-for-screener-route";
});

function makeRequest(body: unknown) {
  return new Request("http://localhost/api/screener", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-internal-api-key": process.env.INTERNAL_API_KEY!,
    },
    body: JSON.stringify(body),
  });
}

const DIMS = [
  "d01", "d02", "d03", "d04", "d05",
  "d06", "d07", "d08", "d09", "d10",
];

function validBody() {
  return {
    name: "João Silva",
    role: "CTO",
    email: "joao@corp.com",
    consent: true,
    consentText: "Autorizo",
    context: { ctx_01: "C-level", ctx_02: "51 a 200" },
    answers: DIMS.map((id) => ({ dimensionId: id, nivel: 3 })),
    commercialAnswer: "Até R$ 50 mil",
  };
}

describe("POST /api/screener", () => {
  it("retorna 401 sem internal key", async () => {
    const { POST } = await import("./route");
    const req = new Request("http://localhost/api/screener", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(validBody()),
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("retorna 400 para payload inválido", async () => {
    const { POST } = await import("./route");
    const req = makeRequest({ name: "A" });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("retorna 201 para payload válido", async () => {
    const { POST } = await import("./route");
    const req = makeRequest(validBody());
    const res = await POST(req);
    expect(res.status).toBe(201);
  });

  it("retorna 409 para lead duplicado", async () => {
    mockSubmitScreener.mockRejectedValueOnce(
      new (await import("@/lib/service/screen-service")).ScreenServiceError(
        "Já existe uma solicitação pendente para este email.",
        409,
      ),
    );
    const { POST } = await import("./route");
    const req = makeRequest(validBody());
    const res = await POST(req);
    expect(res.status).toBe(409);
  });
});
