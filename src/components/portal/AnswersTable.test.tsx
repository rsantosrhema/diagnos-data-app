// @vitest-environment jsdom
import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AnswersTable } from "./AnswersTable";

const DIMS = Array.from({ length: 10 }, (_, i) => ({
  id: `d${String(i + 1).padStart(2, "0")}`,
  name: `Dimensão ${i + 1}`,
  pergunta: `Pergunta dimensão ${i + 1}?`,
  resposta: `Resposta dimensão ${i + 1}`,
  nivel: (i % 5) + 1,
  peso: i === 0 ? 13 : 10,
  pesoPadrao: 10,
  areaDmbok: i === 0 ? "Data Security" : "Data Governance",
}));

describe("AnswersTable", () => {
  it("renderiza as 10 dimensões, perguntas e respostas visíveis", () => {
    render(<AnswersTable dimensions={DIMS} />);
    for (let i = 1; i <= 10; i++) {
      expect(screen.getByText(`Dimensão ${i}`)).toBeTruthy();
      expect(screen.getByText(`Pergunta dimensão ${i}?`)).toBeTruthy();
      expect(screen.getByText(`Resposta dimensão ${i}`)).toBeTruthy();
    }
  });

  it("exibe o nível de cada dimensão (sem interação)", () => {
    render(<AnswersTable dimensions={DIMS} />);
    expect(screen.getAllByText("N1").length).toBeGreaterThan(0);
    expect(screen.getAllByText("N2").length).toBeGreaterThan(0);
    expect(screen.getAllByText("N5").length).toBeGreaterThan(0);
  });

  it("não usa cards recolhíveis (tabela sempre visível)", () => {
    render(<AnswersTable dimensions={DIMS} />);
    expect(document.querySelector("table")).toBeTruthy();
    expect(document.querySelectorAll("button").length).toBe(0);
  });

  it("mostra o peso no setor comparado ao padrão (MET-30)", () => {
    render(<AnswersTable dimensions={DIMS} />);
    expect(screen.getByText("13% (padrão 10%)")).toBeTruthy();
    expect(screen.getAllByText("10% (padrão)").length).toBe(9);
  });

  it("mostra a área DMBOK2 de cada dimensão (MET-30)", () => {
    render(<AnswersTable dimensions={DIMS} />);
    expect(screen.getByText("Data Security")).toBeTruthy();
    expect(screen.getAllByText("Data Governance").length).toBe(9);
  });
});
