import { describe, it, expect } from "vitest";
import { SCREENER_CONTRACT } from "./contract";
import { computeScores, computeContextualScores, ScoringError } from "./scoring";
import type { DimensionAnswer } from "./scoring";
import { SCORING_CALIBRATION } from "./scoring-calibration";

const DIMS = SCREENER_CONTRACT.dimensoes;

function allAnswers(nivel: number): DimensionAnswer[] {
  return DIMS.map((d) => ({ dimensionId: d.id, nivel }));
}

function answersWith(levels: Record<string, number>): DimensionAnswer[] {
  return DIMS.map((d) => ({
    dimensionId: d.id,
    nivel: levels[d.id] ?? 3,
  }));
}

describe("computeScores", () => {
  it("todos nível 3 → score 3.0 → faixa Estruturado", () => {
    const result = computeScores(SCREENER_CONTRACT, allAnswers(3), {});
    expect(result.score).toBe(3.0);
    expect(result.band.rotulo).toBe("Estruturado");
  });

  it("todos nível 1 → score 1.0 → faixa Inicial", () => {
    const result = computeScores(SCREENER_CONTRACT, allAnswers(1), {});
    expect(result.score).toBe(1.0);
    expect(result.band.rotulo).toBe("Inicial");
  });

  it("todos nível 5 → score 5.0 → faixa Otimizado", () => {
    const result = computeScores(SCREENER_CONTRACT, allAnswers(5), {});
    expect(result.score).toBe(5.0);
    expect(result.band.rotulo).toBe("Otimizado");
  });

  it("todos nível 2 → score 2.0 → faixa Emergente", () => {
    const result = computeScores(SCREENER_CONTRACT, allAnswers(2), {});
    expect(result.score).toBe(2.0);
    expect(result.band.rotulo).toBe("Emergente");
  });

  it("todos nível 4 → score 4.0 → faixa Gerenciado", () => {
    const result = computeScores(SCREENER_CONTRACT, allAnswers(4), {});
    expect(result.score).toBe(4.0);
    expect(result.band.rotulo).toBe("Gerenciado");
  });

  it("identifica a dimensão de menor nível como risco", () => {
    const levels: Record<string, number> = {};
    DIMS.forEach((d, i) => {
      levels[d.id] = i === 0 ? 1 : 3;
    });
    const result = computeScores(SCREENER_CONTRACT, answersWith(levels), {});
    expect(result.riskDimension.id).toBe(DIMS[0].id);
    expect(result.riskDimension.nivel).toBe(1);
  });

  it("sinaliza desequilíbrio quando diferença > 3 níveis", () => {
    const levels: Record<string, number> = {};
    DIMS.forEach((d, i) => {
      levels[d.id] = i === 0 ? 1 : 5;
    });
    const result = computeScores(SCREENER_CONTRACT, answersWith(levels), {});
    expect(result.imbalance).toBe(true);
  });

  it("não sinaliza desequilíbrio quando diferença ≤ 3", () => {
    const result = computeScores(SCREENER_CONTRACT, allAnswers(3), {});
    expect(result.imbalance).toBe(false);
  });

  it("detecta C-level a partir do cargo", () => {
    const result = computeScores(
      SCREENER_CONTRACT,
      allAnswers(3),
      {},
      "C-level (CEO, CTO, CFO, CIO)",
    );
    expect(result.cLevel).toBe(true);
  });

  it("não marca C-level para cargo não-C-level", () => {
    const result = computeScores(
      SCREENER_CONTRACT,
      allAnswers(3),
      {},
      "Analista, engenheiro ou especialista",
    );
    expect(result.cLevel).toBe(false);
  });

  it("não marca C-level quando cargo ausente", () => {
    const result = computeScores(SCREENER_CONTRACT, allAnswers(3), {});
    expect(result.cLevel).toBe(false);
  });

  it("retorna dimensionScores com 10 itens", () => {
    const result = computeScores(SCREENER_CONTRACT, allAnswers(3), {});
    expect(result.dimensionScores).toHaveLength(10);
  });

  it("cada dimensionScore tem score = nivel * peso", () => {
    const result = computeScores(SCREENER_CONTRACT, allAnswers(3), {});
    for (const ds of result.dimensionScores) {
      expect(ds.score).toBe(ds.nivel * ds.peso);
    }
  });

  it("lança erro para número incorreto de respostas", () => {
    expect(() =>
      computeScores(
        SCREENER_CONTRACT,
        [{ dimensionId: "d01", nivel: 3 }],
        {},
      ),
    ).toThrow(ScoringError);
  });

  it("lança erro para nível inválido (0)", () => {
    const answers = allAnswers(3);
    answers[0] = { dimensionId: "d01", nivel: 0 };
    expect(() =>
      computeScores(SCREENER_CONTRACT, answers, {}),
    ).toThrow(ScoringError);
  });

  it("lança erro para nível inválido (6)", () => {
    const answers = allAnswers(3);
    answers[0] = { dimensionId: "d01", nivel: 6 };
    expect(() =>
      computeScores(SCREENER_CONTRACT, answers, {}),
    ).toThrow(ScoringError);
  });

  it("lança erro para dimensão desconhecida", () => {
    expect(() =>
      computeScores(
        SCREENER_CONTRACT,
        [...allAnswers(3).slice(0, 9), { dimensionId: "d99", nivel: 3 }],
        {},
      ),
    ).toThrow(ScoringError);
  });

  it("score no limite da faixa usa a faixa correta (limite inferior)", () => {
    const result = computeScores(SCREENER_CONTRACT, allAnswers(2), {});
    expect(result.score).toBe(2.0);
    expect(result.band.rotulo).toBe("Emergente");
  });

  it("score no limite da faixa usa a faixa correta (limite superior última faixa)", () => {
    const result = computeScores(SCREENER_CONTRACT, allAnswers(5), {});
    expect(result.score).toBe(5.0);
    expect(result.band.rotulo).toBe("Otimizado");
  });
});

