// @vitest-environment jsdom
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AnswersAccordion } from "./AnswersAccordion";

const DIMS = Array.from({ length: 10 }, (_, i) => ({
  id: `d${String(i + 1).padStart(2, "0")}`,
  name: `Dimensão ${i + 1}`,
  pergunta: `Pergunta dimensão ${i + 1}?`,
  resposta: "Pontual: isolado",
  nivel: (i % 5) + 1,
}));

describe("AnswersAccordion", () => {
  it("renderiza as 10 perguntas", () => {
    render(<AnswersAccordion dimensions={DIMS} />);
    for (let i = 1; i <= 10; i++) {
      expect(screen.getByText(`Pergunta dimensão ${i}?`)).toBeTruthy();
    }
  });

  it("expande uma linha mostrando resposta e nível ao clicar", () => {
    render(<AnswersAccordion dimensions={DIMS} />);
    const pergunta = screen.getByText("Pergunta dimensão 2?");
    fireEvent.click(pergunta.closest("button") ?? pergunta);
    expect(screen.getAllByText("Pontual: isolado").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Nível 2").length).toBeGreaterThan(0);
  });

  it("colapsa ao clicar novamente", () => {
    render(<AnswersAccordion dimensions={DIMS} />);
    const pergunta = screen.getByText("Pergunta dimensão 1?");
    const button = pergunta.closest("button") ?? pergunta;
    fireEvent.click(button);
    expect(screen.getAllByText("Pontual: isolado").length).toBeGreaterThan(0);
    fireEvent.click(button);
    expect(screen.queryAllByText("Pontual: isolado").length).toBe(0);
  });

  it("expande linhas independentes", () => {
    render(<AnswersAccordion dimensions={DIMS} />);
    fireEvent.click(screen.getByText("Pergunta dimensão 1?").closest("button")!);
    fireEvent.click(screen.getByText("Pergunta dimensão 3?").closest("button")!);
    expect(screen.getAllByText("Nível 1").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Nível 3").length).toBeGreaterThan(0);
  });
});
