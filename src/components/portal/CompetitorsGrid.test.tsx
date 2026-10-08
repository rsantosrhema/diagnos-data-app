// @vitest-environment jsdom
import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CompetitorsGrid } from "./CompetitorsGrid";
import { SourcesList } from "./SourcesList";

const COMPETITORS = [
  {
    nome: "Concorrente A",
    contexto: "Atua no mesmo segmento com dados centralizados.",
    url: "https://a.com",
    diferencial: "Antecipação de demanda com dados abertos.",
  },
  {
    nome: "Concorrente B",
    contexto: "Opera em escala regional.",
  },
];

describe("CompetitorsGrid", () => {
  it("renderiza cards com nome e contexto", () => {
    render(<CompetitorsGrid competitors={COMPETITORS} />);
    expect(screen.getByText("Concorrente A")).toBeTruthy();
    expect(screen.getByText("Concorrente B")).toBeTruthy();
    expect(
      screen.getByText("Atua no mesmo segmento com dados centralizados."),
    ).toBeTruthy();
  });

  it("renderiza link outbound com target blank e noopener quando url presente", () => {
    render(<CompetitorsGrid competitors={COMPETITORS} />);
    const link = screen.getByRole("link");
    expect(link.getAttribute("href")).toBe("https://a.com");
    expect(link.getAttribute("target")).toBe("_blank");
    expect(link.getAttribute("rel")).toBe("noopener noreferrer");
  });

  it("não renderiza link para concorrente sem url", () => {
    render(<CompetitorsGrid competitors={[COMPETITORS[1]]} />);
    expect(screen.queryByRole("link")).toBeNull();
  });

  it("renderiza diferencial quando presente", () => {
    render(<CompetitorsGrid competitors={COMPETITORS} />);
    expect(
      screen.getByText(/Antecipação de demanda com dados abertos/),
    ).toBeTruthy();
  });
});

const SOURCES = [
  { url: "https://exa.com/relatorio", titulo: "Relatório setorial 2025" },
  { url: "https://ibe.gov.br/dados", },
];

describe("SourcesList", () => {
  it("renderiza lista com titulo quando presente", () => {
    render(<SourcesList sources={SOURCES} />);
    const titled = screen.getByText("Relatório setorial 2025");
    const anchor = titled.closest("a");
    expect(anchor?.getAttribute("href")).toBe("https://exa.com/relatorio");
  });

  it("usa hostname como texto quando titulo ausente", () => {
    render(<SourcesList sources={SOURCES} />);
    expect(screen.getByText("ibe.gov.br")).toBeTruthy();
  });

  it("renderiza empty-state amigável quando lista vazia", () => {
    render(<SourcesList sources={[]} />);
    expect(
      screen.getByText("Sem fontes de mercado para exibir."),
    ).toBeTruthy();
    expect(screen.queryByRole("link")).toBeNull();
  });
});
