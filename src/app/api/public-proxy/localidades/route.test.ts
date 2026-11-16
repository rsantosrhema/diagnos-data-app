import { describe, it, expect, vi, beforeAll, beforeEach } from "vitest";

const mockFetch = vi.fn();
globalThis.fetch = mockFetch as unknown as typeof fetch;

beforeAll(() => {
  process.env.INTERNAL_API_KEY = "a".repeat(64) + "-localidades-proxy-test";
});

beforeEach(() => {
  mockFetch.mockReset();
});

async function importFresh() {
  const mod = await import("./route");
  return mod;
}

function lastForwardedCall(): { url: string; init: RequestInit } {
  const calls = mockFetch.mock.calls;
  const call = calls[calls.length - 1];
  return { url: String(call[0]), init: call[1] };
}

function forwardedHeader(init: RequestInit, name: string): string | null {
  return new Headers(init.headers).get(name);
}

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

describe("GET /api/public-proxy/localidades", () => {
  it("repassa ?uf=SP para /api/localidades com a internal key e método GET (LOC-08)", async () => {
    mockFetch.mockResolvedValueOnce(
      jsonResponse({ municipios: ["Campinas", "São Paulo"] }, 200),
    );

    const { GET } = await importFresh();
    const req = new Request("http://localhost/api/public-proxy/localidades?uf=SP", {
      method: "GET",
    });

    const res = await GET(req);

    expect(res.status).toBe(200);
    const { url, init } = lastForwardedCall();
    expect(url).toBe("http://localhost/api/localidades?uf=SP");
    expect(init.method).toBe("GET");
    expect(forwardedHeader(init, "x-internal-api-key")).toBe(process.env.INTERNAL_API_KEY);
  });

  it("retorna o corpo e o status da API interna sem alteração (LOC-08)", async () => {
    const body = { municipios: ["Americana", "Campinas", "São Paulo"] };
    mockFetch.mockResolvedValueOnce(jsonResponse(body, 200));

    const { GET } = await importFresh();
    const res = await GET(
      new Request("http://localhost/api/public-proxy/localidades?uf=SP", { method: "GET" }),
    );

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(body);
  });

  it("propaga o 400 da rota interna (LOC-08)", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ error: "UF inválida" }, 400));

    const { GET } = await importFresh();
    const res = await GET(
      new Request("http://localhost/api/public-proxy/localidades?uf=XX", { method: "GET" }),
    );

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "UF inválida" });
  });

  it("retorna 502 quando o fetch falha (LOC-08)", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    mockFetch.mockRejectedValueOnce(new Error("ECONNREFUSED"));

    try {
      const { GET } = await importFresh();
      const res = await GET(
        new Request("http://localhost/api/public-proxy/localidades?uf=SP", { method: "GET" }),
      );

      expect(res.status).toBe(502);
    } finally {
      errorSpy.mockRestore();
    }
  });

  it("sem query string chama a URL interna sem `?` (LOC-08)", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ municipios: [] }, 200));

    const { GET } = await importFresh();
    await GET(
      new Request("http://localhost/api/public-proxy/localidades", { method: "GET" }),
    );

    const { url } = lastForwardedCall();
    expect(url).toBe("http://localhost/api/localidades");
    expect(url).not.toContain("?");
  });
});
