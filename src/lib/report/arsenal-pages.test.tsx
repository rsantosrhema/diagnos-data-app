import { describe, it, expect } from "vitest";
import { Page } from "@react-pdf/renderer";
import { makeArsenal } from "@/lib/agents/commercial-fixture";
import { COMMERCIAL_CATALOG } from "@/lib/comercial/catalog";
import { buildArsenalPages } from "./arsenal-pages";
import { COLORS } from "./report-primitives";

function textOf(node: unknown): string[] {
  if (node === null || node === undefined) return [];
  if (typeof node === "string") return [node];
  if (typeof node === "number") return [String(node)];
  if (Array.isArray(node)) return node.flatMap(textOf);
  const props = (node as { props?: unknown }).props;
  if (typeof props !== "object" || props === null) return [];
  return textOf((props as { children?: unknown }).children);
}

function collectStyleObjects(node: unknown): Record<string, unknown>[] {
  const collected: Record<string, unknown>[] = [];

  const walk = (value: unknown): void => {
    if (value === null || value === undefined) return;
    if (Array.isArray(value)) {
      value.forEach(walk);
      return;
    }
    if (typeof value !== "object") return;
    const props = (value as { props?: unknown }).props;
    if (typeof props !== "object" || props === null) return;
    const style = (props as { style?: unknown }).style;
    const addStyle = (candidate: unknown) => {
      if (candidate && typeof candidate === "object") {
        collected.push(candidate as Record<string, unknown>);
      }
    };
    if (Array.isArray(style)) style.forEach(addStyle);
    else addStyle(style);
    walk((props as { children?: unknown }).children);
  };

  walk(node);
  return collected;
}

const COLOR_PROPERTIES = [
  "color",
  "backgroundColor",
  "borderColor",
  "borderTopColor",
  "borderBottomColor",
];

function expectOnlyReportTokens(page: unknown): void {
  const allowedColors = new Set(Object.values(COLORS));
  for (const style of collectStyleObjects(page)) {
    for (const property of COLOR_PROPERTIES) {
      const value = style[property];
      if (typeof value === "string") {
        expect(allowedColors.has(value)).toBe(true);
      }
    }
    if (typeof style.fontFamily === "string") {
      expect(["Inter", "Poppins"]).toContain(style.fontFamily);
    }
  }
}

describe("buildArsenalPages - página 1", () => {
  it("devolve exatamente três páginas, na ordem arsenal-1 a arsenal-3", () => {
    const pages = buildArsenalPages(makeArsenal());

    expect(pages).toHaveLength(3);
    expect(pages.map((page) => page.type)).toEqual([Page, Page, Page]);
    expect(pages.map((page) => page.key)).toEqual([
      "arsenal-1",
      "arsenal-2",
      "arsenal-3",
    ]);
  });

  it("mostra running head, seções 01 e 02 e o conteúdo dos pontos e do serviço na ordem (ARS-29, ARS-30, ARS-31, ARS-32)", () => {
    const arsenal = makeArsenal();
    const texts = textOf(buildArsenalPages(arsenal)[0]);

    const expectedInOrder = [
      "ARSENAL COMERCIAL · USO INTERNO · CONFIDENCIAL",
      "01",
      "Pontos-chave para a reunião",
      ...arsenal.pontos_chave.flatMap((point) => [point.titulo, point.texto]),
      "02",
      "Serviço ideal",
      "Governança de Dados",
      arsenal.servico_recomendado.justificativa,
      "Complementares: Qualidade e Dados Mestres",
    ];

    let cursor = -1;
    for (const expected of expectedInOrder) {
      const index = texts.indexOf(expected);
      expect(index).toBeGreaterThan(cursor);
      cursor = index;
    }
  });

  it("mostra os nomes curtos das dimensões de cada ponto (ARS-31)", () => {
    const texts = textOf(buildArsenalPages(makeArsenal())[0]);

    expect(texts).toContain("Dimensões: Governança, Patrocínio");
    expect(texts).toContain("Dimensões: Qualidade, Mestres");
    expect(texts).toContain("Dimensões: Arquitetura, Metadados");
    expect(texts).toContain("Dimensões: Consumo, Time");
  });

  it("mostra a nota de catálogo preliminar enquanto o status é rascunho (ARS-35)", () => {
    const texts = textOf(buildArsenalPages(makeArsenal(), COMMERCIAL_CATALOG)[0]);

    expect(texts).toContain("Catálogo de serviços preliminar: validar antes de ofertar");
  });

  it("omite a nota de catálogo preliminar quando o status é aprovado (ARS-35)", () => {
    const texts = textOf(
      buildArsenalPages(makeArsenal(), {
        ...COMMERCIAL_CATALOG,
        status: "aprovado",
      })[0],
    );

    expect(texts).not.toContain("Catálogo de serviços preliminar: validar antes de ofertar");
  });

  it("não imprime a linha de complementares quando não existem (ARS-32)", () => {
    const arsenal = makeArsenal();
    const withoutComplementary = makeArsenal({
      servico_recomendado: {
        ...arsenal.servico_recomendado,
        complementares: undefined,
      },
    });

    const texts = textOf(buildArsenalPages(withoutComplementary)[0]);

    expect(texts.some((text) => text.startsWith("Complementares:"))).toBe(false);
  });

  it("usa apenas tokens de cor do relatório e as fontes Inter/Poppins (ARS-36)", () => {
    expectOnlyReportTokens(buildArsenalPages(makeArsenal())[0]);
  });
});