describe("computeContextualScores", () => {
  it("retorna score com pesos neutros para perfil vazio", () => {
    const result = computeContextualScores({
      contract: SCREENER_CONTRACT,
      calibration: SCORING_CALIBRATION,
      answers: allAnswers(3),
      contextAnswers: {},
      profile: {},
    });
    expect(result.score).toBe(3.0);
    expect(result.dimensionScores).toHaveLength(10);
  });

  it("soma dos pesos ajustados = 100", () => {
    const result = computeContextualScores({
      contract: SCREENER_CONTRACT,
      calibration: SCORING_CALIBRATION,
      answers: allAnswers(3),
      contextAnswers: {},
      profile: { perfil_01: "Saúde", perfil_02: "Mais de 5.000" },
    });
    const totalPeso = result.dimensionScores.reduce((sum, d) => sum + d.peso, 0);
    expect(totalPeso).toBe(100);
  });

  it("usa faixas recalibradas para segmento conhecido", () => {
    const result = computeContextualScores({
      contract: SCREENER_CONTRACT,
      calibration: SCORING_CALIBRATION,
      answers: allAnswers(3),
      contextAnswers: {},
      profile: { perfil_01: "Finanças/Fintech" },
    });
    expect(result.band).toBeDefined();
    expect(result.band.rotulo).toBeDefined();
  });

  it("usa faixas padrão para segmento sem recalibração", () => {
    const result = computeContextualScores({
      contract: SCREENER_CONTRACT,
      calibration: SCORING_CALIBRATION,
      answers: allAnswers(3),
      contextAnswers: {},
      profile: { perfil_01: "Outro" },
    });
    expect(result.band.rotulo).toBe("Estruturado");
  });

  it("retorna dimensionScores com pesos ajustados", () => {
    const result = computeContextualScores({
      contract: SCREENER_CONTRACT,
      calibration: SCORING_CALIBRATION,
      answers: allAnswers(3),
      contextAnswers: {},
      profile: { perfil_01: "Saúde" },
    });
    for (const ds of result.dimensionScores) {
      expect(ds.peso).toBeGreaterThan(0);
      expect(Number.isInteger(ds.peso)).toBe(true);
    }
  });

  it("mantém backward compatibility com computeScores", () => {
    const original = computeScores(SCREENER_CONTRACT, allAnswers(3), {});
    const contextual = computeContextualScores({
      contract: SCREENER_CONTRACT,
      calibration: SCORING_CALIBRATION,
      answers: allAnswers(3),
      contextAnswers: {},
      profile: { perfil_01: "Outro" },
    });
    expect(contextual.score).toBe(original.score);
    expect(contextual.band.rotulo).toBe(original.band.rotulo);
  });
});
