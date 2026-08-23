import { z } from "zod";
import { sanitizeText } from "./lead";

// --- Submission payload ---

const dimensionAnswerSchema = z.object({
  dimensionId: z.string().min(1),
  nivel: z.number().int().min(1).max(5),
});

export const screenerSubmissionSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Nome muito curto")
    .max(120)
    .transform(sanitizeText),
  role: z
    .string()
    .trim()
    .min(2, "Cargo muito curto")
    .max(120)
    .transform(sanitizeText),
  email: z.string().trim().email("Email inválido").max(160),
  consent: z.literal(true, {
    errorMap: () => ({ message: "É necessário consentir para receber o diagnóstico" }),
  }),
  consentText: z.string().min(1),
  context: z.record(z.string(), z.string()),
  answers: z
    .array(dimensionAnswerSchema)
    .min(10, "Responda todas as 10 dimensões")
    .max(10, "Responda apenas as 10 dimensões"),
  commercialAnswer: z.string().optional().default(""),
  company: z
    .object({
      name: z.string().optional(),
      size: z.string().optional(),
    })
    .optional(),
  website: z.string().optional(), // honeypot
});

export type ScreenerSubmission = z.infer<typeof screenerSubmissionSchema>;

// --- Agent payload schema (validates buildAgentPayload output) ---

const agentRespostaSchema = z.object({
  dimensao_id: z.string(),
  dimensao: z.string(),
  pergunta: z.string(),
  nivel: z.number().int().min(1).max(5),
  peso: z.number().positive(),
  resposta: z.string(),
});

export const agentPayloadSchema = z.object({
  versao: z.literal("1.0"),
  solicitante: z.object({ nome: z.string(), cargo: z.string() }),
  empresa: z.object({
    nome: z.string().nullable(),
    porte: z.string().nullable(),
  }),
  contexto: z.record(z.string(), z.string()),
  respostas: z.array(agentRespostaSchema).length(10),
  resposta_comercial: z.object({
    pergunta: z.string(),
    resposta: z.string(),
  }),
  score: z.object({
    valor: z.number(),
    faixa: z.string(),
    descricao: z.string(),
  }),
  risco: z.object({ dimensao_id: z.string(), nivel: z.number().int() }),
  desequilibrio: z.boolean(),
  consentimento: z.object({
    aceito: z.boolean(),
    texto: z.string(),
    aceito_em: z.string(),
  }),
});

export type AgentPayloadValidated = z.infer<typeof agentPayloadSchema>;
