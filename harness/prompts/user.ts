import type { DiagnosticInput } from "../core/types";
import { DIMENSIONS } from "../config/maturity-model";
import { QUESTIONNAIRE } from "../config/questionnaire";

export function buildUserPrompt(input: DiagnosticInput): string {
  const company = input.company;
  const answers = input.answers
    .map((answer) => {
      const question = QUESTIONNAIRE.find((q) => q.id === answer.questionId);
      const label = question?.options.find(
        (o) => o.value === answer.optionValue,
      )?.label;
      return `- ${question?.text ?? answer.questionId}: ${label ?? answer.optionValue}`;
    })
    .join("\n");

  const dimensions = DIMENSIONS.map((d) => `- ${d.id}`).join("\n");

  return `Company: ${company.name}
Industry: ${company.industry ?? "Not provided"}
Size: ${company.size ?? "Not provided"}
Notes: ${company.notes ?? "None"}

Questionnaire answers:
${answers}

Dimensions to score:
${dimensions}

Evaluate the data maturity and return the JSON result.`;
}
