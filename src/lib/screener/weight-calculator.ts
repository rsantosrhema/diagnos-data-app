import type { ScoringCalibration, RecalibratedBand } from "./scoring-calibration";

// --- Types ---

export interface AdjustedWeight {
  dimensionId: string;
  baseWeight: number;
  adjustedWeight: number;
  multiplier: number;
}

// --- Weight calculation ---

export function computeAdjustedWeights(params: {
  calibration: ScoringCalibration;
  profile: Record<string, string>;
}): AdjustedWeight[] {
  const { calibration, profile } = params;
  const dimensionIds = Object.keys(calibration.dimensions);

  const rawWeights = dimensionIds.map((dimId) => {
    const dim = calibration.dimensions[dimId];
    const multiplier = computeCombinedMultiplier(calibration, profile, dimId);
    return {
      dimensionId: dimId,
      baseWeight: dim.base_weight,
      rawAdjusted: dim.base_weight * multiplier,
      multiplier,
    };
  });

  const normalized = normalizeWeights(
    rawWeights.map((w) => w.rawAdjusted),
    calibration.normalization.target_total,
  );

  const clamped = rawWeights.map((w, i) => {
    const dim = calibration.dimensions[w.dimensionId];
    const maxChange = calibration.constraints.max_weight_change_percent / 100;
    const minWeight = Math.floor(dim.base_weight * (1 - maxChange));
    const maxWeight = Math.ceil(dim.base_weight * (1 + maxChange));
    const clampedWeight = clampWeight(normalized[i], minWeight, maxWeight);
    return {
      dimensionId: w.dimensionId,
      baseWeight: w.baseWeight,
      adjustedWeight: clampedWeight,
      multiplier: w.multiplier,
    };
  });

  const clampedValues = clamped.map((w) => w.adjustedWeight);
  const clampedSum = clampedValues.reduce((a, b) => a + b, 0);
  if (clampedSum !== calibration.normalization.target_total) {
    const renormalized = normalizeWeights(
      clampedValues,
      calibration.normalization.target_total,
    );
    return clamped.map((w, i) => ({
      ...w,
      adjustedWeight: renormalized[i],
    }));
  }

  return clamped;
}

function computeCombinedMultiplier(
  calibration: ScoringCalibration,
  profile: Record<string, string>,
  dimensionId: string,
): number {
  let combined = 1.0;

  for (const [factorName, factor] of Object.entries(calibration.profile_factors)) {
    const fieldValue = profile[factor.source_field];

    if (!fieldValue || fieldValue.trim() === "") {
      continue;
    }

    const factorMultipliers = factor.multipliers[fieldValue];
    if (!factorMultipliers) {
      continue;
    }

    const dimMultiplier = factorMultipliers[dimensionId] ?? 1.0;

    if (factor.type === "ordinal" && factor.weight !== undefined) {
      combined *= Math.pow(dimMultiplier, factor.weight);
    } else {
      combined *= dimMultiplier;
    }
  }

  return combined;
}

// --- Normalization (Largest Remainder / Hamilton method) ---

export function normalizeWeights(weights: number[], targetTotal: number): number[] {
  const sum = weights.reduce((a, b) => a + b, 0);
  if (sum === 0) return weights.map(() => 0);

  const scaled = weights.map((w) => (w / sum) * targetTotal);
  const floored = scaled.map(Math.floor);
  const remainders = scaled.map((v, i) => ({ index: i, remainder: v - floored[i] }));

  let currentSum = floored.reduce((a, b) => a + b, 0);
  const deficit = Math.round(targetTotal - currentSum);

  remainders.sort((a, b) => b.remainder - a.remainder);

  for (let i = 0; i < deficit; i++) {
    floored[remainders[i].index] += 1;
  }

  return floored;
}

// --- Clamping ---

export function clampWeight(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Math.round(value)));
}

// --- Bands ---

export function getRecalibratedBands(
  calibration: ScoringCalibration,
  segmento: string,
): RecalibratedBand[] {
  const bands = calibration.recalibrated_bands[segmento];
  if (bands && bands.length > 0) {
    return bands;
  }
  return [];
}
