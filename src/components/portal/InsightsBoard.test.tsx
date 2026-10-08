// @vitest-environment jsdom
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { InsightsBoard } from "./InsightsBoard";
import { AnalysisPlaceholder } from "./AnalysisPlaceholder";

const BULLETS = [
  {
    texto: "Governança sem dono executivo atrasa decisões de dados.",
    prioridade: "alta" as const,
    titulo: "Governança sem dono executivo",
    dimensao_ids: ["d01", "d03"],
    proximo_passo: "Nomear executivo responsável por dados.",
  },
  {
    texto: "Relatórios duvidosos entre áreas de vendas.",
    prioridade: "media" as const,
  },
  {
    texto: "Metadados não catalogados dificultam reuso.",
    prioridade: "baixa" as const,
    titulo: "Metadados não catalogados",
    dimensao_ids: ["d04"],
    proximo_passo: "Implantar catálogo nas áreas críticas.",
  },
];

describe("InsightsBoard", () => {
  it("agrupa bullets por prioridade com rótulos alta/média/baixa", () => {
    render(<InsightsBoard insights={{ bullets: BULLETS }} />);
    expect(screen.getByText(/Prioridade alta/i)).toBeTruthy();
    expect(screen.getByText(/Prioridade média/i)).toBeTruthy();
    expect(screen.getByText(/Prioridade baixa/i)).toBeTruthy();
  });

  it("renderiza titulo, texto e proximo_passo", () => {
    render(<InsightsBoard insights={{ bullets: BULLETS }} />);
    expect(screen.getByText("Governança sem dono executivo")).toBeTruthy();
    expect(
      screen.getByText("Governança sem dono executivo atrasa decisões de dados."),
    ).toBeTruthy();
    expect(screen.getAllByText(/Próximo passo:/).length).toBe(2);
    expect(screen.getByText(/Nomear executivo responsável/)).toBeTruthy();
  });

  it("chama onDimensaoFilter com os ids ao clicar card com dimensao_ids", () => {
    const onFilter = vi.fn();
    render(
      <InsightsBoard insights={{ bullets: BULLETS }} onDimensaoFilter={onFilter} />,
    );
    fireEvent.click(screen.getByText("Governança sem dono executivo"));
    expect(onFilter).toHaveBeenCalledWith(["d01", "d03"]);
  });

  it("fallback '—' para analysis antiga sem campos enriquecidos, sem quebrar", () => {
    const onFilter = vi.fn();
    render(
      <InsightsBoard
        insights={{
          bullets: [{ texto: "Insight antigo sem enriquecimento.", prioridade: "alta" }],
        }}
        onDimensaoFilter={onFilter}
      />,
    );
    expect(screen.getByText("Insight antigo sem enriquecimento.")).toBeTruthy();
    expect(screen.getAllByText("—").length).toBeGreaterThan(0);
    fireEvent.click(screen.getByText("Insight antigo sem enriquecimento."));
    expect(onFilter).not.toHaveBeenCalled();
  });
});

describe("AnalysisPlaceholder", () => {
  it("pendente mostra spinner e copy de processamento", () => {
    render(<AnalysisPlaceholder status="pendente" />);
    expect(
      screen.getByText("Análise de mercado em processamento..."),
    ).toBeTruthy();
    expect(screen.getByTestId("analysis-spinner")).toBeTruthy();
  });

  it("processando mostra spinner", () => {
    render(<AnalysisPlaceholder status="processando" />);
    expect(
      screen.getByText("Análise de mercado em processamento..."),
    ).toBeTruthy();
  });

  it("falha mostra copy de erro e botão Reprocessar quando handler presente", () => {
    render(<AnalysisPlaceholder status="falha" onReprocess={() => {}} />);
    expect(
      screen.getByText("Não foi possível concluir a análise"),
    ).toBeTruthy();
    expect(screen.getByRole("button", { name: "Reprocessar" })).toBeTruthy();
  });

  it("falha sem handler não renderiza botão", () => {
    render(<AnalysisPlaceholder status="falha" />);
    expect(
      screen.getByText("Não foi possível concluir a análise"),
    ).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Reprocessar" })).toBeNull();
  });

  it("pendente não renderiza botão Reprocessar", () => {
    render(<AnalysisPlaceholder status="pendente" />);
    expect(screen.queryByRole("button", { name: "Reprocessar" })).toBeNull();
  });
});
