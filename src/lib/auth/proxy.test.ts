import { describe, it, expect, beforeAll, vi } from "vitest";

const mockFetch = vi.fn();
globalThis.fetch = mockFetch as unknown as typeof fetch;

beforeAll(() => {
  process.env.INTERNAL_API_KEY = "a".repeat(64) + "-secret-for-proxy-tests";
});

async function importFresh() {
  const mod = await import("./proxy");
  return mod;
}

describe("proxy", () => {
  it("adiciona X-Internal-Api-Key e repassa Authorization", async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "content-type": "application/json" },
      })
    );

    const { proxyToInternal } = await importFresh();
    const req = new Request("http://localhost/api/public-proxy/leads", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: "Bearer abc.def.ghi",
      },
      body: JSON.stringify({ name: "Test" }),
    });

    const res = await proxyToInternal(req, { target: "leads" });
    expect(res.status).toBe(200);

    const [calledUrl, calledInit] = mockFetch.mock.calls[0];
    expect(calledUrl).toBe("http://localhost/api/leads");
    const headers = (calledInit.headers as Headers).get
      ? (calledInit.headers as Headers)
      : new Headers(calledInit.headers as Record<string, string>);
    expect(headers.get("x-internal-api-key")).toBe(process.env.INTERNAL_API_KEY);
    expect(headers.get("authorization")).toBe("Bearer abc.def.ghi");
    expect(headers.get("content-type")).toBe("application/json");
  });

  it("repasse o método HTTP do request", async () => {
    mockFetch.mockResolvedValueOnce(
      new Response("[]", { status: 200, headers: { "content-type": "application/json" } })
    );

    const { proxyToInternal } = await importFresh();
    const req = new Request("http://localhost/api/admin-proxy/tokens", { method: "GET" });
    await proxyToInternal(req, { target: "admin/tokens" });

    const [, calledInit] = mockFetch.mock.calls[1];
    expect(calledInit.method).toBe("GET");
  });

  it("propaga o status de erro da API interna", async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { "content-type": "application/json" },
      })
    );

    const { proxyToInternal } = await importFresh();
    const req = new Request("http://localhost/api/admin-proxy/tokens");
    const res = await proxyToInternal(req, { target: "admin/tokens" });
    expect(res.status).toBe(401);
  });

  it("retorna 502 quando fetch falha", async () => {
    mockFetch.mockRejectedValueOnce(new Error("ECONNREFUSED"));
    const { proxyToInternal } = await importFresh();
    const req = new Request("http://localhost/api/public-proxy/leads");
    const res = await proxyToInternal(req, { target: "leads" });
    expect(res.status).toBe(502);
  });
});
