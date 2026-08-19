import { z } from "zod";

export const leadSchema = z.object({
  name: z.string().trim().min(2, "Nome muito curto").max(120),
  company: z.string().trim().min(2, "Empresa muito curta").max(120),
  phone: z.string().trim().min(8, "Telefone inválido").max(20),
  email: z.string().trim().email("Email inválido").max(160),
  role: z.string().trim().min(2, "Cargo muito curto").max(120),
  website: z.string().optional(), // honeypot
});

export type LeadInput = z.infer<typeof leadSchema>;

export function sanitizeText(value: string): string {
  return value.replace(/[<>]/g, "").trim();
}
