import type { ChartDatum, DimensionScore } from "../core/types";
import { DIMENSION_BY_ID } from "../config/maturity-model";

export function prepareChartData(
  dimensionScores: DimensionScore[],
): { radar: ChartDatum[]; bar: ChartDatum[] } {
  const radar: ChartDatum[] = dimensionScores.map((score) => ({
    dimension: DIMENSION_BY_ID[score.dimension]?.name ?? score.dimension,
    score: score.score,
  }));

  const bar: ChartDatum[] = [...radar].sort((a, b) => b.score - a.score);

  return { radar, bar };
}
