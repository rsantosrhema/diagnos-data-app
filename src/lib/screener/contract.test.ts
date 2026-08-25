import { describe, it, expect } from "vitest";
import {
  SCREENER_CONTRACT,
  screenerContractSchema,
  DIMENSION_IDS,
  CARGOS,
  PERFIL_IDS,
  COMMERCIAL_ID,
  getDimensionById,
  getProfileQuestionById,
} from "./contract";
import snapshotJson from "../../../docs/snapshot-maturidade-dados.json";

describe("SCREENER_CONTRACT", () => {
  it("valida o JSON do snapshot sem erros", () => {
    const result = screenerContractSchema.safeParse(snapshotJson);
    expect(result.success).toBe(true);
  });

  it("tem lista de cargos não vazia", () => {
    expect(CARGOS.length).toBeGreaterThanOrEqual(1);
  });

  it("não tem perguntas de contexto (cargo movido para o lead)", () => {
    expect(SCREENER_CONTRACT.perguntas_contexto).toHaveLength(0);
  });

  it("tem 3 perguntas de perfil da empresa", () => {
    expect(SCREENER_CONTRACT.perfil_empresa).toHaveLength(3);
  });

  it("tem 10 dimensões", () => {
    expect(SCREENER_CONTRACT.dimensoes).toHaveLength(10);
  });

  it("cada dimensão tem exatamente 5 opções com níveis 1–5", () => {
    for (const dim of SCREENER_CONTRACT.dimensoes) {
      expect(dim.opcoes).toHaveLength(5);
      const niveis = dim.opcoes.map((o) => o.nivel).sort();
      expect(niveis).toEqual([1, 2, 3, 4, 5]);
    }
  });

  it("pesos das dimensões somam 100", () => {
    const total = SCREENER_CONTRACT.dimensoes.reduce(
      (sum, d) => sum + d.peso,
      0,
    );
    expect(total).toBe(100);
  });

  it("faixas têm min, max, rotulo e descricao", () => {
    for (const faixa of SCREENER_CONTRACT.scoring.faixas) {
      expect(faixa.min).toBeGreaterThanOrEqual(0);
      expect(faixa.max).toBeGreaterThan(faixa.min);
      expect(faixa.rotulo.length).toBeGreaterThan(0);
      expect(faixa.descricao.length).toBeGreaterThan(0);
    }
  });

  it("faixas cobrem a escala 1.0–5.0", () => {
    const faixas = SCREENER_CONTRACT.scoring.faixas;
    expect(faixas[0].min).toBeLessThanOrEqual(1.0);
    expect(faixas[faixas.length - 1].max).toBeGreaterThanOrEqual(5.0);
  });

  it("pergunta_comercial não é pontuada", () => {
    expect(SCREENER_CONTRACT.pergunta_comercial.pontuada).toBe(false);
  });

  it("regras_de_relatorio tem pelo menos 1 regra", () => {
    expect(SCREENER_CONTRACT.scoring.regras_de_relatorio.length).toBeGreaterThanOrEqual(1);
  });

  it("cada dimensão tem 5 opções com nivel 1-5", () => {
    for (const dim of SCREENER_CONTRACT.dimensoes) {
      for (let i = 0; i < 5; i++) {
        expect(dim.opcoes[i].nivel).toBe(i + 1);
        expect(dim.opcoes[i].texto.length).toBeGreaterThan(0);
      }
    }
  });
});

describe("DIMENSION_IDS", () => {
  it("contém 10 IDs únicos", () => {
    expect(DIMENSION_IDS).toHaveLength(10);
    expect(new Set(DIMENSION_IDS).size).toBe(10);
  });
});

describe("CARGOS", () => {
  it("inclui o cargo de C-level", () => {
    expect(CARGOS.some((c) => c.toLowerCase().includes("c-level"))).toBe(true);
  });
});

describe("PERFIL_IDS", () => {
  it("contém perfil_01, perfil_02 e perfil_03", () => {
    expect(PERFIL_IDS).toContain("perfil_01");
    expect(PERFIL_IDS).toContain("perfil_02");
    expect(PERFIL_IDS).toContain("perfil_03");
  });
});

describe("COMMERCIAL_ID", () => {
  it("é cta_01", () => {
    expect(COMMERCIAL_ID).toBe("cta_01");
  });
});

describe("getDimensionById", () => {
  it("retorna a dimensão quando o ID existe", () => {
    const dim = getDimensionById("d01");
    expect(dim).toBeDefined();
    expect(dim!.nome.length).toBeGreaterThan(0);
  });

  it("retorna undefined para ID inexistente", () => {
    expect(getDimensionById("d99")).toBeUndefined();
  });
});

describe("getProfileQuestionById", () => {
  it("retorna a pergunta quando o ID existe", () => {
    const q = getProfileQuestionById("perfil_01");
    expect(q).toBeDefined();
    expect(q!.pergunta.length).toBeGreaterThan(0);
  });

  it("retorna undefined para ID inexistente", () => {
    expect(getProfileQuestionById("perfil_99")).toBeUndefined();
  });
});
