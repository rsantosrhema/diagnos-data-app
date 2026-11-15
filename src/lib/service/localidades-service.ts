import "server-only";
import { z } from "zod";
import type { UF } from "@/lib/localidades/estados";

export class LocalidadesServiceError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "LocalidadesServiceError";
  }
}

const IBGE_MUNICIPIOS_BASE_URL =
  "https://servicodados.ibge.gov.br/api/v1/localidades/estados";

const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const REQUEST_TIMEOUT_MS = 4000;

const UNAVAILABLE_MESSAGE = "Serviço de localidades indisponível";

const municipiosResponseSchema = z.array(
  z.object({ nome: z.string() }).passthrough(),
);

type CacheEntry = { expiresAt: number; nomes: string[] };

const cache = new Map<UF, CacheEntry>();

const collator = new Intl.Collator("pt-BR");

export function createLocalidadesService(
  deps: { fetchImpl?: typeof fetch; now?: () => number } = {},
) {
  const fetchImpl = deps.fetchImpl ?? fetch;
  const now = deps.now ?? Date.now;

  return {
    async listMunicipios(uf: UF): Promise<string[]> {
      const cached = cache.get(uf);
      if (cached && cached.expiresAt > now()) {
        return [...cached.nomes];
      }

      const url = `${IBGE_MUNICIPIOS_BASE_URL}/${uf}/municipios?orderBy=nome`;
      let payload: unknown;

      try {
        const response = await fetchImpl(url, {
          signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        });
        if (!response.ok) {
          throw new LocalidadesServiceError(UNAVAILABLE_MESSAGE, 502);
        }
        payload = await response.json();
      } catch (err) {
        if (err instanceof LocalidadesServiceError) {
          throw err;
        }
        throw new LocalidadesServiceError(UNAVAILABLE_MESSAGE, 502);
      }

      const parsed = municipiosResponseSchema.safeParse(payload);
      if (!parsed.success) {
        throw new LocalidadesServiceError(UNAVAILABLE_MESSAGE, 502);
      }

      const nomes = parsed.data
        .map((municipio) => municipio.nome)
        .sort((a, b) => collator.compare(a, b));

      cache.set(uf, { expiresAt: now() + CACHE_TTL_MS, nomes });

      return [...nomes];
    },
  };
}
