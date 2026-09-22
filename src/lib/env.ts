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

const AppSecretsSchema = z
  .object({
    INTERNAL_API_KEY: z.string().min(32, "INTERNAL_API_KEY deve ter 32+ caracteres"),
    CRON_SECRET: z.string().min(32).optional(),
    RESEND_API_KEY: z.string().min(1).optional(),
    RESEND_FROM_EMAIL: z.string().optional(),
    MANAGER_NOTIFICATION_EMAIL: z.string().email().optional(),
    SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  })
  .strict();

export type Env = z.infer<typeof EnvSchema>;
export type AppSecrets = z.infer<typeof AppSecretsSchema>;

let cached: Env | null = null;
let cachedSecrets: AppSecrets | null = null;

const ENV_KEYS = ["LLM_BASE_URL", "LLM_API_KEY", "LLM_MODEL", "EXA_API_KEY"] as const;

const SECRET_KEYS = [
  "INTERNAL_API_KEY",
  "CRON_SECRET",
  "RESEND_API_KEY",
  "RESEND_FROM_EMAIL",
  "MANAGER_NOTIFICATION_EMAIL",
  "SUPABASE_SERVICE_ROLE_KEY",
] as const;

export function getEnv(): Env {
  if (cached) return cached;
  const subset: Record<string, string | undefined> = {};
  for (const key of ENV_KEYS) subset[key] = process.env[key];
  cached = EnvSchema.parse(subset);
  return cached;
}

/**
 * Validação fail-fast dos segredos do servidor. Uso opcional: chame em
 * rotas críticas ou num healthcheck para detectar config quebrada antes
 * de requisições reais. CRON_SECRET/RESEND_* são opcionais porque features
 * correspondentes podem estar desabilitadas.
 */
export function getSecrets(): AppSecrets {
  if (cachedSecrets) return cachedSecrets;
  const subset: Record<string, string | undefined> = {};
  for (const key of SECRET_KEYS) subset[key] = process.env[key];
  cachedSecrets = AppSecretsSchema.parse(subset);
  return cachedSecrets;
}
