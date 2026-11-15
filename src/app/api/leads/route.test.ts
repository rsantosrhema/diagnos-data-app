import { describe, it, expect, vi, beforeAll, beforeEach } from "vitest";

const { mockVerifyInternalApiKey, mockCreateLeadRepository, mockCreateLeadService, mockCreateLead } =
  vi.hoisted(() => ({
    mockVerifyInternalApiKey: vi.fn(),
    mockCreateLeadRepository: vi.fn(),
    mockCreateLeadService: vi.fn(),
    mockCreateLead: vi.fn(),
  }));

vi.mock("@/lib/auth/internal-key", () => ({
  verifyInternalApiKey: mockVerifyInternalApiKey,
}));

vi.mock("@/lib/supabase/server", () => ({
  getServiceClient: vi.fn().mockReturnValue({}),
}));

vi.mock("@/lib/repository/lead-repo", () => ({
  createLeadRepository: mockCreateLeadRepository,
}));

vi.mock("@/lib/service/lead-service", () => ({
  createLeadService: mockCreateLeadService,
  LeadServiceError: class LeadServiceError extends Error {
    status: number;
    constructor(message: string, status: number) {
      super(message);
      this.status = status;
      this.name = "LeadServiceError";
    }
  },
}));

const VALID_BODY = {
  name: "Maria Souza",
  company: "Acme Dados",
  phone: "11999998888",
  email: "maria@acme.com",
  role: "Analista, engenheiro ou especialista",
  state: "SP",
  city: "São Paulo",
};

beforeAll(() => {
  process.env.INTERNAL_API_KEY = "a".repeat(64) + "-test-key-for-leads-route";
});

beforeEach(() => {
  mockVerifyInternalApiKey.mockReset();
  mockCreateLeadRepository.mockReset();
  mockCreateLeadService.mockReset();
  mockCreateLead.mockReset();
  mockVerifyInternalApiKey.mockReturnValue(true);
  mockCreateLeadRepository.mockReturnValue({});
  mockCreateLeadService.mockReturnValue({ createLead: mockCreateLead });
});

function makeRequest(body: unknown) {
  return new Request("http://localhost/api/leads", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-internal-api-key": process.env.INTERNAL_API_KEY!,
    },
    body: JSON.stringify(body),
  });
}

async function importRoute() {
  const mod = await import("./route");
  return mod.POST;
}

describe("POST /api/leads", () => {
  it("retorna 401 sem internal key e não chama o service (LOC-04)", async () => {
    mockVerifyInternalApiKey.mockReturnValue(false);
    const POST = await importRoute();
    const res = await POST(makeRequest(VALID_BODY));
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe("Chave interna inválida");
    expect(mockCreateLead).not.toHaveBeenCalled();
  });

  it("retorna 400 com issues.state para UF inválida (LOC-05)", async () => {
    const POST = await importRoute();
    const res = await POST(makeRequest({ ...VALID_BODY, state: "XX" }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Dados inválidos");
    expect(body.issues).toHaveProperty("state");
    expect(mockCreateLead).not.toHaveBeenCalled();
  });

  it.each([
    ["vazia", ""],
    ["com menor que", "S<o Paulo"],
    ["com maior que", "S>o Paulo"],
    ["com mais de 80 caracteres", "A".repeat(81)],
  ])("retorna 400 com issues.city quando a cidade é %s (LOC-05)", async (_label, city) => {
    const POST = await importRoute();
    const res = await POST(makeRequest({ ...VALID_BODY, city }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Dados inválidos");
    expect(body.issues).toHaveProperty("city");
    expect(mockCreateLead).not.toHaveBeenCalled();
  });

  it("retorna 201 repassando city saneada/aparada e state inalterado ao service (LOC-04)", async () => {
    const serviceResult = { ok: true, leadId: "lead-1" };
    const serviceInput = {
      name: "Maria Souza",
      company: "Acme Dados",
      phone: "11999998888",
      email: "maria@acme.com",
      role: "Analista, engenheiro ou especialista",
      city: "São Paulo",
      state: "SP",
    };
    mockCreateLead.mockResolvedValue(serviceResult);
    const POST = await importRoute();
    const res = await POST(
      makeRequest({ ...VALID_BODY, city: "  São Paulo  ", email: "  MARIA@acme.com  " }),
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body).toEqual(serviceResult);
    expect(mockCreateLead).toHaveBeenCalledWith(serviceInput);
  });

  it("retorna 200 sem chamar o service quando o honeypot está preenchido (LOC-04)", async () => {
    const POST = await importRoute();
    const res = await POST(makeRequest({ ...VALID_BODY, website: "http://spam.example" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ ok: true });
    expect(mockCreateLead).not.toHaveBeenCalled();
  });

  it("propaga LeadServiceError 409 com a mensagem do service (LOC-04)", async () => {
    const { LeadServiceError } = await import("@/lib/service/lead-service");
    const message =
      "Este email já concluiu o diagnóstico. Entre em contato com nosso time comercial para mais informações.";
    mockCreateLead.mockRejectedValue(new LeadServiceError(message, 409));
    const POST = await importRoute();
    const res = await POST(makeRequest(VALID_BODY));
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.error).toBe(message);
  });

  it("retorna 500 genérico sem vazar detalhes quando o service falha inesperadamente (LOC-04)", async () => {
    mockCreateLead.mockRejectedValue(new Error("boom: connection refused"));
    const POST = await importRoute();
    const res = await POST(makeRequest(VALID_BODY));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe("Erro ao salvar cadastro");
    expect(JSON.stringify(body)).not.toContain("boom");
  });
});
