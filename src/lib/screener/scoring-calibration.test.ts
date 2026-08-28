import { describe, it, expect } from "vitest";
import {
  SCORING_CALIBRATION,
  scoringCalibrationSchema,
  getDimensionIds,
  getSegmentsWithBands,
  getProfileFactorNames,
  type ScoringCalibration,
} from "./scoring-calibration";
import calibrationJson from "../../../docs/scoring-calibration.json";

describe("scoringCalibrationSchema", () => {
  it("valida o JSON de calibração sem erros", () => {
    const result = scoringCalibrationSchema.safeParse(calibrationJson);
    expect(result.success).toBe(true);
  });

  it("rejeita JSON com campo desconhecido (strict)", () => {
    const invalid = { ...calibrationJson, unknown_field: "test" };
    const result = scoringCalibrationSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it("rejeita JSON com version vazio", () => {
    const invalid = { ...calibrationJson, version: "" };
    const result = scoringCalibrationSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it("rejeita JSON com base_weight negativo", () => {
    const invalid = {
      ...calibrationJson,
      dimensions: {
        ...calibrationJson.dimensions,
        d01: { ...calibrationJson.dimensions.d01, base_weight: -1 },
      },
    };
    const result = scoringCalibrationSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it("rejeita JSON com multiplier zero", () => {
    const invalid = {
      ...calibrationJson,
      profile_factors: {
        ...calibrationJson.profile_factors,
        segmento: {
          ...calibrationJson.profile_factors.segmento,
          multipliers: {
            ...calibrationJson.profile_factors.segmento.multipliers,
            Outro: { d01: 0, d02: 1.0, d03: 1.0, d04: 1.0, d05: 1.0, d06: 1.0, d07: 1.0, d08: 1.0, d09: 1.0, d10: 1.0 },
          },
        },
      },
    };
    const result = scoringCalibrationSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });
});

describe("SCORING_CALIBRATION", () => {
  it("carrega sem erros", () => {
    expect(SCORING_CALIBRATION).toBeDefined();
    expect(SCORING_CALIBRATION.version).toBe("1.0.0");
  });

  it("tem 10 dimensões", () => {
    expect(Object.keys(SCORING_CALIBRATION.dimensions)).toHaveLength(10);
  });

  it("pesos base somam 100", () => {
    const total = Object.values(SCORING_CALIBRATION.dimensions).reduce(
      (sum, d) => sum + d.base_weight,
      0,
    );
    expect(total).toBe(100);
  });

  it("tem 3 fatores de perfil", () => {
    expect(Object.keys(SCORING_CALIBRATION.profile_factors)).toHaveLength(3);
  });

  it("fator segmento tem 9 opções", () => {
    const segmento = SCORING_CALIBRATION.profile_factors.segmento;
    expect(Object.keys(segmento.multipliers)).toHaveLength(9);
  });

  it("fator porte_funcionarios tem 5 opções", () => {
    const pf = SCORING_CALIBRATION.profile_factors.porte_funcionarios;
    expect(Object.keys(pf.multipliers)).toHaveLength(5);
  });

  it("fator porte_faturamento tem 5 opções", () => {
    const pf = SCORING_CALIBRATION.profile_factors.porte_faturamento;
    expect(Object.keys(pf.multipliers)).toHaveLength(5);
  });

  it("cada segmento tem multiplicadores para todas as 10 dimensões", () => {
    const segmento = SCORING_CALIBRATION.profile_factors.segmento;
    for (const [seg, mults] of Object.entries(segmento.multipliers)) {
      expect(Object.keys(mults)).toHaveLength(10);
    }
  });

  it("recalibrated_bands cobrem a escala 1.0-5.0", () => {
    for (const [seg, bands] of Object.entries(SCORING_CALIBRATION.recalibrated_bands)) {
      expect(bands[0].min).toBeLessThanOrEqual(1.0);
      expect(bands[bands.length - 1].max).toBeGreaterThanOrEqual(5.0);
    }
  });

  it("constraints.max_weight_change_percent é 40", () => {
    expect(SCORING_CALIBRATION.constraints.max_weight_change_percent).toBe(40);
  });
});

describe("getDimensionIds", () => {
  it("retorna 10 IDs", () => {
    expect(getDimensionIds()).toHaveLength(10);
  });

  it("contém d01 a d10", () => {
    const ids = getDimensionIds();
    for (let i = 1; i <= 10; i++) {
      expect(ids).toContain(`d${i.toString().padStart(2, "0")}`);
    }
  });
});

describe("getSegmentsWithBands", () => {
  it("retorna pelo menos 2 segmentos", () => {
    expect(getSegmentsWithBands().length).toBeGreaterThanOrEqual(2);
  });

  it("contém Finanças/Fintech", () => {
    expect(getSegmentsWithBands()).toContain("Finanças/Fintech");
  });
});

describe("getProfileFactorNames", () => {
  it("retorna 3 fatores", () => {
    expect(getProfileFactorNames()).toHaveLength(3);
  });

  it("contém segmento, porte_funcionarios, porte_faturamento", () => {
    const names = getProfileFactorNames();
    expect(names).toContain("segmento");
    expect(names).toContain("porte_funcionarios");
    expect(names).toContain("porte_faturamento");
  });
});
