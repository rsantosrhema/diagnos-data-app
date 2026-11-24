import { describe, expect, it } from "vitest";
import { normalizeInsights } from "./normalize-insights";

type B = { texto: string; prioridade: "alta" | "media" | "baixa" };
const make = (n: number, prioridade: B["prioridade"], prefix = prioridade): B[] =>
  Array.from({ length: n }, (_, i) => ({ texto: `${prefix}-${i}`, prioridade }));
const count = (list: B[], p: B["prioridade"]) => list.filter((b) => b.prioridade === p).length;

describe("normalizeInsights", () => {
  it("retorna lista vazia para entrada vazia", () => {
    expect(normalizeInsights([])).toEqual([]);
  });

  it("mantém lista dentro dos limites e ordena alta, média, baixa", () => {
    const out = normalizeInsights([...make(1, "baixa"), ...make(2, "alta"), ...make(1, "media")]);
    expect(out.map((b) => b.prioridade)).toEqual(["alta", "alta", "media", "baixa"]);
  });

  it("rebaixa altas excedentes para média", () => {
    const out = normalizeInsights(make(5, "alta"));
    expect(count(out, "alta")).toBe(3);
    expect(out.filter((b) => b.prioridade === "media").map((b) => b.texto)).toEqual([
      "alta-3",
      "alta-4",
    ]);
  });

  it("rebaixa médias excedentes para baixa", () => {
    const out = normalizeInsights(make(7, "media"));
    expect(count(out, "media")).toBe(5);
    expect(out.filter((b) => b.prioridade === "baixa").map((b) => b.texto)).toEqual([
      "media-5",
      "media-6",
    ]);
  });

  it("descarta baixas acima de 5", () => {
    const out = normalizeInsights(make(9, "baixa"));
    expect(out).toHaveLength(5);
    expect(out[4].texto).toBe("baixa-4");
  });

  it("15 altas resultam em 3/5/5", () => {
    const out = normalizeInsights(make(15, "alta"));
    expect([count(out, "alta"), count(out, "media"), count(out, "baixa")]).toEqual([3, 5, 5]);
  });

  it("encadeia: altas rebaixadas entram no fim das médias originais", () => {
    const out = normalizeInsights([...make(4, "alta"), ...make(5, "media")]);
    expect(count(out, "alta")).toBe(3);
    expect(out.filter((b) => b.prioridade === "media").map((b) => b.texto)).toEqual([
      "media-0",
      "media-1",
      "media-2",
      "media-3",
      "media-4",
    ]);
    expect(out.filter((b) => b.prioridade === "baixa").map((b) => b.texto)).toEqual(["alta-3"]);
  });
});
