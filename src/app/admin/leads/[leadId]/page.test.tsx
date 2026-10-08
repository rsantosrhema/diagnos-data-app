// @vitest-environment jsdom
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/api/client", () => ({
  getManagerPortal: vi.fn(),
  createShareLink: vi.fn(),
  revokeShareLink: vi.fn(),
  generateReport: vi.fn().mockResolvedValue({ ok: true, queued: true }),
  ApiError: class ApiError extends Error {
    status: number;
    constructor(message: string, status: number) {
      super(message);
      this.status = status;
    }
  },
}));

vi.mock("next/navigation", () => ({
  useParams: () => ({ leadId: "lead-1" }),
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock("../../../components/RhemaLogo", () => ({
  RhemaLogo: () => React.createElement("div", { "data-testid": "rhema-logo" }),
}));

vi.mock("../../../components/WaveDivider", () => ({
  WaveDivider: () => React.createElement("div", { "data-testid": "wave-divider" }),
}));

import {
  getManagerPortal,
  createShareLink,
  revokeShareLink,
  generateReport,
  ApiError,
} from "@/lib/api/client";

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

function portalFixture(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    lead: { id: "lead-1", name: "João Silva", company: "Corp LTDA" },
    email: "joao@corp.com",
    score: { valor: 3.1, faixa: "Estruturado", descricao: "Desc estruturado" },
    dimensions: DIMS,
    risk: { id: "d03", name: "Dimensão 3", nivel: 1 },
    imbalance: false,
    stage: STAGE,
    analysisStatus: "analisado",
    analysis: {
      resumo: "Resumo da análise.",
      dores: [
        {
          dimensao_id: "d01",
          dimensao: "Dimensão 1",
          dor: "Governança sem dono executivo.",
          evidencia_mercado: true,
          confianca: 0.9,
        },
      ],
      contexto_concorrentes: [
        {
          nome: "Concorrente A",
          contexto: "Atua no mesmo segmento.",
          url: "https://a.com",
          diferencial: "Antecipação de demanda.",
        },
      ],
    },
    insights: {
      bullets: [
        {
          texto: "Governança sem dono executivo atrasa decisões.",
          prioridade: "alta",
          titulo: "Governança sem dono",
          dimensao_ids: ["d01", "d03"],
          proximo_passo: "Nomear executivo.",
        },
      ],
    },
    sources: [{ url: "https://exa.com/relatorio", titulo: "Relatório setorial" }],
    commercialAnswer: "Até R$ 50 mil",
    share: { active: false, url: null, expiresAt: null },
    ...overrides,
  };
}

function mockPortal(data: unknown) {
  (getManagerPortal as ReturnType<typeof vi.fn>).mockResolvedValue(data);
}

beforeEach(() => {
  vi.clearAllMocks();
  (getManagerPortal as ReturnType<typeof vi.fn>).mockReset();
  Object.assign(navigator, {
    clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
  });
});

describe("Página portal do gerente", () => {
  it("renderiza as 6 seções com análise completa", async () => {
    mockPortal(portalFixture());
    const { default: PortalPage } = await import("./page");
    render(<PortalPage />);
    await screen.findByText("Estruturado");
    expect(screen.getByText("João Silva")).toBeTruthy();
    expect(screen.getByText(/Base técnica existe/)).toBeTruthy();
    expect(screen.getByText(/Nível por dimensão/)).toBeTruthy();
    expect(screen.getByText("Pergunta dimensão 1?")).toBeTruthy();
    expect(screen.getByText("Concorrente A")).toBeTruthy();
    expect(screen.getByText("Governança sem dono")).toBeTruthy();
    expect(screen.getByText("Relatório setorial")).toBeTruthy();
    expect(screen.getByRole("button", { name: /copiar/i })).toBeTruthy();
  });

  it("análise pendente mostra placeholder sem esconder diagnóstico", async () => {
    mockPortal(portalFixture({ analysisStatus: "pendente", analysis: undefined, insights: undefined }));
    const { default: PortalPage } = await import("./page");
    render(<PortalPage />);
    await screen.findByText("Análise de mercado em processamento...");
    expect(screen.getByText("Estruturado")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Reprocessar" })).toBeNull();
  });

  it("falha mostra placeholder com botão Reprocessar que chama generateReport", async () => {
    mockPortal(portalFixture({ analysisStatus: "falha", analysis: undefined, insights: undefined }));
    const { default: PortalPage } = await import("./page");
    render(<PortalPage />);
    await screen.findByText("Não foi possível concluir a análise");
    fireEvent.click(screen.getByRole("button", { name: "Reprocessar" }));
    await waitFor(() => {
      expect(generateReport).toHaveBeenCalledWith("lead-1");
    });
  });

  it("401 mostra estado oferecendo voltar ao /admin sem dados do lead", async () => {
    (getManagerPortal as ReturnType<typeof vi.fn>).mockRejectedValue(
      new ApiError("Não autorizado", 401),
    );
    const { default: PortalPage } = await import("./page");
    render(<PortalPage />);
    await screen.findByText("Acesso não autorizado");
    expect(screen.queryByText("Estruturado")).toBeNull();
    expect(screen.queryByText("João Silva")).toBeNull();
  });

  it("404 mostra Diagnóstico não encontrado", async () => {
    (getManagerPortal as ReturnType<typeof vi.fn>).mockRejectedValue(
      new ApiError("Diagnóstico não encontrado", 404),
    );
    const { default: PortalPage } = await import("./page");
    render(<PortalPage />);
    await screen.findByText("Diagnóstico não encontrado");
  });

  it("insight card com dimensao_ids limpa via Limpar filtro", async () => {
    mockPortal(portalFixture());
    const { default: PortalPage } = await import("./page");
    render(<PortalPage />);
    await screen.findByText("Governança sem dono");
    expect(screen.queryByRole("button", { name: "Limpar filtro" })).toBeNull();
    fireEvent.click(screen.getByText("Governança sem dono"));
    expect(screen.getByRole("button", { name: "Limpar filtro" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Limpar filtro" }));
    expect(screen.queryByRole("button", { name: "Limpar filtro" })).toBeNull();
  });

  it("copiar link gera, copia URL absoluta e exibe toast com validade", async () => {
    mockPortal(portalFixture({ share: { active: false, url: null, expiresAt: null } }));
    (createShareLink as ReturnType<typeof vi.fn>).mockResolvedValue({
      url: "/r/novotok",
      expiresAt: "2027-01-06T10:00:00.000Z",
    });
    const { default: PortalPage } = await import("./page");
    render(<PortalPage />);
    await screen.findByText("Estruturado");
    fireEvent.click(screen.getByRole("button", { name: /copiar/i }));
    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith("http://localhost:3000/r/novotok");
    });
    await waitFor(() => {
      expect(screen.getAllByRole("status").length).toBeGreaterThan(0);
    });
  });

  it("link ativo permite revogar via revokeShareLink", async () => {
    mockPortal(portalFixture({ share: { active: true, url: "/r/tok", expiresAt: "2027-01-06T10:00:00.000Z" } }));
    (revokeShareLink as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true });
    const { default: PortalPage } = await import("./page");
    render(<PortalPage />);
    await screen.findByText("Estruturado");
    fireEvent.click(screen.getByRole("button", { name: /revogar/i }));
    await waitFor(() => {
      expect(revokeShareLink).toHaveBeenCalledWith("lead-1");
    });
  });
});
