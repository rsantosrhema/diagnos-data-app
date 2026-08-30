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

const ENV_KEYS = ["LLM_BASE_URL", "LLM_API_KEY", "LLM_MODEL", "EXA_API_KEY"] as const;

export function getEnv(): Env {
  if (cached) return cached;
  const subset: Record<string, string | undefined> = {};
  for (const key of ENV_KEYS) subset[key] = process.env[key];
  cached = EnvSchema.parse(subset);
  return cached;
}
