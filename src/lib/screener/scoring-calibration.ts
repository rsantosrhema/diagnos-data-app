import { z } from "zod";
import calibrationJson from "../../../docs/scoring-calibration.json";

// --- Zod schemas for calibration validation ---

const dimensionConfigSchema = z.object({
  base_weight: z.number().positive(),
  min: z.number().positive(),
  max: z.number().positive(),
  description: z.string().min(1),
}).strict();

const multipliersSchema = z.record(z.string(), z.number().positive());

const profileFactorSchema = z.object({
  type: z.enum(["categorical", "ordinal"]),
  source_field: z.string().min(1),
  weight: z.number().min(0).max(1).optional(),
  multipliers: z.record(z.string(), multipliersSchema),
}).strict();

const normalizationSchema = z.object({
  method: z.literal("proportional"),
  target_total: z.number().positive(),
  rounding: z.literal("largest_remainder"),
}).strict();

const constraintsSchema = z.object({
  max_weight_change_percent: z.number().min(0).max(100),
  min_score: z.number(),
  max_score: z.number(),
}).strict();

const scoreBandSchema = z.object({
  min: z.number(),
  max: z.number(),
  rotulo: z.string().min(1),
  descricao: z.string().min(1),
}).strict();

export const scoringCalibrationSchema = z.object({
  version: z.string().min(1),
  effective_from: z.string().min(1),
  dimensions: z.record(z.string(), dimensionConfigSchema),
  profile_factors: z.record(z.string(), profileFactorSchema),
  normalization: normalizationSchema,
  constraints: constraintsSchema,
  recalibrated_bands: z.record(z.string(), z.array(scoreBandSchema).min(1)),
}).strict();

// --- Inferred types ---

export type DimensionConfig = z.infer<typeof dimensionConfigSchema>;
export type ProfileFactor = z.infer<typeof profileFactorSchema>;
export type RecalibratedBand = z.infer<typeof scoreBandSchema>;
export type ScoringCalibration = z.infer<typeof scoringCalibrationSchema>;

// --- Validation helpers ---

function validateBaseWeights(calibration: ScoringCalibration): void {
  const total = Object.values(calibration.dimensions).reduce(
    (sum, d) => sum + d.base_weight,
    0,
  );
  if (total !== calibration.normalization.target_total) {
    throw new Error(
      `Soma dos pesos base (${total}) ≠ target_total (${calibration.normalization.target_total})`,
    );
  }
}

function validateMinMax(calibration: ScoringCalibration): void {
  for (const [id, dim] of Object.entries(calibration.dimensions)) {
    if (dim.min > dim.base_weight || dim.max < dim.base_weight) {
      throw new Error(
        `Dimensão ${id}: base_weight (${dim.base_weight}) fora do range [${dim.min}, ${dim.max}]`,
      );
    }
  }
}

// --- Loading ---

function loadCalibration(): ScoringCalibration {
  const result = scoringCalibrationSchema.safeParse(calibrationJson);
  if (!result.success) {
    const issues = result.error.issues
      .map((i) => `${i.path.join(".")}: ${i.message}`)
      .join("; ");
    throw new Error(`Calibração JSON inválida: ${issues}`);
  }
  validateBaseWeights(result.data);
  validateMinMax(result.data);
  return result.data;
}

export const SCORING_CALIBRATION: ScoringCalibration = loadCalibration();

// --- Helpers ---

export function getDimensionIds(): string[] {
  return Object.keys(SCORING_CALIBRATION.dimensions);
}

export function getSegmentsWithBands(): string[] {
  return Object.keys(SCORING_CALIBRATION.recalibrated_bands);
}

export function getProfileFactorNames(): string[] {
  return Object.keys(SCORING_CALIBRATION.profile_factors);
}
