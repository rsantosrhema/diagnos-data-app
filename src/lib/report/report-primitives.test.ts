import { describe, it, expect } from "vitest";
import { COLORS, PAGE, p, runningHead, sectionHeader } from "./report-primitives";

describe("report-primitives", () => {
  it("mantém os tokens de cor do relatório (ARS-36)", () => {
    expect(COLORS.primary).toBe("#4A2C7D");
    expect(COLORS.ink).toBe("#1D1D1F");
    expect(COLORS.risk).toBe("#B23A34");
  });

  it("converte px do design para pt e fixa a página A4", () => {
    expect(p(12)).toBe(9);
    expect(PAGE.width).toBe(595);
    expect(PAGE.height).toBe(842);
  });

  it("runningHead devolve o cabeçalho com a key e os dois textos", () => {
    const node = runningHead("A", "B");

    expect(node.key).toBe("running-head");
    const children = node.props.children as Array<{ props: { children: string } }>;
    expect(children.map((child) => child.props.children)).toEqual(["A", "B"]);
  });

  it("sectionHeader devolve o bloco com a key recebida", () => {
    const node = sectionHeader("01", "T", "N", "k");

    expect(node.key).toBe("k");
    const texts = (node.props.children as Array<{ props: { children?: unknown } }>)
      .map((child) => child.props.children)
      .filter((value): value is string => typeof value === "string");
    expect(texts).toEqual(["01", "T", "N"]);
  });
});
