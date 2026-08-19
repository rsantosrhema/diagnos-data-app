import { ValidationError } from "./errors";
import { diagnosticInputSchema } from "./schema";
import type { DiagnosticInput, DiagnosticResult, MaturitySummary } from "./types";
import { levelFromScore, levelLabel, weightedAggregate } from "../config/maturity-model";
import type { Evaluator } from "../evaluator/evaluator";
import type { ReportGenerator } from "../report/generator";
import { prepareChartData } from "../report/charts";

export interface PipelineDeps {
  evaluator: Evaluator;
  reportGenerator: ReportGenerator;
}

export class DiagnosticPipeline {
  constructor(private readonly deps: PipelineDeps) {}

  async run(input: DiagnosticInput): Promise<DiagnosticResult> {
    const validated = this.validate(input);

    const evaluation = await this.deps.evaluator.evaluate(validated);

    const maturity = this.buildMaturitySummary(evaluation);
    const charts = prepareChartData(maturity.dimensionScores);

    const result: DiagnosticResult = {
      company: validated.company,
      maturity,
      narrative: evaluation.narrative,
      charts,
      report: { pdf: Buffer.alloc(0), filename: "" },
    };

    const report = await this.deps.reportGenerator.generate(result);
    result.report = report;

    return result;
  }

  private validate(input: DiagnosticInput): DiagnosticInput {
    const parsed = diagnosticInputSchema.safeParse(input);
    if (!parsed.success) {
      throw new ValidationError(
        parsed.error.issues.map((issue) => issue.message),
      );
    }
    return parsed.data;
  }

  private buildMaturitySummary(
    evaluation: { dimensionScores: { dimension: string; score: number; weight: number }[] },
  ): MaturitySummary {
    const dimensionScores = evaluation.dimensionScores.map((score) => ({
      dimension: score.dimension as MaturitySummary["dimensionScores"][number]["dimension"],
      score: score.score,
      level: levelFromScore(score.score),
      weight: score.weight,
    }));

    const overallScore = weightedAggregate(dimensionScores);
    const overallLevel = levelFromScore(overallScore);

    return {
      overallScore,
      overallLevel,
      levelLabel: levelLabel(overallLevel),
      dimensionScores,
    };
  }
}
