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
    const req = new Request("http://localhost/api/admin-proxy/dashboard", { method: "GET" });

    await proxyToInternal(req, { target: "admin/dashboard" });
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
    const req = new Request("http://localhost/api/admin-proxy/dashboard");
    const res = await proxyToInternal(req, { target: "admin/dashboard" });
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

interface ForwardedCall {
  url: string;
  init: RequestInit;
}

function lastForwardedCall(): ForwardedCall {
  const calls = mockFetch.mock.calls;
  const call = calls[calls.length - 1];
  const init: RequestInit = call[1];
  return { url: String(call[0]), init };
}

function forwardedBody(init: RequestInit): string {
  return init.body instanceof Uint8Array ? new TextDecoder().decode(init.body) : "";
}

function forwardedHeader(init: RequestInit, name: string): string | null {
  return new Headers(init.headers).get(name);
}

describe("proxy: query string", () => {
  it("repassa a query string do request para a URL interna (GET)", async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ municipios: ["São Paulo"] }), {
        status: 200,
        headers: { "content-type": "application/json" },
      })
    );

    const { proxyToInternal } = await importFresh();
    const req = new Request("http://localhost/api/public-proxy/localidades?uf=SP", {
      method: "GET",
    });

    const res = await proxyToInternal(req, { target: "localidades" });
    expect(res.status).toBe(200);

    const { url, init } = lastForwardedCall();
    expect(url).toBe("http://localhost/api/localidades?uf=SP");
    expect(init.method).toBe("GET");
    expect(forwardedHeader(init, "x-internal-api-key")).toBe(process.env.INTERNAL_API_KEY);
  });

  it("sem query string chama a URL interna sem `?`", async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ municipios: [] }), {
        status: 200,
        headers: { "content-type": "application/json" },
      })
    );

    const { proxyToInternal } = await importFresh();
    const req = new Request("http://localhost/api/public-proxy/localidades", { method: "GET" });

    await proxyToInternal(req, { target: "localidades" });

    const { url } = lastForwardedCall();
    expect(url).toBe("http://localhost/api/localidades");
    expect(url).not.toContain("?");
  });

  it("POST sem query string mantém método, URL e corpo (regressão)", async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ id: "lead-1" }), {
        status: 201,
        headers: { "content-type": "application/json" },
      })
    );

    const { proxyToInternal } = await importFresh();
    const payload = { name: "Test", email: "test@example.com" };
    const req = new Request("http://localhost/api/public-proxy/leads", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });

    await proxyToInternal(req, { target: "leads" });

    const { url, init } = lastForwardedCall();
    expect(url).toBe("http://localhost/api/leads");
    expect(init.method).toBe("POST");
    expect(forwardedHeader(init, "content-type")).toBe("application/json");
    expect(JSON.parse(forwardedBody(init))).toEqual(payload);
  });

  it("POST com query string ainda encaminha o corpo", async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "content-type": "application/json" },
      })
    );

    const { proxyToInternal } = await importFresh();
    const payload = { response: { answers: { q1: 3 } } };
    const req = new Request("http://localhost/api/public-proxy/screener?x=1", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });

    await proxyToInternal(req, { target: "screener" });

    const { url, init } = lastForwardedCall();
    expect(url).toBe("http://localhost/api/screener?x=1");
    expect(init.method).toBe("POST");
    expect(JSON.parse(forwardedBody(init))).toEqual(payload);
  });
});
