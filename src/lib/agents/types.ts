import { z } from "zod";
import type { AgentPayload } from "@/lib/screener/agent-payload";

export const researchResultSchema = z
  .object({
    title: z.string(),
    url: z.string(),
    snippet: z.string(),
  })
  .strict();
export type ResearchResult = z.infer<typeof researchResultSchema>;

export const researchSectionSchema = z
  .object({
    key: z.enum(["segmento", "faturamento", "porte", "concorrentes"]),
    query: z.string(),
    results: z.array(researchResultSchema),
    status: z.enum(["ok", "erro"]),
    error: z.string().optional(),
  })
  .strict();
export type ResearchSection = z.infer<typeof researchSectionSchema>;

export const marketResearchSchema = z
  .object({
    empresa: z
      .object({
        segmento: z.string().nullable(),
        faturamento: z.string().nullable(),
        funcionarios: z.string().nullable(),
        nome: z.string().nullable(),
      })
      .strict(),
    sections: z.array(researchSectionSchema),
    sources: z.array(z.string()),
  })
  .strict();
export type MarketResearch = z.infer<typeof marketResearchSchema>;

export const analysisPainSchema = z
  .object({
    dimensao_id: z.string(),
    dimensao: z.string(),
    dor: z.string(),
    evidencia_mercado: z.boolean(),
    confianca: z.number().min(0).max(1),
    nivel_atual: z.number().int().min(1).max(5).optional(),
    impacto_negocio: z.string().max(300).optional(),
    recomendacao_curta: z.string().max(300).optional(),
  })
  .strict();
export type AnalysisPain = z.infer<typeof analysisPainSchema>;

export const competitorContextSchema = z
  .object({
    nome: z.string(),
    contexto: z.string(),
    url: z.string().optional(),
    diferencial: z.string().max(300).optional(),
  })
  .strict();
export type CompetitorContext = z.infer<typeof competitorContextSchema>;

export const marketAnalysisSchema = z
  .object({
    resumo: z.string(),
    dores: z.array(analysisPainSchema),
    contexto_concorrentes: z.array(competitorContextSchema),
    posicionamento_setor: z.string().max(500).optional(),
    oportunidade_principal: z.string().max(300).optional(),
  })
  .strict();
export type MarketAnalysis = z.infer<typeof marketAnalysisSchema>;

export const insightBulletSchema = z
  .object({
    texto: z.string(),
    prioridade: z.enum(["alta", "media", "baixa"]),
    titulo: z.string().max(70).optional(),
    dimensao_ids: z.array(z.string()).optional(),
    proximo_passo: z.string().max(300).optional(),
  })
  .strict();
export type InsightBullet = z.infer<typeof insightBulletSchema>;

export const insightsBriefSchema = z
  .object({
    bullets: z.array(insightBulletSchema).max(10),
  })
  .strict();
export type InsightsBrief = z.infer<typeof insightsBriefSchema>;

export type { AgentPayload };
