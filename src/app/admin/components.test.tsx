// @vitest-environment jsdom
import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { LogStepLabel } from "./components";

describe("LogStepLabel", () => {
  it("mostra o passo arsenal com o rótulo próprio e tom neutro (ARS-26)", () => {
    render(<LogStepLabel step="arsenal" />);

    const label = screen.getByText("Arsenal comercial (LLM)");
    expect(label.className).toBe("text-[#6e6e73]");
    expect(label.className).not.toContain("text-[#b23a34]");
  });

  it("mostra a falha do arsenal com o rótulo próprio e tom de erro (ARS-26)", () => {
    render(<LogStepLabel step="arsenal_failed" />);

    const label = screen.getByText("Falha no Arsenal comercial");
    expect(label.className).toContain("text-[#b23a34]");
    expect(label.className).toContain("font-medium");
  });

  it("mantém o rótulo de falha ao gerar PDF (regressão)", () => {
    render(<LogStepLabel step="pdf_failed" />);

    const label = screen.getByText("Falha ao gerar PDF");
    expect(label.className).toContain("text-[#b23a34]");
  });
});
