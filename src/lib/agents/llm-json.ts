import { generateText } from "ai";
import type { LanguageModel } from "ai";
import type { ZodType, ZodTypeDef } from "zod";

export class LlmJsonError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LlmJsonError";
  }
}

type GenerateTextFn = (options: {
  model: LanguageModel;
  system?: string;
  prompt: string;
  maxOutputTokens: number;
}) => Promise<{ text: string; finishReason: string }>;

export interface GenerateValidatedJsonOptions<T> {
  llm: LanguageModel;
  system?: string;
  prompt: string;
  schema: ZodType<T, ZodTypeDef, unknown>;
  maxOutputTokens: number;
  attempts?: number;
  normalize?: (raw: unknown) => unknown;
  generate?: GenerateTextFn;
}

const DEFAULT_ATTEMPTS = 3;
const MAX_ISSUES_IN_FEEDBACK = 8;

export function extractJson(text: string): unknown {
  const cleaned = text.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
  if (!cleaned) throw new LlmJsonError("Resposta vazia do LLM");

  const candidates = [cleaned];
  const fenced = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced) candidates.push(fenced[1].trim());
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start >= 0 && end > start) candidates.push(cleaned.slice(start, end + 1));

  for (const candidate of candidates) {
    try {
      return JSON.parse(candidate);
    } catch {
      /* tenta o próximo candidato */
    }
  }
  throw new LlmJsonError("Resposta do LLM não contém JSON válido");
}

// Modelos de raciocínio às vezes estouram o limite de tokens ou devolvem um
// campo fora do schema; uma nova tentativa com o erro explícito costuma corrigir.
export async function generateValidatedJson<T>(opts: GenerateValidatedJsonOptions<T>): Promise<T> {
  const generate = opts.generate ?? (generateText as unknown as GenerateTextFn);
  const attempts = opts.attempts ?? DEFAULT_ATTEMPTS;
  let feedback = "";
  let lastError = "erro desconhecido";

  for (let attempt = 1; attempt <= attempts; attempt++) {
    const { text, finishReason } = await generate({
      model: opts.llm,
      system: opts.system,
      prompt: feedback ? `${opts.prompt}\n\n${feedback}` : opts.prompt,
      maxOutputTokens: opts.maxOutputTokens,
    });

    if (finishReason === "length") {
      lastError = "Resposta do LLM foi cortada por limite de tokens";
      feedback =
        "ATENÇÃO: sua resposta anterior foi cortada por excesso de tamanho. Seja mais conciso (frases curtas) e devolva o JSON completo.";
      continue;
    }

    let raw: unknown;
    try {
      raw = extractJson(text);
    } catch (err) {
      lastError = err instanceof Error ? err.message : "Resposta do LLM não contém JSON válido";
      feedback =
        "ATENÇÃO: sua resposta anterior não era um JSON válido. Responda SOMENTE com o objeto JSON, sem texto ou markdown.";
      continue;
    }

    const parsed = opts.schema.safeParse(opts.normalize ? opts.normalize(raw) : raw);
    if (parsed.success) return parsed.data;

    const issues = parsed.error.issues
      .slice(0, MAX_ISSUES_IN_FEEDBACK)
      .map((i) => `- ${i.path.join(".") || "(raiz)"}: ${i.message}`)
      .join("\n");
    lastError = "Resposta do LLM não validou o schema esperado";
    feedback = `ATENÇÃO: sua resposta anterior não seguiu o schema. Corrija estes campos e devolva o JSON completo:\n${issues}`;
  }

  throw new LlmJsonError(`${lastError} (após ${attempts} tentativas)`);
}
