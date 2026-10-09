// @vitest-environment jsdom
import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { RadarSpider } from "./RadarSpider";

const TEN_DIMENSIONS = (
  Array.from({ length: 10 }, (_, i) => ({
    name: `Dimensão ${i + 1}`,
    nivel: (i % 5) + 1,
  })) satisfies { name: string; nivel: number }[]
);

describe("RadarSpider", () => {
  it("não renderiza nada para array vazio", () => {
    const { container } = render(<RadarSpider dimensions={[]} />);
    expect(container.innerHTML).toBe("");
  });

  it("renderiza os eixos, grid e a legenda com os nomes das dimensões", () => {
    render(<RadarSpider dimensions={TEN_DIMENSIONS} />);
    const svg = document.querySelector("svg");
    expect(svg).toBeTruthy();
    expect(svg?.getAttribute("viewBox")).toBe("0 0 360 360");
    expect(document.querySelectorAll("line").length).toBe(10);
    expect(screen.getByText("Dimensão 7")).toBeTruthy();
    expect(screen.getByText("Dimensão 10")).toBeTruthy();
    expect(document.querySelectorAll("polygon").length).toBe(6);
  });

  it("os pontos do polígono seguem a matemática do radar (nível 5 no topo)", () => {
    render(<RadarSpider dimensions={[{ name: "A", nivel: 5 }, { name: "B", nivel: 1 }, { name: "C", nivel: 3 }]} />);
    const dataPoly = Array.from(document.querySelectorAll("polygon")).find(
      (p) => p.getAttribute("stroke") === "#4A2C7D",
    );
    expect(dataPoly).toBeTruthy();
    const points = dataPoly?.getAttribute("points")?.split(" ") ?? [];
    expect(points[0]).toBe("180.0,50.0");
    const angle = (-90 + (2 * 360) / 3) * (Math.PI / 180);
    const xC = 180 + Math.cos(angle) * 65;
    const yC = 180 + Math.sin(angle) * 65;
    expect(points[2]).toBe(`${xC.toFixed(1)},${yC.toFixed(1)}`);
  });

  it("mostra tooltip com nome e nível ao passar o mouse no vértice", () => {
    render(<RadarSpider dimensions={[{ name: "Qualidade", nivel: 4 }]} />);
    expect(screen.queryByText(/Qualidade — nível 4/i)).toBeNull();
    const vertices = document.querySelectorAll("circle");
    fireEvent.mouseEnter(vertices[0]);
    expect(screen.getByText(/Qualidade — nível 4/i)).toBeTruthy();
  });
});
