import { describe, it, expect, vi } from "vitest";
import {
  createLocalidadesService,
  LocalidadesServiceError,
} from "./localidades-service";

const MENSAGEM_INDISPONIVEL = "Serviço de localidades indisponível";
const TTL_24H_MS = 24 * 60 * 60 * 1000;

function jsonResponse(payload: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(payload), {
    status: 200,
    headers: { "content-type": "application/json" },
    ...init,
  });
}

function mockFetch(payload: unknown, init: ResponseInit = {}) {
  return vi.fn<typeof fetch>(async () => jsonResponse(payload, init));
}

describe("localidadesService", () => {
  describe("listMunicipios", () => {
    it("retorna municípios em ordem alfabética preservando acentos e nomes compostos", async () => {
      const fetchImpl = mockFetch([
        { id: 3543402, nome: "São José do Rio Preto" },
        { id: 3502804, nome: "Americana" },
        { id: 3500501, nome: "Águas de Lindóia" },
      ]);
      const service = createLocalidadesService({ fetchImpl, now: () => 0 });

      const municipios = await service.listMunicipios("SP");

      expect(municipios).toEqual([
        "Águas de Lindóia",
        "Americana",
        "São José do Rio Preto",
      ]);
      expect(municipios).toContain("São José do Rio Preto");
    });

    it("chama a URL exata do IBGE para a UF com sinal de aborto de 4 s", async () => {
      const timeoutSpy = vi.spyOn(AbortSignal, "timeout");
      const fetchImpl = mockFetch([{ nome: "Rio de Janeiro" }]);
      const service = createLocalidadesService({ fetchImpl, now: () => 0 });

      await service.listMunicipios("RJ");

      expect(fetchImpl).toHaveBeenCalledTimes(1);
      const [url, init] = fetchImpl.mock.calls[0] ?? [];
      expect(url).toBe(
        "https://servicodados.ibge.gov.br/api/v1/localidades/estados/RJ/municipios?orderBy=nome",
      );
      expect(String(url)).toContain("/estados/RJ/municipios?orderBy=nome");
      expect(init?.signal).toBeInstanceOf(AbortSignal);
      expect(timeoutSpy).toHaveBeenCalledWith(4000);
      timeoutSpy.mockRestore();
    });

    it("cacheia por UF por 24 h e refaz a busca depois do vencimento", async () => {
      const fetchImpl = mockFetch([{ nome: "Belo Horizonte" }]);
      let clock = 1_000;
      const service = createLocalidadesService({
        fetchImpl,
        now: () => clock,
      });

      await expect(service.listMunicipios("MG")).resolves.toEqual([
        "Belo Horizonte",
      ]);
      await expect(service.listMunicipios("MG")).resolves.toEqual([
        "Belo Horizonte",
      ]);
      expect(fetchImpl).toHaveBeenCalledTimes(1);

      clock += TTL_24H_MS + 1;
      await expect(service.listMunicipios("MG")).resolves.toEqual([
        "Belo Horizonte",
      ]);
      expect(fetchImpl).toHaveBeenCalledTimes(2);
    });

    it("busca UFs diferentes separadamente", async () => {
      const fetchImpl = vi
        .fn<typeof fetch>()
        .mockResolvedValueOnce(jsonResponse([{ nome: "Belém" }]))
        .mockResolvedValueOnce(jsonResponse([{ nome: "Palmas" }]));
      const service = createLocalidadesService({ fetchImpl, now: () => 0 });

      await expect(service.listMunicipios("PA")).resolves.toEqual(["Belém"]);
      await expect(service.listMunicipios("TO")).resolves.toEqual(["Palmas"]);
      expect(fetchImpl).toHaveBeenCalledTimes(2);
      expect(fetchImpl.mock.calls[0]?.[0]).toContain("/estados/PA/");
      expect(fetchImpl.mock.calls[1]?.[0]).toContain("/estados/TO/");
    });

    it("lança LocalidadesServiceError 502 em falha de rede e não cacheia o erro", async () => {
      const fetchImpl = vi
        .fn<typeof fetch>()
        .mockRejectedValueOnce(new Error("network down"))
        .mockResolvedValueOnce(jsonResponse([{ nome: "Salvador" }]));
      const service = createLocalidadesService({ fetchImpl, now: () => 0 });

      const erro = await service.listMunicipios("BA").catch((err: unknown) => err);

      expect(erro).toBeInstanceOf(LocalidadesServiceError);
      expect(erro).toMatchObject({
        name: "LocalidadesServiceError",
        status: 502,
        message: MENSAGEM_INDISPONIVEL,
      });

      await expect(service.listMunicipios("BA")).resolves.toEqual(["Salvador"]);
      expect(fetchImpl).toHaveBeenCalledTimes(2);
    });

    it("lança LocalidadesServiceError 502 quando o fetch excede o tempo limite", async () => {
      const fetchImpl = vi.fn<typeof fetch>(async () => {
        throw new DOMException(
          "The operation was aborted due to timeout",
          "TimeoutError",
        );
      });
      const service = createLocalidadesService({ fetchImpl, now: () => 0 });

      await expect(service.listMunicipios("AL")).rejects.toMatchObject({
        name: "LocalidadesServiceError",
        status: 502,
        message: MENSAGEM_INDISPONIVEL,
      });
    });

    it("lança LocalidadesServiceError 502 em resposta HTTP não ok", async () => {
      const fetchImpl = mockFetch({ erro: "indisponível" }, { status: 500 });
      const service = createLocalidadesService({ fetchImpl, now: () => 0 });

      await expect(service.listMunicipios("SC")).rejects.toMatchObject({
        name: "LocalidadesServiceError",
        status: 502,
        message: MENSAGEM_INDISPONIVEL,
      });
    });

    it("lança LocalidadesServiceError 502 quando o payload não é um array", async () => {
      const fetchImpl = mockFetch({ municipios: [{ nome: "Recife" }] });
      const service = createLocalidadesService({ fetchImpl, now: () => 0 });

      await expect(service.listMunicipios("PE")).rejects.toMatchObject({
        status: 502,
      });
    });

    it("lança LocalidadesServiceError 502 quando falta nome no município", async () => {
      const fetchImpl = mockFetch([{ id: 2304400 }]);
      const service = createLocalidadesService({ fetchImpl, now: () => 0 });

      await expect(service.listMunicipios("CE")).rejects.toMatchObject({
        status: 502,
      });
    });

    it("lança LocalidadesServiceError 502 quando nome não é string", async () => {
      const fetchImpl = mockFetch([{ nome: 42 }]);
      const service = createLocalidadesService({ fetchImpl, now: () => 0 });

      await expect(service.listMunicipios("GO")).rejects.toMatchObject({
        status: 502,
      });
    });
  });
});
