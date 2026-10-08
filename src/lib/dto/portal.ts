import { z } from "zod";
import { marketAnalysisSchema, insightsBriefSchema } from "@/lib/agents/types";

export const cmmiStageSchema = z
  .object({
    rotulo: z.string(),
    cor: z.string(),
    range: z.object({ min: z.number(), max: z.number() }).strict(),
    descricaoExecutiva: z.string(),
    caracteristicas: z.array(z.string()),
    sinaisRisco: z.array(z.string()),
    comoSubir: z.array(z.string()),
  })
  .strict();

export const portalDTOSchema = z
  .object({
    lead: z
      .object({ id: z.string(), name: z.string(), company: z.string() })
      .strict(),
    score: z
      .object({ valor: z.number(), faixa: z.string(), descricao: z.string() })
      .strict(),
    dimensions: z.array(
      z
        .object({
          id: z.string(),
          name: z.string(),
          nivel: z.number().int().min(1).max(5),
          peso: z.number().positive(),
          score: z.number(),
          pergunta: z.string(),
          resposta: z.string(),
        })
        .strict(),
    ),
    risk: z
      .object({ id: z.string(), name: z.string(), nivel: z.number().int().min(1).max(5) })
      .strict(),
    imbalance: z.boolean(),
    stage: cmmiStageSchema,
    analysisStatus: z.enum(["pendente", "processando", "analisado", "falha"]),
    analysis: marketAnalysisSchema.optional(),
    insights: insightsBriefSchema.optional(),
    sources: z.array(
      z.object({ url: z.string(), titulo: z.string().optional() }).strict(),
    ),
    commercialAnswer: z.string(),
  })
  .strict();

export const managerPortalDTOSchema = portalDTOSchema.extend({
  email: z.string(),
  share: z
    .object({
      active: z.boolean(),
      url: z.string().nullable(),
      expiresAt: z.string().nullable(),
    })
    .strict(),
});

export type PortalDTO = z.infer<typeof portalDTOSchema>;
export type ManagerPortalDTO = z.infer<typeof managerPortalDTOSchema>;
export type PublicPortalDTO = PortalDTO;

export function stripPii<T extends object>(payload: T): Omit<T, "email" | "phone"> {
  const { email: _email, phone: _phone, ...rest } = payload as Record<string, unknown>;
  return rest as Omit<T, "email" | "phone">;
}
