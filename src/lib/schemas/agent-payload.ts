import { z } from "zod";

export const agentPayloadSchema = z
  .object({
    versao: z.string().min(1),
    solicitante: z.object({
      nome: z.string().min(1),
      cargo: z.string(),
    }),
    empresa: z.object({
      nome: z.string().nullable(),
      porte: z.string().nullable(),
      segmento: z.string().nullable(),
      funcionarios: z.string().nullable(),
      faturamento: z.string().nullable(),
    }),
    contexto: z.record(z.string(), z.string()),
    perfil_empresa: z.record(z.string(), z.string()),
    respostas: z
      .array(
        z.object({
          dimensao_id: z.string().min(1),
          dimensao: z.string().min(1),
          pergunta: z.string(),
          nivel: z.number().int().min(1).max(5),
          peso: z.number().positive(),
          resposta: z.string(),
        }),
      )
      .min(1),
    resposta_comercial: z.object({
      pergunta: z.string(),
      resposta: z.string(),
    }),
    score: z.object({
      valor: z.number(),
      faixa: z.string().min(1),
      descricao: z.string(),
    }),
    risco: z.object({
      dimensao_id: z.string().min(1),
      nivel: z.number().int().min(1).max(5),
    }),
    desequilibrio: z.boolean(),
    consentimento: z.object({
      aceito: z.boolean(),
      texto: z.string(),
      aceito_em: z.string().min(1),
    }),
  })
  .strict();

export type AgentPayload = z.infer<typeof agentPayloadSchema>;
