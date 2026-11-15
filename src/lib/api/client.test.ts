import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError, getMunicipios, submitLead } from "./client";

const fetchMock = vi.fn();

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

async function captureError(promise: Promise<unknown>): Promise<unknown> {
  try {
    await promise;
  } catch (error) {
    return error;
  }
  throw new Error("esperava que a promise rejeitasse");
}

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("getMunicipios", () => {
  it("busca os municípios pelo proxy com a UF na query string", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ municipios: ["São Paulo", "Campinas", "Santos"] }),
    );

    const municipios = await getMunicipios("SP");

    expect(municipios).toEqual(["São Paulo", "Campinas", "Santos"]);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/public-proxy/localidades?uf=SP");
    expect(init.method).toBe("GET");
  });

  it("codifica a UF com caracteres especiais", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ municipios: [] }));

    await getMunicipios("S P");

    const [url] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/public-proxy/localidades?uf=S%20P");
  });

  it.each([
    [400, "UF inválida"],
    [502, "Serviço de localidades indisponível"],
  ])(
    "propaga o ApiError %i do proxy com a mensagem do servidor",
    async (status, message) => {
      fetchMock.mockResolvedValueOnce(jsonResponse({ error: message }, status));

      const error = await captureError(getMunicipios("SP"));

      expect(error).toBeInstanceOf(ApiError);
      expect(error).toMatchObject({ status, message });
    },
  );

  it.each([
    [{}],
    [{ municipios: null }],
    [{ municipios: "São Paulo" }],
    [null],
  ])(
    "lança ApiError 502 quando a resposta não traz um array de municípios (%o)",
    async (body) => {
      fetchMock.mockResolvedValueOnce(jsonResponse(body));

      const error = await captureError(getMunicipios("SP"));

      expect(error).toBeInstanceOf(ApiError);
      expect(error).toMatchObject({
        status: 502,
        message: "Resposta inválida do serviço de localidades",
      });
    },
  );
});

describe("submitLead", () => {
  const baseLead = {
    name: "Ana Souza",
    company: "Acme Dados",
    phone: "11999999999",
    email: "ana@acme.com",
    role: "Diretora de Dados",
  };

  it("envia cidade e estado no corpo do cadastro", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ ok: true, leadId: "lead-123" }),
    );

    const result = await submitLead({
      ...baseLead,
      city: "São Paulo",
      state: "SP",
    });

    expect(result).toEqual({ ok: true, leadId: "lead-123" });

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/public-proxy/leads");
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body as string)).toEqual({
      ...baseLead,
      city: "São Paulo",
      state: "SP",
    });
  });

  it("continua funcionando sem cidade e estado", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ ok: true, leadId: "lead-456" }),
    );

    const result = await submitLead(baseLead);

    expect(result).toEqual({ ok: true, leadId: "lead-456" });

    const body = JSON.parse(fetchMock.mock.calls[0][1].body as string);
    expect(body).toEqual(baseLead);
    expect(body).not.toHaveProperty("city");
    expect(body).not.toHaveProperty("state");
  });

  it("repassa o honeypot website quando presente", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ ok: true }));

    await submitLead({ ...baseLead, website: "https://spam.example" });

    const body = JSON.parse(fetchMock.mock.calls[0][1].body as string);
    expect(body.website).toBe("https://spam.example");
  });
});
