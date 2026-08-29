import "server-only";
import { z } from "zod";

const EnvSchema = z
  .object({
    LLM_BASE_URL: z.string().url(),
    LLM_API_KEY: z.string().min(1),
    LLM_MODEL: z.string().min(1).default("deepseek/deepseek-v4-flash"),
    EXA_API_KEY: z.string().min(1),
  })
  .strict();

export type Env = z.infer<typeof EnvSchema>;

let cached: Env | null = null;

export function getEnv(): Env {
  if (cached) return cached;
  cached = EnvSchema.parse(process.env);
  return cached;
}

export function hasEnv(): boolean {
  return (
    typeof process.env.LLM_BASE_URL === "string" &&
    typeof process.env.LLM_API_KEY === "string" &&
    typeof process.env.EXA_API_KEY === "string"
  );
}
