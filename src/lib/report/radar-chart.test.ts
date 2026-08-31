import { describe, it, expect } from "vitest";
import { Svg, Polygon, Line, Text } from "@react-pdf/renderer";
import {
  RadarChart,
  clampLevel,
  RADAR_LEVELS,
  type RadarChartProps,
} from "./radar-chart";

function toArray(node: unknown): unknown[] {
  if (Array.isArray(node)) return node;
  return [node];
}

interface TestNode {
  type?: unknown;
  props?: { children?: unknown; fill?: string; points?: string };
}

function propsOf(node: unknown): TestNode["props"] {
  return (node as { props?: TestNode["props"] }).props;
}

function collectByComponent(node: unknown, component: unknown): unknown[] {
  const out: unknown[] = [];
  const walk = (n: unknown): void => {
    if (n === null || n === undefined) return;
    if (Array.isArray(n)) {
      n.forEach(walk);
      return;
    }
    if (typeof n === "object") {
      const t = (n as TestNode).type;
      if (t === component) out.push(n);
      const children = propsOf(n)?.children;
      if (children !== undefined) walk(children);
    }
  };
  walk(node);
  return out;
}

function childTexts(node: unknown): string[] {
  const out: string[] = [];
  const walk = (n: unknown): void => {
    if (n === null || n === undefined) return;
    if (Array.isArray(n)) {
      n.forEach(walk);
      return;
    }
    if (typeof n === "string") {
      out.push(n);
      return;
    }
    if (typeof n === "object") {
      const children = propsOf(n)?.children;
      if (children !== undefined) walk(children);
    }
  };
  walk(node);
  return out;
}

function pointsOf(node: unknown): string | null {
  return propsOf(node)?.points ?? null;
}

function parsePoints(points: string): number[] {
  return points.split(" ").flatMap((pair) =>
    pair.split(",").map((v) => parseFloat(v)),
  );
}

function dataPolygons(node: unknown): unknown[] {
  return collectByComponent(node, Polygon).filter((n) => {
    return propsOf(n)?.fill !== "none";
  });
}

function gridPolygons(node: unknown): unknown[] {
  return collectByComponent(node, Polygon).filter((n) => {
    return propsOf(n)?.fill === "none";
  });
}

const DIMENSIONS: RadarChartProps["dimensions"] = [
  { name: "Governança e Responsabilidade", nivel: 3 },
  { name: "Patrocínio Executivo", nivel: 2 },
  { name: "Arquitetura e Integração", nivel: 4 },
  { name: "Qualidade de Dados", nivel: 3 },
  { name: "Metadados e Rastreabilidade", nivel: 2 },
  { name: "Dados Mestres e Cadastros", nivel: 2 },
  { name: "Segurança e Conformidade", nivel: 3 },
  { name: "Consumo e Autonomia Analítica", nivel: 3 },
  { name: "IA, Modelos e Analytics", nivel: 4 },
  { name: "Time e Capacidade", nivel: 3 },
];

describe("clampLevel", () => {
  it("clampa nivel menor que 1 para 1 (RADAR-04)", () => {
    expect(clampLevel(0)).toBe(1);
    expect(clampLevel(-3)).toBe(1);
  });

  it("clampa nivel maior que 5 para 5 (RADAR-04)", () => {
    expect(clampLevel(6)).toBe(5);
    expect(clampLevel(99)).toBe(5);
  });

  it("mantém níveis dentro de 1–5 (RADAR-04)", () => {
    expect(clampLevel(1)).toBe(1);
    expect(clampLevel(3)).toBe(3);
    expect(clampLevel(5)).toBe(5);
  });
});

describe("RadarChart", () => {
  it("retorna um elemento Svg (RADAR-01/06)", () => {
    const el = RadarChart({ dimensions: DIMENSIONS });
    expect(el).not.toBeNull();
    expect((el as TestNode).type).toBe(Svg);
  });

  it("retorna null quando dimensions está vazio", () => {
    expect(RadarChart({ dimensions: [] })).toBeNull();
  });

  it("desenha o grid com 5 anéis (RADAR-02)", () => {
    const el = RadarChart({ dimensions: DIMENSIONS });
    const grid = gridPolygons(el);
    expect(grid).toHaveLength(RADAR_LEVELS.length);
  });

  it("desenha um eixo por dimensão (RADAR-03)", () => {
    const el = RadarChart({ dimensions: DIMENSIONS });
    const lines = collectByComponent(el, Line);
    expect(lines).toHaveLength(DIMENSIONS.length);
  });

  it("desenha um polígono de dados com um ponto por dimensão (RADAR-03)", () => {
    const el = RadarChart({ dimensions: DIMENSIONS });
    const data = dataPolygons(el);
    expect(data).toHaveLength(1);
    const coords = parsePoints(pointsOf(data[0])!);
    expect(coords.length).toBe(DIMENSIONS.length * 2);
  });

  it("clampa níveis fora de 1–5 no polígono de dados (RADAR-04)", () => {
    const dims: RadarChartProps["dimensions"] = [
      { name: "A", nivel: 0 },
      { name: "B", nivel: 6 },
    ];
    const el = RadarChart({ dimensions: dims });
    const data = dataPolygons(el);
    expect(data).toHaveLength(1);
    const coords = parsePoints(pointsOf(data[0])!);
    const insideGrid = (x: number, y: number): boolean => {
      const dx = x - 160;
      const dy = y - 160;
      return Math.hypot(dx, dy) <= 120 + 1e-6;
    };
    for (let i = 0; i < coords.length; i += 2) {
      expect(insideGrid(coords[i], coords[i + 1])).toBe(true);
    }
  });

  it("desenha um label Text por dimensão (RADAR-05)", () => {
    const el = RadarChart({ dimensions: DIMENSIONS });
    const texts = collectByComponent(el, Text);
    expect(texts).toHaveLength(DIMENSIONS.length);
    const all = childTexts(el);
    for (const d of DIMENSIONS) {
      expect(all).toContain(d.name);
    }
  });
});
