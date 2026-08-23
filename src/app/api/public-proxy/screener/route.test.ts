import { describe, it, expect, vi, beforeAll } from "vitest";

const mockFetch = vi.fn();
globalThis.fetch = mockFetch as unknown as typeof fetch;

beforeAll(() => {
  process.env.INTERNAL_API_KEY = "a".repeat(64) + "-screener-proxy-test";
});

async function importFresh() {
  const mod = await import("./route");
  return mod;
}

describe("POST /api/public-proxy/screener", () => {
  it("repassa para /api/screener com internal key", async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ ok: true }), {
        status: 201,
        headers: { "content-type": "application/json" },
      }),
    );

    const { POST } = await importFresh();
    const req = new Request("http://localhost/api/public-proxy/screener", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "Test" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(201);

    const [calledUrl, calledInit] = mockFetch.mock.calls[0];
    expect(calledUrl).toBe("http://localhost/api/screener");
    const headers = (calledInit.headers as Headers).get
      ? (calledInit.headers as Headers)
      : new Headers(calledInit.headers as Record<string, string>);
    expect(headers.get("x-internal-api-key")).toBe(process.env.INTERNAL_API_KEY);
  });

  it("propaga status de erro da API interna", async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ error: "Dados inválidos" }), {
        status: 400,
        headers: { "content-type": "application/json" },
      }),
    );

    const { POST } = await importFresh();
    const req = new Request("http://localhost/api/public-proxy/screener", {
      method: "POST",
      body: JSON.stringify({}),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("retorna 502 quando fetch falha", async () => {
    mockFetch.mockRejectedValueOnce(new Error("ECONNREFUSED"));
    const { POST } = await importFresh();
    const req = new Request("http://localhost/api/public-proxy/screener", {
      method: "POST",
      body: JSON.stringify({}),
    });
    const res = await POST(req);
    expect(res.status).toBe(502);
  });
});
