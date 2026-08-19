import { ValidationError } from "../core/errors";
import { llmEvaluationSchema, type LlmEvaluation } from "../core/schema";
import type { DiagnosticInput } from "../core/types";
import { SYSTEM_PROMPT } from "../prompts/system";
import { buildUserPrompt } from "../prompts/user";
import type { OllamaClient } from "../providers/ollama/client";

export interface Evaluator {
  evaluate(input: DiagnosticInput): Promise<LlmEvaluation>;
}

export class OllamaEvaluator implements Evaluator {
  constructor(private readonly client: OllamaClient) {}

  async evaluate(input: DiagnosticInput): Promise<LlmEvaluation> {
    const response = await this.client.chat({
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: buildUserPrompt(input) },
      ],
    });

    const content = response.message.content;
    const parsed = this.parseJson(content);
    const result = llmEvaluationSchema.safeParse(parsed);

    if (!result.success) {
      throw new ValidationError(
        result.error.issues.map((issue) => issue.message),
      );
    }

    return result.data;
  }

  private parseJson(content: string): unknown {
    const trimmed = content.trim();
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start === -1 || end === -1 || end <= start) {
      throw new ValidationError(["LLM output did not contain a JSON object"]);
    }
    const candidate = trimmed.slice(start, end + 1);
    try {
      return JSON.parse(candidate);
    } catch {
      throw new ValidationError(["LLM output was not valid JSON"]);
    }
  }
}
