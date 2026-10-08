// @vitest-environment jsdom
import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/api/client", () => ({
  getPublicPortal: vi.fn(),
  ApiError: class ApiError extends Error {
    status: number;
    constructor(message: string, status: number) {
      super(message);
      this.status = status;
    }
  },
}));

vi.mock("next/navigation", () => ({
  useParams: () => ({ token: "tok-1" }),
}));

vi.mock("../../components/RhemaLogo", () => ({
  RhemaLogo: () => React.createElement("div", { "data-testid": "rhema-logo" }),
}));

vi.mock("../../components/WaveDivider", () => ({
  WaveDivider: () => React.createElement("div", { "data-testid": "wave-divider" }),
}));

import { getPublicPortal, ApiError } from "@/lib/api/client";

const STAGE = {
  rotulo: "Estruturado",
  cor: "#4A2C7D",
  range: { min: 2.6, max: 3.4 },
  descricaoExecutiva: "Base técnica existe. O gargalo costuma ser governança e processo.",
  caracteristicas: ["Data warehouse em operação."],
  sinaisRisco: ["Governança não pauta decisões."],
  comoSubir: ["Formalize políticas de dados."],
};

const DIMS = Array.from({ length: 10 }, (_, i) => ({
  id: `d${String(i + 1).padStart(2, "0")}`,
  name: `Dimensão ${i + 1}`,
  nivel: (i % 5) + 1,
  peso: 10,
  score: ((i % 5) + 1) * 10,
  pergunta: `Pergunta dimensão ${i + 1}?`,
  resposta: "Pontual: isolado",
}));

function portalFixture(overrides: Record<string, unknown> = {}) {
  return {
    lead: { id: "lead-1", name: "João Silva", company: "Corp LTDA" },
    score: { valor: 3.1, faixa: "Estruturado", descricao: "Desc estruturado" },
    dimensions: DIMS,
    risk: { id: "d03", name: "Dimensão 3", nivel: 1 },
    imbalance: false,
    stage: STAGE,
    analysisStatus: "analisado",
    analysis: {
      resumo: "Resumo da análise.",
      dores: [],
      contexto_concorrentes: [
        {
          nome: "Concorrente A",
          contexto: "Atua no mesmo segmento.",
          url: "https://a.com",
        },
      ],
    },
    insights: {
      bullets: [
        {
          texto: "Governança sem dono executivo atrasa decisões.",
          prioridade: "alta",
          titulo: "Governança sem dono",
          dimensao_ids: ["d01"],
        },
      ],
    },
    sources: [],
    commercialAnswer: "Até R$ 50 mil",
    ...overrides,
  };
}

function mockPublicPortal(data: unknown) {
  (getPublicPortal as ReturnType<typeof vi.fn>).mockResolvedValue(data);
}

beforeEach(() => {
  vi.clearAllMocks();
  (getPublicPortal as ReturnType<typeof vi.fn>).mockReset();
});

describe("Portal público /r/[token]", () => {
  it("renderiza as 6 seções sem ações de admin", async () => {
    mockPublicPortal(portalFixture());
    const { default: PublicPage } = await import("./page");
    render(<PublicPage />);
    await screen.findByText("Estruturado");
    expect(screen.getByText(/João Silva/)).toBeTruthy();
    expect(screen.getByText(/Base técnica existe/)).toBeTruthy();
    expect(screen.getByText("Pergunta dimensão 1?")).toBeTruthy();
    expect(screen.getByText("Concorrente A")).toBeTruthy();
    expect(screen.getByText("Governança sem dono")).toBeTruthy();
    expect(screen.getByText("Sem fontes de mercado para exibir.")).toBeTruthy();
    expect(screen.queryByRole("button", { name: /copiar/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /revogar/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /reprocessar/i })).toBeNull();
  });

  it("HTML não contém strings de email", async () => {
    mockPublicPortal(portalFixture());
    const { default: PublicPage } = await import("./page");
    const { container } = render(<PublicPage />);
    await screen.findByText("Estruturado");
    const html = container.innerHTML;
    expect((html.match(/[\w.+-]+@[\w-]+\.\w+/g) ?? []).length).toBe(0);
    expect(html).not.toContain("phone");
  });

  it("token inválido mostra estado genérico sem dados do lead", async () => {
    (getPublicPortal as ReturnType<typeof vi.fn>).mockRejectedValue(
      new ApiError("Not Found", 404),
    );
    const { default: PublicPage } = await import("./page");
    render(<PublicPage />);
    await screen.findByText("Link inválido ou expirado");
    expect(screen.queryByText("João Silva")).toBeNull();
    expect(screen.queryByText("Estruturado")).toBeNull();
  });

  it("erro inesperado também mostra estado genérico", async () => {
    (getPublicPortal as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error("network"),
    );
    const { default: PublicPage } = await import("./page");
    render(<PublicPage />);
    await screen.findByText("Link inválido ou expirado");
  });

  it("análise pendente mostra placeholder sem esconder diagnóstico", async () => {
    mockPublicPortal(
      portalFixture({
        analysisStatus: "pendente",
        analysis: undefined,
        insights: undefined,
      }),
    );
    const { default: PublicPage } = await import("./page");
    render(<PublicPage />);
    await screen.findByText("Análise de mercado em processamento...");
    expect(screen.getByText("Estruturado")).toBeTruthy();
  });
});
