// @vitest-environment jsdom
import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { METHOD_NOTE } from "@/lib/maturity/methodology";

vi.mock("@/app/components/RhemaLogo", () => ({
  RhemaLogo: () => React.createElement("div", { "data-testid": "rhema-logo" }),
}));

vi.mock("@/app/components/WaveDivider", () => ({
  WaveDivider: () => React.createElement("div", { "data-testid": "wave-divider" }),
}));

import { DiagnosticPortal, type DiagnosticPortalData } from "./DiagnosticPortal";

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
  pesoPadrao: 10,
  areaDmbok: "Data Governance",
  score: ((i % 5) + 1) * 10,
  pergunta: `Pergunta dimensão ${i + 1}?`,
  resposta: "Pontual: isolado",
}));

function portalData(overrides: Partial<DiagnosticPortalData> = {}): DiagnosticPortalData {
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
          dimensao_ids: ["d01", "d03"],
          proximo_passo: "Nomear executivo.",
        },
      ],
    },
    sources: [{ url: "https://exa.com/relatorio", titulo: "Relatório setorial" }],
    commercialAnswer: "Até R$ 50 mil",
    ...overrides,
  };
}

describe("DiagnosticPortal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renderiza as mesmas seções nos dois modos", () => {
    const { unmount } = render(<DiagnosticPortal data={portalData()} mode="public" />);
    expect(screen.getByRole("heading", { level: 1, name: "Corp LTDA" })).toBeTruthy();
    expect(screen.getByText(/João Silva · 10 dimensões avaliadas/)).toBeTruthy();
    expect(
      screen.getByRole("link", { name: "Pular para o conteúdo" }).getAttribute("href"),
    ).toBe("#portal-content");
    expect(screen.getByText("Estruturado")).toBeTruthy();
    expect(screen.getByText("Radar de maturidade")).toBeTruthy();
    expect(screen.getByText("Barras de maturidade")).toBeTruthy();
    expect(screen.getByText("Respostas do diagnóstico")).toBeTruthy();
    expect(screen.getByText("Concorrente A")).toBeTruthy();
    expect(screen.getByText("Governança sem dono")).toBeTruthy();
    expect(screen.queryByText("Relatório setorial")).toBeNull();
    expect(screen.queryByRole("region", { name: "Fontes" })).toBeNull();
    unmount();

    render(<DiagnosticPortal data={portalData()} mode="manager" />);
    expect(screen.getByRole("heading", { level: 1, name: "Corp LTDA" })).toBeTruthy();
    expect(screen.getByText(/João Silva · 10 dimensões avaliadas/)).toBeTruthy();
    expect(screen.getByText("Estruturado")).toBeTruthy();
    expect(screen.getByText("Radar de maturidade")).toBeTruthy();
    expect(screen.getByText("Barras de maturidade")).toBeTruthy();
    expect(screen.getByText("Respostas do diagnóstico")).toBeTruthy();
    expect(screen.getByText("Concorrente A")).toBeTruthy();
    expect(screen.getByText("Governança sem dono")).toBeTruthy();
    expect(screen.getByText("Relatório setorial")).toBeTruthy();
  });

  it("análise pendente mostra placeholder sem esconder diagnóstico", () => {
    render(
      <DiagnosticPortal
        data={portalData({ analysisStatus: "pendente", analysis: undefined, insights: undefined })}
        mode="public"
      />,
    );
    expect(screen.getByText("Análise de mercado em processamento...")).toBeTruthy();
    expect(screen.getByText("Estruturado")).toBeTruthy();
    expect(screen.queryByText("Concorrente A")).toBeNull();
  });

  it("análise em processamento mantém diagnóstico e placeholder", () => {
    render(
      <DiagnosticPortal
        data={portalData({ analysisStatus: "processando", analysis: undefined, insights: undefined })}
        mode="manager"
      />,
    );
    expect(screen.getByText("Análise de mercado em processamento...")).toBeTruthy();
    expect(screen.getByText("Estruturado")).toBeTruthy();
    expect(screen.getByText("Barras de maturidade")).toBeTruthy();
  });

  it("modo manager destaca as dimensões do insight e limpa o filtro", () => {
    render(<DiagnosticPortal data={portalData()} mode="manager" />);
    expect(screen.queryByRole("button", { name: "Limpar filtro" })).toBeNull();

    fireEvent.click(screen.getByText("Governança sem dono"));

    expect(screen.getByRole("button", { name: "Limpar filtro" })).toBeTruthy();
    expect(screen.getByTestId("maturity-bar-0").style.opacity).toBe("1");
    expect(screen.getByTestId("maturity-bar-1").style.opacity).toBe("0.35");
    expect(screen.getByTestId("maturity-bar-2").style.opacity).toBe("1");

    fireEvent.click(screen.getByRole("button", { name: "Limpar filtro" }));
    expect(screen.queryByRole("button", { name: "Limpar filtro" })).toBeNull();
    expect(screen.getByTestId("maturity-bar-1").style.opacity).toBe("1");
    expect(screen.getByTestId("maturity-bar-2").style.opacity).toBe("1");
  });

  it("modo público não oferece filtro por dimensão", () => {
    render(<DiagnosticPortal data={portalData()} mode="public" />);
    fireEvent.click(screen.getByText("Governança sem dono"));
    expect(screen.queryByRole("button", { name: "Limpar filtro" })).toBeNull();
    expect(screen.getByTestId("maturity-bar-1").style.opacity).toBe("1");
  });

  it("falha com onReprocess oferece Reprocessar e chama o callback", () => {
    const onReprocess = vi.fn();
    render(
      <DiagnosticPortal
        data={portalData({ analysisStatus: "falha", analysis: undefined, insights: undefined })}
        mode="manager"
        onReprocess={onReprocess}
      />,
    );
    expect(screen.getByText("Não foi possível concluir a análise")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Reprocessar" }));
    expect(onReprocess).toHaveBeenCalledTimes(1);
  });

  it("falha sem onReprocess não mostra o botão Reprocessar", () => {
    render(
      <DiagnosticPortal
        data={portalData({ analysisStatus: "falha", analysis: undefined, insights: undefined })}
        mode="public"
      />,
    );
    expect(screen.getByText("Não foi possível concluir a análise")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Reprocessar" })).toBeNull();
  });

  it("modo manager mostra identidade do lead e volta ao painel; público não", () => {
    const { unmount } = render(<DiagnosticPortal data={portalData()} mode="manager" />);
    expect(screen.getByText("João Silva")).toBeTruthy();
    expect(screen.getByText("Corp LTDA")).toBeTruthy();
    expect(screen.getByText("Voltar ao painel").closest("a")?.getAttribute("href")).toBe("/admin");
    unmount();

    render(<DiagnosticPortal data={portalData()} mode="public" />);
    expect(screen.queryByText("João Silva", { selector: "p" })).toBeNull();
    expect(screen.queryByText("Voltar ao painel")).toBeNull();
  });

  it("análise vazia cai nos estados vazios dos componentes", () => {
    render(
      <DiagnosticPortal
        data={portalData({
          analysis: { resumo: "", dores: [], contexto_concorrentes: [] },
          insights: { bullets: [] },
          sources: [],
        })}
        mode="public"
      />,
    );
    expect(
      screen.getByText("Sem concorrentes mapeados para este diagnóstico."),
    ).toBeTruthy();
    expect(screen.getByText("Sem insights de análise para exibir.")).toBeTruthy();
    expect(screen.queryByText("Sem fontes de mercado para exibir.")).toBeNull();
  });

  it("modo público mostra cidade e estado junto ao nome do solicitante", () => {
    render(
      <DiagnosticPortal
        data={portalData({
          lead: {
            id: "lead-1",
            name: "João Silva",
            company: "Corp LTDA",
            city: "São Paulo",
            state: "SP",
          },
        })}
        mode="public"
      />,
    );
    expect(
      screen.getByText("João Silva · 10 dimensões avaliadas · São Paulo/SP"),
    ).toBeTruthy();
  });

  it("modo manager mostra cidade e estado junto ao nome do solicitante", () => {
    render(
      <DiagnosticPortal
        data={portalData({
          lead: {
            id: "lead-1",
            name: "João Silva",
            company: "Corp LTDA",
            city: "São Paulo",
            state: "SP",
          },
        })}
        mode="manager"
      />,
    );
    const line = screen.getByText("João Silva · 10 dimensões avaliadas · São Paulo/SP");
    expect(line.textContent).toBe("João Silva · 10 dimensões avaliadas · São Paulo/SP");
  });

  it("lead antigo sem localização mantém a linha original sem separador extra", () => {
    render(<DiagnosticPortal data={portalData()} mode="public" />);
    const line = screen.getByText("João Silva · 10 dimensões avaliadas");
    expect(line.textContent).toBe("João Silva · 10 dimensões avaliadas");
    expect(line.textContent).not.toContain("/");
    expect(line.textContent).not.toMatch(/undefined|null|Localização/);
  });

  it("cidade sem estado omite a localização", () => {
    render(
      <DiagnosticPortal
        data={portalData({
          lead: {
            id: "lead-1",
            name: "João Silva",
            company: "Corp LTDA",
            city: "São Paulo",
          },
        })}
        mode="public"
      />,
    );
    const line = screen.getByText("João Silva · 10 dimensões avaliadas");
    expect(line.textContent).toBe("João Silva · 10 dimensões avaliadas");
    expect(screen.queryByText(/São Paulo/)).toBeNull();
  });

  it("estado sem cidade omite a localização", () => {
    render(
      <DiagnosticPortal
        data={portalData({
          lead: {
            id: "lead-1",
            name: "João Silva",
            company: "Corp LTDA",
            state: "SP",
          },
        })}
        mode="public"
      />,
    );
    const line = screen.getByText("João Silva · 10 dimensões avaliadas");
    expect(line.textContent).toBe("João Silva · 10 dimensões avaliadas");
    expect(screen.queryByText(/\/SP/)).toBeNull();
  });

  it("cidade e estado nulos omitem a localização", () => {
    render(
      <DiagnosticPortal
        data={portalData({
          lead: {
            id: "lead-1",
            name: "João Silva",
            company: "Corp LTDA",
            city: null,
            state: null,
          },
        })}
        mode="manager"
      />,
    );
    const line = screen.getByText("João Silva · 10 dimensões avaliadas");
    expect(line.textContent).toBe("João Silva · 10 dimensões avaliadas");
    expect(line.textContent).not.toContain("/");
  });

  it("cidade e estado vazios omitem a localização", () => {
    render(
      <DiagnosticPortal
        data={portalData({
          lead: {
            id: "lead-1",
            name: "João Silva",
            company: "Corp LTDA",
            city: "",
            state: "",
          },
        })}
        mode="public"
      />,
    );
    const line = screen.getByText("João Silva · 10 dimensões avaliadas");
    expect(line.textContent).toBe("João Silva · 10 dimensões avaliadas");
    expect(line.textContent).not.toContain("/");
  });

  it("preserva cidade composta com acento", () => {
    render(
      <DiagnosticPortal
        data={portalData({
          lead: {
            id: "lead-1",
            name: "João Silva",
            company: "Corp LTDA",
            city: "São José do Rio Preto",
            state: "SP",
          },
        })}
        mode="public"
      />,
    );
    expect(
      screen.getByText(
        "João Silva · 10 dimensões avaliadas · São José do Rio Preto/SP",
      ),
    ).toBeTruthy();
  });

  it("mostra a nota metodológica nos modos público e gerente (MET-32)", () => {
    const { unmount } = render(<DiagnosticPortal data={portalData()} mode="public" />);
    expect(screen.getByRole("heading", { name: "Nota metodológica" })).toBeTruthy();
    expect(screen.getByText(METHOD_NOTE)).toBeTruthy();
    unmount();

    render(<DiagnosticPortal data={portalData()} mode="manager" />);
    expect(screen.getByRole("heading", { name: "Nota metodológica" })).toBeTruthy();
    expect(screen.getByText(METHOD_NOTE)).toBeTruthy();
  });
});
