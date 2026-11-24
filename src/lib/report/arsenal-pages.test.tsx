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

type ElementLike = {
  key?: unknown;
  props?: { style?: unknown; children?: unknown };
};

function childrenOf(node: unknown): unknown[] {
  const children = (node as ElementLike | null)?.props?.children;
  if (children === undefined || children === null) return [];
  return Array.isArray(children) ? children : [children];
}

function styleOf(node: unknown): unknown {
  return (node as ElementLike | null)?.props?.style;
}

function flattenStyle(style: unknown): Record<string, unknown> {
  if (Array.isArray(style)) {
    return style.reduce<Record<string, unknown>>(
      (merged, item) => ({ ...merged, ...flattenStyle(item) }),
      {},
    );
  }
  if (style && typeof style === "object") {
    return style as Record<string, unknown>;
  }
  return {};
}

function findElementsByKey(node: unknown, pattern: RegExp): unknown[] {
  const found: unknown[] = [];

  const walk = (value: unknown): void => {
    if (value === null || value === undefined) return;
    if (Array.isArray(value)) {
      value.forEach(walk);
      return;
    }
    if (typeof value !== "object") return;
    const element = value as ElementLike;
    if (typeof element.key === "string" && pattern.test(element.key)) {
      found.push(value);
    }
    childrenOf(value).forEach(walk);
  };

  walk(node);
  return found;
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

describe("buildArsenalPages - página 3", () => {
  function pageThree(arsenal = makeArsenal()) {
    return buildArsenalPages(arsenal)[2];
  }

  it("mostra a seção 04, os números 01 a 10 em ordem e todas as perguntas (ARS-34)", () => {
    const arsenal = makeArsenal();
    const texts = textOf(pageThree(arsenal));

    expect(texts).toContain("04");
    expect(texts).toContain("Perguntas de descoberta (SPIN)");

    const questionNumbers = texts
      .map((text, index) => ({ text, index }))
      .filter(
        ({ text, index }) =>
          /^\d{2}$/.test(text) &&
          (texts[index + 1] === "ABERTA" || texts[index + 1] === "FECHADA"),
      )
      .map(({ text }) => text);
    expect(questionNumbers).toEqual([
      "01",
      "02",
      "03",
      "04",
      "05",
      "06",
      "07",
      "08",
      "09",
      "10",
    ]);

    for (const question of arsenal.perguntas) {
      expect(texts).toContain(question.texto);
    }
  });

  it("conta os chips de formato e de etapa a partir dos dados (ARS-34)", () => {
    const arsenal = makeArsenal();
    const texts = textOf(pageThree(arsenal));
    const count = (label: string) => texts.filter((text) => text === label).length;

    expect(count("ABERTA")).toBe(6);
    expect(count("FECHADA")).toBe(4);
    expect(count("SITUAÇÃO")).toBe(1);
    expect(count("PROBLEMA")).toBe(3);
    expect(count("IMPLICAÇÃO")).toBe(3);
    expect(count("NECESSIDADE")).toBe(3);
  });

  it("mostra o objetivo imediatamente depois do texto de cada pergunta (ARS-34)", () => {
    const arsenal = makeArsenal();
    const texts = textOf(pageThree(arsenal));

    for (const question of arsenal.perguntas) {
      const position = texts.indexOf(question.texto);
      expect(texts[position + 1]).toBe(`Objetivo: ${question.objetivo}`);
    }
  });

  it("acompanha a quantidade de abertas e fechadas dos dados, sem número fixo (ARS-34)", () => {
    const arsenal = makeArsenal();
    const questions = arsenal.perguntas.map((question, index) =>
      index === 2 ? { ...question, formato: "aberta" as const } : question,
    );
    const texts = textOf(pageThree(makeArsenal({ perguntas: questions })));
    const count = (label: string) => texts.filter((text) => text === label).length;

    expect(count("ABERTA")).toBe(7);
    expect(count("FECHADA")).toBe(3);
  });

  it("usa apenas tokens de cor do relatório e as fontes Inter/Poppins (ARS-36)", () => {
    expectOnlyReportTokens(pageThree());
  });

  it("alinha a coluna de chips e comporta o rótulo de etapa mais longo (ARS-34)", () => {
    const page = pageThree();
    const rows = findElementsByKey(page, /^arsenal-question-\d+$/);
    expect(rows).toHaveLength(10);

    const numberWidths = rows.map((row) =>
      flattenStyle(styleOf(childrenOf(row)[0])).width,
    );
    const columnWidths = rows.map((row) =>
      flattenStyle(styleOf(childrenOf(row)[1])).width,
    );

    expect(numberWidths).toEqual(Array(10).fill(numberWidths[0]));
    expect(columnWidths).toEqual(Array(10).fill(columnWidths[0]));
    expect(typeof numberWidths[0]).toBe("number");
    expect(typeof columnWidths[0]).toBe("number");

    const chipWidths = rows.flatMap((row) =>
      childrenOf(childrenOf(row)[1]).map(
        (chip) => flattenStyle(styleOf(chip)).width,
      ),
    );
    expect(chipWidths).toHaveLength(20);
    expect(chipWidths).toEqual(Array(20).fill(columnWidths[0]));

    const firstChip = childrenOf(childrenOf(rows[0])[1])[0];
    const chipStyle = flattenStyle(styleOf(firstChip));
    const labelStyle = flattenStyle(styleOf(childrenOf(firstChip)[1]));
    const longestLabel = ["SITUAÇÃO", "PROBLEMA", "IMPLICAÇÃO", "NECESSIDADE"].reduce(
      (longest, label) => (label.length > longest.length ? label : longest),
    );
    const fontSize = labelStyle.fontSize as number;
    const letterSpacing = labelStyle.letterSpacing as number;
    const textWidth =
      longestLabel.length * (fontSize * 0.66 + letterSpacing);
    const required =
      textWidth +
      (chipStyle.paddingHorizontal as number) * 2 +
      (chipStyle.gap as number) +
      (chipStyle.borderWidth as number) * 2 +
      (flattenStyle(styleOf(childrenOf(firstChip)[0])).width as number);

    expect(longestLabel).toBe("NECESSIDADE");
    expect(columnWidths[0] as number).toBeGreaterThanOrEqual(required);
  });
});
