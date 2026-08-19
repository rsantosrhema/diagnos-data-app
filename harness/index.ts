import { DiagnosticPipeline } from "./core/pipeline";
import { OllamaEvaluator } from "./evaluator/evaluator";
import { OllamaClient, loadOllamaConfig } from "./providers/ollama/client";
import { PlaceholderReportGenerator } from "./report/generator";
import type { DiagnosticInput, DiagnosticResult } from "./core/types";

export type { DiagnosticInput, DiagnosticResult } from "./core/types";
export { ValidationError, ProviderError, ReportError } from "./core/errors";
export { QUESTIONNAIRE } from "./config/questionnaire";
export { DIMENSIONS, MATURITY_LEVELS } from "./config/maturity-model";

export async function runDiagnostic(
  input: DiagnosticInput,
): Promise<DiagnosticResult> {
  const config = loadOllamaConfig();
  const client = new OllamaClient(config);
  const evaluator = new OllamaEvaluator(client);
  const reportGenerator = new PlaceholderReportGenerator();
  const pipeline = new DiagnosticPipeline({ evaluator, reportGenerator });
  return pipeline.run(input);
}
