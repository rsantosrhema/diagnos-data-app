import { z } from "zod";

export const companyContextSchema = z.object({
  name: z.string().min(1, "Company name is required"),
  industry: z.string().optional(),
  size: z.string().optional(),
  notes: z.string().optional(),
});

export const answerSchema = z.object({
  questionId: z.string().min(1),
  optionValue: z.number().int().min(0).max(5),
});

export const diagnosticInputSchema = z.object({
  company: companyContextSchema,
  answers: z.array(answerSchema).min(8).max(12),
});

export const dimensionScoreSchema = z.object({
  dimension: z.string(),
  score: z.number().min(0).max(5),
  level: z.number().int().min(0).max(5),
  weight: z.number().positive(),
});

export const narrativeAnalysisSchema = z.object({
  summary: z.string(),
  strengths: z.array(z.string()),
  weaknesses: z.array(z.string()),
  recommendations: z.array(z.string()),
});

export const llmEvaluationSchema = z.object({
  dimensionScores: z.array(dimensionScoreSchema),
  narrative: narrativeAnalysisSchema,
});

export type DiagnosticInput = z.infer<typeof diagnosticInputSchema>;
export type LlmEvaluation = z.infer<typeof llmEvaluationSchema>;
