// @vitest-environment jsdom
import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MaturityBars } from "./MaturityBars";

const DIMS = (
  Array.from({ length: 10 }, (_, i) => ({
    id: `d${String(i + 1).padStart(2, "0")}`,
    name: `Dimensão ${i + 1}`,
    nivel: (i % 5) + 1,
  })) satisfies { id: string; name: string; nivel: number }[]
);

describe("MaturityBars", () => {
  it("renderiza 10 barras com aria-label nome + nível", () => {
    render(<MaturityBars dimensions={DIMS} riskId="d03" />);
    expect(screen.getByLabelText(/Dimensão 1 — nível 1/i)).toBeTruthy();
    expect(screen.getByLabelText(/Dimensão 10 — nível 5/i)).toBeTruthy();
    expect(screen.getAllByTestId(/maturity-bar-\d/).length).toBe(10);
  });

  it("escala a altura da barra proporcional ao nível de 1 a 5", () => {
    render(<MaturityBars dimensions={DIMS} riskId="d10" />);
    const top = screen.getByTestId("maturity-fill-9");
    const bottom = screen.getByTestId("maturity-fill-0");
    expect(top.getAttribute("style")).toContain("100%");
    expect(bottom.getAttribute("style")).toContain("20%");
  });

  it("destaca a dimensão de risco com cor de destaque", () => {
    render(<MaturityBars dimensions={DIMS} riskId="d03" />);
    const riskBar = screen.getByTestId("maturity-bar-2");
    expect(riskBar.className).toContain("is-risk");
    expect(screen.getByText("Risco", { exact: true })).toBeTruthy();
    expect(screen.getByText("Risco principal")).toBeTruthy();
    const nonRisk = screen.getByTestId("maturity-bar-0");
    expect(nonRisk.className).not.toContain("is-risk");
  });

  it("escurece barras fora do highlightIds", () => {
    render(<MaturityBars dimensions={DIMS} riskId="d03" highlightIds={["d01", "d02"]} />);
    const highlighted = screen.getByTestId("maturity-bar-0");
    const dimmed = screen.getByTestId("maturity-bar-4");
    expect(highlighted.getAttribute("style")).toContain("opacity: 1");
    expect(dimmed.getAttribute("style")).toContain("opacity: 0.35");
  });
});
