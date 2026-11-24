import { describe, it, expect } from "vitest";
import { SCREENER_CONTRACT } from "./contract";
import { computeScores, computeContextualScores, ScoringError } from "./scoring";
import type { DimensionAnswer } from "./scoring";
import { SCORING_CALIBRATION, type ScoringCalibration } from "./scoring-calibration";
import { computeAdjustedWeights } from "./weight-calculator";

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

function allAnswersAt(
  nivel: number,
  overrides: Record<string, number> = {},
): DimensionAnswer[] {
  return DIMS.map((d) => ({
    dimensionId: d.id,
    nivel: overrides[d.id] ?? nivel,
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

  it("aplica a descrição setorial da faixa classificada pelo contrato (MET-09)", () => {
    // Era "usa faixas recalibradas para segmento conhecido": a classificação passou a vir do
    // contrato (MET-07) e a faixa setorial só empresta a `descricao` (MET-09).
    const result = computeContextualScores({
      contract: SCREENER_CONTRACT,
      calibration: SCORING_CALIBRATION,
      answers: allAnswers(3),
      contextAnswers: {},
      profile: { perfil_01: "Finanças/Fintech" },
    });
    expect(result.band.rotulo).toBe("Estruturado");
    expect(result.band.descricao).toBe(
      "Governança de dados regulatórios existe. Modelos de risco em produção sem monitoramento formal.",
    );
  });

  it("usa faixas padrão para segmento sem recalibração", () => {
    // MET-10: sem entrada setorial, a descrição vem da faixa do contrato.
    const result = computeContextualScores({
      contract: SCREENER_CONTRACT,
      calibration: SCORING_CALIBRATION,
      answers: allAnswers(3),
      contextAnswers: {},
      profile: { perfil_01: "Outro" },
    });
    expect(result.band.rotulo).toBe("Estruturado");
    expect(result.band.descricao).toBe(
      "Base técnica existe. O gargalo costuma ser governança e processo, não tecnologia.",
    );
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

  it("retorna dimensionScores com pesos ajustados diferentes dos base", () => {
    const result = computeContextualScores({
      contract: SCREENER_CONTRACT,
      calibration: SCORING_CALIBRATION,
      answers: allAnswers(3),
      contextAnswers: {},
      profile: { perfil_01: "Saúde", perfil_02: "Mais de 5.000", perfil_03: "Acima de R$ 1 bilhão" },
    });
    const baseResult = computeScores(SCREENER_CONTRACT, allAnswers(3), {});
    const pesosDiferentes = result.dimensionScores.some(
      (ds, i) => ds.peso !== baseResult.dimensionScores[i].peso,
    );
    expect(pesosDiferentes).toBe(true);
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

  it("Indústria com score 1,93 cai em Emergente com a descrição setorial (MET-08, MET-09)", () => {
    const result = computeContextualScores({
      contract: SCREENER_CONTRACT,
      calibration: SCORING_CALIBRATION,
      answers: allAnswersAt(2, { d06: 1 }),
      contextAnswers: {},
      profile: { perfil_01: "Indústria" },
    });
    expect(result.score).toBeCloseTo(1.93, 10);
    expect(result.band.rotulo).toBe("Emergente");
    expect(result.band.min).toBe(1.8);
    expect(result.band.max).toBe(2.6);
    expect(result.band.descricao).toBe(
      "Iniciativas isoladas de dados na produção. Integração com ERP/SAP ainda incipiente.",
    );
  });

  it.each([
    [1, "Inicial"],
    [2, "Emergente"],
    [3, "Estruturado"],
    [4, "Gerenciado"],
    [5, "Otimizado"],
  ])(
    "classifica a mesma régua do contrato para Saúde com todos os níveis %i → %s (MET-07)",
    (nivel, rotulo) => {
      const result = computeContextualScores({
        contract: SCREENER_CONTRACT,
        calibration: SCORING_CALIBRATION,
        answers: allAnswers(nivel),
        contextAnswers: {},
        profile: { perfil_01: "Saúde" },
      });
      const contractBand = SCREENER_CONTRACT.scoring.faixas.find(
        (faixa) => faixa.rotulo === rotulo,
      )!;
      const segmentBand = SCORING_CALIBRATION.recalibrated_bands.Saúde.find(
        (faixa) => faixa.rotulo === rotulo,
      )!;
      expect(result.score).toBe(nivel);
      expect(result.band.rotulo).toBe(rotulo);
      expect(result.band.min).toBe(contractBand.min);
      expect(result.band.max).toBe(contractBand.max);
      expect(result.band.descricao).toBe(segmentBand.descricao);
    },
  );

  it("ignora limites setoriais divergentes vindos da calibração (MET-07)", () => {
    const divergentBands = [
      { min: 1.0, max: 2.0, rotulo: "Inicial", descricao: "Setorial Inicial" },
      { min: 2.0, max: 2.8, rotulo: "Emergente", descricao: "Setorial Emergente" },
      { min: 2.8, max: 3.6, rotulo: "Estruturado", descricao: "Setorial Estruturado" },
      { min: 3.6, max: 4.4, rotulo: "Gerenciado", descricao: "Setorial Gerenciado" },
      { min: 4.4, max: 5.0, rotulo: "Otimizado", descricao: "Setorial Otimizado" },
    ];
    const calibration: ScoringCalibration = {
      ...SCORING_CALIBRATION,
      recalibrated_bands: {
        ...SCORING_CALIBRATION.recalibrated_bands,
        Outro: divergentBands,
      },
    };
    const result = computeContextualScores({
      contract: SCREENER_CONTRACT,
      calibration,
      answers: allAnswersAt(2, { d05: 1 }),
      contextAnswers: {},
      profile: { perfil_01: "Outro" },
    });
    expect(result.score).toBeCloseTo(1.9, 10);
    expect(result.band.rotulo).toBe("Emergente");
    expect(result.band.min).toBe(1.8);
    expect(result.band.max).toBe(2.6);
    expect(result.band.descricao).toBe("Setorial Emergente");
  });

  it("score exatamente 2,6 cai em Estruturado (limite pertence à faixa superior)", () => {
    const result = computeContextualScores({
      contract: SCREENER_CONTRACT,
      calibration: SCORING_CALIBRATION,
      answers: answersWith({
        d01: 3,
        d02: 3,
        d03: 3,
        d04: 3,
        d05: 3,
        d06: 2,
        d07: 2,
        d08: 2,
        d09: 2,
        d10: 2,
      }),
      contextAnswers: {},
      profile: { perfil_01: "Indústria" },
    });
    expect(result.score).toBeCloseTo(2.6, 10);
    expect(result.band.rotulo).toBe("Estruturado");
  });

  it("score exatamente 5,0 cai em Otimizado", () => {
    const result = computeContextualScores({
      contract: SCREENER_CONTRACT,
      calibration: SCORING_CALIBRATION,
      answers: allAnswers(5),
      contextAnswers: {},
      profile: { perfil_01: "Indústria" },
    });
    expect(result.score).toBe(5.0);
    expect(result.band.rotulo).toBe("Otimizado");
    expect(result.band.descricao).toBe(
      "Indústria 4.0 com dados como produto. Manutenção preditiva e digital twin operacionais.",
    );
  });

  it("mantém os pesos ajustados de computeAdjustedWeights para o mesmo perfil (MET-11)", () => {
    const profile = {
      perfil_01: "Indústria",
      perfil_02: "51 a 200",
      perfil_03: "R$ 5 a 50 milhões",
    };
    const expected = computeAdjustedWeights({
      calibration: SCORING_CALIBRATION,
      profile,
    });
    const result = computeContextualScores({
      contract: SCREENER_CONTRACT,
      calibration: SCORING_CALIBRATION,
      answers: allAnswers(3),
      contextAnswers: {},
      profile,
    });
    expect(result.dimensionScores.map((d) => d.peso)).toEqual(
      expected.map((w) => w.adjustedWeight),
    );
  });
});
