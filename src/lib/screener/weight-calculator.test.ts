import { describe, it, expect } from "vitest";
import {
  computeAdjustedWeights,
  normalizeWeights,
  clampWeight,
  getRecalibratedBands,
} from "./weight-calculator";
import { SCORING_CALIBRATION } from "./scoring-calibration";

describe("normalizeWeights", () => {
  it("retorna pesos que somam targetTotal", () => {
    const result = normalizeWeights([12, 12, 12, 12, 10, 8, 10, 10, 6, 8], 100);
    expect(result.reduce((a, b) => a + b, 0)).toBe(100);
  });

  it("distribui pesos iguais proporcionalmente", () => {
    const result = normalizeWeights([10, 10, 10], 30);
    expect(result).toEqual([10, 10, 10]);
  });

  it("distribui remainder para os maiores restos", () => {
    const result = normalizeWeights([33, 33, 34], 100);
    expect(result.reduce((a, b) => a + b, 0)).toBe(100);
  });

  it("lida com soma zero", () => {
    const result = normalizeWeights([0, 0, 0], 100);
    expect(result).toEqual([0, 0, 0]);
  });

  it("retorna pesos inteiros", () => {
    const result = normalizeWeights([11.1, 22.2, 33.3, 33.4], 100);
    for (const w of result) {
      expect(Number.isInteger(w)).toBe(true);
    }
  });
});

describe("clampWeight", () => {
  it("retorna valor dentro do range", () => {
    expect(clampWeight(10, 5, 15)).toBe(10);
  });

  it("clampa para mínimo", () => {
    expect(clampWeight(3, 5, 15)).toBe(5);
  });

  it("clampa para máximo", () => {
    expect(clampWeight(20, 5, 15)).toBe(15);
  });

  it("arredonda para inteiro", () => {
    expect(clampWeight(10.7, 5, 15)).toBe(11);
  });
});

describe("computeAdjustedWeights", () => {
  it("retorna pesos neutros quando perfil está vazio", () => {
    const result = computeAdjustedWeights({
      calibration: SCORING_CALIBRATION,
      profile: {},
    });
    expect(result).toHaveLength(10);
    const total = result.reduce((sum, w) => sum + w.adjustedWeight, 0);
    expect(total).toBe(100);
  });

  it("retorna pesos neutros para segmento Outro", () => {
    const result = computeAdjustedWeights({
      calibration: SCORING_CALIBRATION,
      profile: { perfil_01: "Outro" },
    });
    const total = result.reduce((sum, w) => sum + w.adjustedWeight, 0);
    expect(total).toBe(100);
    for (const w of result) {
      expect(w.multiplier).toBe(1.0);
    }
  });

  it("ajusta pesos para Saúde (Segurança/LGPD deve aumentar)", () => {
    const result = computeAdjustedWeights({
      calibration: SCORING_CALIBRATION,
      profile: { perfil_01: "Saúde" },
    });
    const total = result.reduce((sum, w) => sum + w.adjustedWeight, 0);
    expect(total).toBe(100);

    const seguranca = result.find((w) => w.dimensionId === "d07")!;
    expect(seguranca.adjustedWeight).toBeGreaterThan(seguranca.baseWeight);
  });

  it("ajusta pesos para Finanças/Fintech (Governança tem multiplicador > 1)", () => {
    const result = computeAdjustedWeights({
      calibration: SCORING_CALIBRATION,
      profile: { perfil_01: "Finanças/Fintech" },
    });
    const total = result.reduce((sum, w) => sum + w.adjustedWeight, 0);
    expect(total).toBe(100);

    const governanca = result.find((w) => w.dimensionId === "d01")!;
    expect(governanca.multiplier).toBeGreaterThan(1.0);
  });

  it("combina segmento + funcionários corretamente", () => {
    const result = computeAdjustedWeights({
      calibration: SCORING_CALIBRATION,
      profile: {
        perfil_01: "Saúde",
        perfil_02: "51 a 200",
      },
    });
    const total = result.reduce((sum, w) => sum + w.adjustedWeight, 0);
    expect(total).toBe(100);
  });

  it("combina segmento + funcionários + faturamento", () => {
    const result = computeAdjustedWeights({
      calibration: SCORING_CALIBRATION,
      profile: {
        perfil_01: "Indústria",
        perfil_02: "201 a 1.000",
        perfil_03: "R$ 50 a 250 milhões",
      },
    });
    const total = result.reduce((sum, w) => sum + w.adjustedWeight, 0);
    expect(total).toBe(100);
  });

  it("ignora campo de perfil ausente", () => {
    const result = computeAdjustedWeights({
      calibration: SCORING_CALIBRATION,
      profile: { perfil_01: "Saúde" },
    });
    const total = result.reduce((sum, w) => sum + w.adjustedWeight, 0);
    expect(total).toBe(100);
  });

  it("ignora valor de perfil não reconhecido", () => {
    const result = computeAdjustedWeights({
      calibration: SCORING_CALIBRATION,
      profile: { perfil_01: "SegmentoInexistente" },
    });
    const total = result.reduce((sum, w) => sum + w.adjustedWeight, 0);
    expect(total).toBe(100);
    for (const w of result) {
      expect(w.multiplier).toBe(1.0);
    }
  });

  it("pesos ajustados são inteiros", () => {
    const result = computeAdjustedWeights({
      calibration: SCORING_CALIBRATION,
      profile: {
        perfil_01: "Saúde",
        perfil_02: "Mais de 5.000",
        perfil_03: "Acima de R$ 1 bilhão",
      },
    });
    for (const w of result) {
      expect(Number.isInteger(w.adjustedWeight)).toBe(true);
    }
  });

  it("respeita clamp de ±40%", () => {
    const result = computeAdjustedWeights({
      calibration: SCORING_CALIBRATION,
      profile: {
        perfil_01: "Saúde",
        perfil_02: "Mais de 5.000",
        perfil_03: "Acima de R$ 1 bilhão",
      },
    });
    for (const w of result) {
      const maxChange = SCORING_CALIBRATION.constraints.max_weight_change_percent / 100;
      const minWeight = Math.floor(w.baseWeight * (1 - maxChange));
      const maxWeight = Math.ceil(w.baseWeight * (1 + maxChange));
      expect(w.adjustedWeight).toBeGreaterThanOrEqual(minWeight);
      expect(w.adjustedWeight).toBeLessThanOrEqual(maxWeight);
    }
  });
});

describe("getRecalibratedBands", () => {
  it("retorna faixas para segmento conhecido", () => {
    const bands = getRecalibratedBands(SCORING_CALIBRATION, "Finanças/Fintech");
    expect(bands.length).toBeGreaterThan(0);
    expect(bands[0].min).toBeLessThanOrEqual(1.0);
    expect(bands[bands.length - 1].max).toBeGreaterThanOrEqual(5.0);
  });

  it("retorna array vazio para segmento desconhecido", () => {
    const bands = getRecalibratedBands(SCORING_CALIBRATION, "SegmentoInexistente");
    expect(bands).toEqual([]);
  });

  it("faixas de Indústria cobrem 1.0-5.0", () => {
    const bands = getRecalibratedBands(SCORING_CALIBRATION, "Indústria");
    expect(bands[0].min).toBeLessThanOrEqual(1.0);
    expect(bands[bands.length - 1].max).toBeGreaterThanOrEqual(5.0);
  });
});
