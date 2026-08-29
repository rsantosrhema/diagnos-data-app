import { describe, it, expect, vi, beforeEach } from "vitest";
import { createResearcherAgent } from "./researcher";
import type { AgentPayload } from "@/lib/screener/agent-payload";
import type { Exa } from "exa-js";

function makePayload(overrides: Partial<AgentPayload> = {}): AgentPayload {
  return {
    versao: "1.0",
    solicitante: { nome: "João Silva", cargo: "CTO" },
    empresa: {
      nome: "Corp LTDA",
      porte: "51 a 200",
      segmento: "Indústria",
      funcionarios: "51 a 200",
      faturamento: "R$ 5 a 50 milhões",
    },
    contexto: {},
    perfil_empresa: {},
    respostas: [
      {
        dimensao_id: "d01",
        dimensao: "Governança",
        pergunta: "Como a empresa governa dados?",
        nivel: 2,
        peso: 10,
        resposta: "Ad hoc",
      },
    ],
    resposta_comercial: { pergunta: "Qual a faixa de investimento?", resposta: "Até R$ 50 mil" },
    score: { valor: 2.1, faixa: "Emergente", descricao: "Início" },
    risco: { dimensao_id: "d01", nivel: 2 },
    desequilibrio: false,
    consentimento: { aceito: true, texto: "ok", aceito_em: "2026-08-23T12:00:00Z" },
    ...overrides,
  };
}

function makeResult(title: string | null, url: string, highlights?: string[]) {
  return { title, url, ...(highlights ? { highlights } : {}) };
}

describe("createResearcherAgent", () => {
  let searchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    searchMock = vi.fn();
  });

  it("monta 4 queries (segmento, faturamento, porte, concorrentes) e consolida MarketResearch", async () => {
    searchMock.mockImplementation((query: string) =>
      Promise.resolve({
        results: [
          makeResult("Resultado A", "https://exemplo.com/a", ["snippet A"]),
          makeResult("Resultado B", "https://exemplo.com/b", ["snippet B"]),
        ],
      }),
    );

    const exa = { search: searchMock } as unknown as Pick<Exa, "search">;
    const agent = createResearcherAgent({ exa });
    const research = await agent.run(makePayload());

    expect(searchMock).toHaveBeenCalledTimes(4);
    expect(searchMock).toHaveBeenCalledWith(
      expect.stringContaining("Indústria"),
      expect.objectContaining({ type: "auto", numResults: 5, contents: { highlights: true } }),
    );

    expect(research.sections.map((s) => s.key)).toEqual([
      "segmento",
      "faturamento",
      "porte",
      "concorrentes",
    ]);
    for (const section of research.sections) {
      expect(section.status).toBe("ok");
      expect(section.query.length).toBeGreaterThan(0);
    }
    const seg = research.sections.find((s) => s.key === "segmento")!;
    expect(seg.results[0]).toEqual({
      title: "Resultado A",
      url: "https://exemplo.com/a",
      snippet: "snippet A",
    });
    expect(research.sources).toContain("https://exemplo.com/a");
    expect(research.empresa).toEqual(makePayload().empresa);
  });

  it("converte título nulo e snippet ausente para string vazia", async () => {
    searchMock.mockResolvedValue({
      results: [makeResult(null, "https://exemplo.com/sem-titulo")],
    });
    const exa = { search: searchMock } as unknown as Pick<Exa, "search">;
    const agent = createResearcherAgent({ exa });
    const research = await agent.run(makePayload());

    const seg = research.sections.find((s) => s.key === "segmento")!;
    expect(seg.results[0]).toEqual({
      title: "",
      url: "https://exemplo.com/sem-titulo",
      snippet: "",
    });
  });

  it("deduplica sources por URL única mesmo com resultados repetidos", async () => {
    searchMock.mockImplementation((query: string) =>
      Promise.resolve({
        results: [
          makeResult("A", "https://exemplo.com/dup"),
          makeResult("B", "https://exemplo.com/dup"),
        ],
      }),
    );
    const exa = { search: searchMock } as unknown as Pick<Exa, "search">;
    const agent = createResearcherAgent({ exa });
    const research = await agent.run(makePayload());

    expect(research.sources).toEqual(["https://exemplo.com/dup"]);
  });

  it("query que falha vira seção status:erro sem abortar as demais", async () => {
    searchMock.mockImplementation((query: string) => {
      if (query.includes("concorrentes")) {
        return Promise.reject(new Error("timeout da API Exa"));
      }
      return Promise.resolve({ results: [makeResult("Ok", "https://exemplo.com/ok")] });
    });
    const exa = { search: searchMock } as unknown as Pick<Exa, "search">;
    const agent = createResearcherAgent({ exa });
    const research = await agent.run(makePayload());

    expect(research.sections).toHaveLength(4);
    const conc = research.sections.find((s) => s.key === "concorrentes")!;
    expect(conc.status).toBe("erro");
    expect(conc.results).toEqual([]);
    expect(conc.error).toContain("timeout da API Exa");

    for (const section of research.sections.filter((s) => s.key !== "concorrentes")) {
      expect(section.status).toBe("ok");
    }
    expect(research.sources).toEqual(["https://exemplo.com/ok"]);
  });

  it("sem nome de empresa não monta seção concorrentes", async () => {
    searchMock.mockResolvedValue({ results: [makeResult("A", "https://exemplo.com/a")] });
    const exa = { search: searchMock } as unknown as Pick<Exa, "search">;
    const agent = createResearcherAgent({ exa });

    const payload = makePayload({
      empresa: { ...makePayload().empresa, nome: null },
    });
    const research = await agent.run(payload);

    expect(searchMock).toHaveBeenCalledTimes(3);
    expect(research.sections.map((s) => s.key)).toEqual([
      "segmento",
      "faturamento",
      "porte",
    ]);
    expect(research.empresa.nome).toBeNull();
  });

  it("empresa com campos nulos ainda monta queries sem quebrar", async () => {
    searchMock.mockResolvedValue({ results: [] });
    const exa = { search: searchMock } as unknown as Pick<Exa, "search">;
    const agent = createResearcherAgent({ exa });

    const payload = makePayload({
      empresa: {
        nome: null,
        porte: null,
        segmento: null,
        funcionarios: null,
        faturamento: null,
      },
    });
    const research = await agent.run(payload);

    expect(research.sections).toHaveLength(3);
    for (const section of research.sections) {
      expect(section.status).toBe("ok");
      expect(section.results).toEqual([]);
    }
  });
});
