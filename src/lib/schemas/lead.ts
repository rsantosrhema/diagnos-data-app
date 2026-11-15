import { z } from "zod";
import { UF_SIGLAS } from "@/lib/localidades/estados";
import { CARGOS } from "@/lib/screener/contract";

export const roleSchema = z.enum(CARGOS as [string, ...string[]]);

export const stateSchema = z.enum(UF_SIGLAS, {
  errorMap: () => ({ message: "Informe um estado válido" }),
});

export const citySchema = z
  .string({ required_error: "Informe a cidade" })
  .trim()
  .min(2, "Informe a cidade")
  .max(80, "Cidade muito longa")
  .refine((value) => !/[<>]/.test(value), "Cidade inválida");

export const leadSchema = z
  .object({
    name: z.string().trim().min(2, "Nome muito curto").max(120),
    company: z.string().trim().min(2, "Empresa muito curta").max(120),
    phone: z.string().trim().min(8, "Telefone inválido").max(20),
    email: z.string().trim().email("Email inválido").max(160),
    role: roleSchema,
    state: stateSchema,
    city: citySchema,
    website: z.string().optional(), // honeypot
  })
  .strict();

export type LeadInput = z.infer<typeof leadSchema>;

export function sanitizeText(value: string): string {
  return value.replace(/[<>]/g, "").trim();
}
