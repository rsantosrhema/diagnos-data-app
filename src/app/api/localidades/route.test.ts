import { describe, it, expect, vi, beforeAll, beforeEach } from "vitest";

const { mockVerifyInternalApiKey, mockListMunicipios, mockCreateLocalidadesService } =
  vi.hoisted(() => ({
    mockVerifyInternalApiKey: vi.fn(),
    mockListMunicipios: vi.fn(),
    mockCreateLocalidadesService: vi.fn(),
  }));

vi.mock("@/lib/auth/internal-key", () => ({
  verifyInternalApiKey: mockVerifyInternalApiKey,
}));

vi.mock("@/lib/service/localidades-service", () => {
  class LocalidadesServiceError extends Error {
    readonly status: number;

    constructor(message: string, status: number) {
      super(message);
      this.name = "LocalidadesServiceError";
      this.status = status;
    }
  }

  return {
    createLocalidadesService: mockCreateLocalidadesService,
    LocalidadesServiceError,
  };
});

beforeAll(() => {
  process.env.INTERNAL_API_KEY = "a".repeat(64) + "-test-key-for-localidades-route";
});

beforeEach(() => {
  mockVerifyInternalApiKey.mockReset();
  mockListMunicipios.mockReset();
  mockCreateLocalidadesService.mockReset();
  mockVerifyInternalApiKey.mockReturnValue(true);
  mockListMunicipios.mockResolvedValue([]);
  mockCreateLocalidadesService.mockReturnValue({ listMunicipios: mockListMunicipios });
});

function makeRequest(query = "") {
  return new Request(`http://localhost/api/localidades${query}`, {
    method: "GET",
    headers: {
      "x-internal-api-key": process.env.INTERNAL_API_KEY ?? "",
    },
  });
}

async function importGet() {
  const { GET } = await import("./route");
  return GET;
}

describe("GET /api/localidades", () => {
  it("retorna 200 com { municipios } e chama o service com a UF (LOC-06)", async () => {
    mockListMunicipios.mockResolvedValue(["Americana", "Campinas", "São Paulo"]);
    const GET = await importGet();

    const res = await GET(makeRequest("?uf=SP"));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ municipios: ["Americana", "Campinas", "São Paulo"] });
    expect(mockListMunicipios).toHaveBeenCalledWith("SP");
  });

  it("retorna 400 quando uf está ausente (LOC-08)", async () => {
    const GET = await importGet();

    const res = await GET(makeRequest());

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("UF inválida");
    expect(mockListMunicipios).not.toHaveBeenCalled();
  });

  it("retorna 400 para UF fora das 27 siglas (LOC-08)", async () => {
    const GET = await importGet();

    const res = await GET(makeRequest("?uf=XX"));

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("UF inválida");
    expect(mockListMunicipios).not.toHaveBeenCalled();
  });

  it("retorna 400 para sigla em minúscula (LOC-08)", async () => {
    const GET = await importGet();

    const res = await GET(makeRequest("?uf=sp"));

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("UF inválida");
    expect(mockListMunicipios).not.toHaveBeenCalled();
  });

  it("retorna 401 sem internal key válida e não chama o service (LOC-08)", async () => {
    mockVerifyInternalApiKey.mockReturnValue(false);
    const GET = await importGet();

    const res = await GET(makeRequest("?uf=SP"));

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe("Chave interna inválida");
    expect(mockCreateLocalidadesService).not.toHaveBeenCalled();
    expect(mockListMunicipios).not.toHaveBeenCalled();
  });

  it("retorna 502 com a mensagem genérica quando o IBGE está indisponível (LOC-06)", async () => {
    const { LocalidadesServiceError } = await import("@/lib/service/localidades-service");
    mockListMunicipios.mockRejectedValue(
      new LocalidadesServiceError("Serviço de localidades indisponível", 502),
    );
    const GET = await importGet();

    const res = await GET(makeRequest("?uf=SP"));

    expect(res.status).toBe(502);
    const body = await res.json();
    expect(body.error).toBe("Serviço de localidades indisponível");
  });

  it("retorna 500 genérico em erro inesperado sem vazar a mensagem interna", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    mockListMunicipios.mockRejectedValue(new Error("falha interna do ibge: token=segredo"));
    const GET = await importGet();

    try {
      const res = await GET(makeRequest("?uf=SP"));

      expect(res.status).toBe(500);
      const body = await res.json();
      expect(body).toEqual({ error: "Erro interno" });
      expect(JSON.stringify(body)).not.toContain("token=segredo");
      expect(errorSpy).toHaveBeenCalled();
    } finally {
      errorSpy.mockRestore();
    }
  });
});