describe("buildArsenalPages - página 2", () => {
  function pageTwo(arsenal = makeArsenal(), catalog = COMMERCIAL_CATALOG) {
    return buildArsenalPages(arsenal, catalog)[1];
  }

  it("mostra a seção 03, o nome de cada grupo e os três textos de cada objeção (ARS-33)", () => {
    const arsenal = makeArsenal();
    const texts = textOf(pageTwo(arsenal));

    expect(texts).toContain("03");
    expect(texts).toContain("Contorno de objeções");

    for (const objection of arsenal.objecoes) {
      const group = COMMERCIAL_CATALOG.grupos.find(
        (item) => item.id === objection.grupo,
      );
      expect(texts).toContain(group?.nome);
      expect(texts).toContain(objection.objecao_provavel);
      expect(texts).toContain(objection.contorno);
      expect(texts).toContain(objection.apoio);
    }
  });

  it("repete cada rótulo exatamente uma vez por objeção (ARS-33)", () => {
    const arsenal = makeArsenal();
    const texts = textOf(pageTwo(arsenal));
    const count = (label: string) => texts.filter((text) => text === label).length;

    expect(count("OBJEÇÃO PROVÁVEL")).toBe(arsenal.objecoes.length);
    expect(count("CONTORNO")).toBe(arsenal.objecoes.length);
    expect(count("APOIO NO DIAGNÓSTICO")).toBe(arsenal.objecoes.length);
  });

  it("mostra o nome do grupo antes da objeção provável (ARS-33)", () => {
    const arsenal = makeArsenal();
    const texts = textOf(pageTwo(arsenal));

    for (const objection of arsenal.objecoes) {
      const groupName = COMMERCIAL_CATALOG.grupos.find(
        (item) => item.id === objection.grupo,
      )?.nome;
      expect(texts.indexOf(String(groupName))).toBeLessThan(
        texts.indexOf(objection.objecao_provavel),
      );
    }
  });

  it("usa o id cru quando o grupo não existe no catálogo (ARS-33)", () => {
    const catalogWithoutPreco = {
      ...COMMERCIAL_CATALOG,
      grupos: COMMERCIAL_CATALOG.grupos.filter((group) => group.id !== "preco"),
    };
    const texts = textOf(pageTwo(makeArsenal(), catalogWithoutPreco));

    expect(texts).toContain("preco");
    expect(texts).not.toContain("Preço e orçamento");
  });

  it("usa apenas tokens de cor do relatório e as fontes Inter/Poppins (ARS-36)", () => {
    expectOnlyReportTokens(pageTwo());
  });
});
