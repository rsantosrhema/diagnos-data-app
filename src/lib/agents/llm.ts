import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { getEnv } from "@/lib/env";
import type { LanguageModel } from "ai";

export function getLlmModel(): LanguageModel {
  const env = getEnv();
  const provider = createOpenAICompatible({
    name: "llm",
    apiKey: env.LLM_API_KEY,
    baseURL: env.LLM_BASE_URL,
    supportsStructuredOutputs: false,
  });
  return provider(env.LLM_MODEL);
}
