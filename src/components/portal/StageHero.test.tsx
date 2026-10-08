// @vitest-environment jsdom
import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { StageHero } from "./StageHero";

const STAGE = {
  rotulo: "Estruturado",
  cor: "#4A2C7D",
  range: { min: 2.6, max: 3.4 },
  descricaoExecutiva:
    "Base técnica existe. O gargalo costuma ser governança e processo, não tecnologia.",
  caracteristicas: ["Data warehouse em operação.", "Processos definidos."],
  sinaisRisco: ["Governança formal não pauta decisões."],
  comoSubir: ["Formalize políticas de dados com executivos como donos."],
};

describe("StageHero", () => {
  it("renderiza faixa grande com cor do estágio via inline style", () => {
    render(<StageHero stage={STAGE} score={{ valor: 3.1, faixa: "Estruturado" }} />);
    const label = screen.getByText("Estruturado");
    expect(label.getAttribute("style")).toContain("rgb(74, 44, 125)");
  });

  it("renderiza range do estágio", () => {
    render(<StageHero stage={STAGE} score={{ valor: 3.1, faixa: "Estruturado" }} />);
    expect(screen.getByText(/2\.6/)).toBeTruthy();
    expect(screen.getByText(/3\.4/)).toBeTruthy();
  });

  it("renderiza descrição executiva", () => {
    render(<StageHero stage={STAGE} score={{ valor: 3.1, faixa: "Estruturado" }} />);
    expect(
      screen.getByText(/Base técnica existe. O gargalo costuma ser governança/),
    ).toBeTruthy();
  });

  it("renderiza as três listas com headings e itens", () => {
    render(<StageHero stage={STAGE} score={{ valor: 3.1, faixa: "Estruturado" }} />);
    expect(screen.getByText("Características deste estágio")).toBeTruthy();
    expect(screen.getByText("Sinais de risco")).toBeTruthy();
    expect(screen.getByText("Como subir de estágio")).toBeTruthy();
    expect(screen.getByText("Data warehouse em operação.")).toBeTruthy();
    expect(screen.getByText("Governança formal não pauta decisões.")).toBeTruthy();
    expect(
      screen.getByText("Formalize políticas de dados com executivos como donos."),
    ).toBeTruthy();
  });

  it("mostra o score e a faixa do diagnóstico", () => {
    render(<StageHero stage={STAGE} score={{ valor: 3.1, faixa: "Estruturado" }} />);
    expect(screen.getByText("3.1")).toBeTruthy();
  });
});
