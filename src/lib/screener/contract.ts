import { z } from "zod";
import snapshotJson from "../../../docs/snapshot-maturidade-dados.json";

// --- Zod schemas for contract validation ---

const metaSchema = z.object({
  nome: z.string(),
  versao: z.string(),
  autor: z.string(),
  tipo: z.string(),
  escala: z.string(),
  aviso_metodologico: z.string(),
  tempo_estimado_min: z.number(),
});

const contextOptionSchema = z.string().min(1);

const contextQuestionSchema = z.object({
  id: z.string(),
  pergunta: z.string(),
  tipo: z.literal("single_select"),
  pontuada: z.literal(false),
  uso: z.string(),
  opcoes: z.array(contextOptionSchema).min(1),
});

const cargosSchema = z.array(contextOptionSchema).min(1);

const profileQuestionSchema = contextQuestionSchema;

const dimensionOptionSchema = z.object({
  nivel: z.number().int().min(1).max(5),
  texto: z.string().min(1),
});

const dimensionSchema = z.object({
  id: z.string(),
  nome: z.string(),
  peso: z.number().positive(),
  area_dmbok: z.string(),
  pergunta: z.string(),
  opcoes: z.array(dimensionOptionSchema).length(5),
});

const commercialQuestionSchema = z.object({
  id: z.string(),
  pontuada: z.literal(false),
  aviso: z.string(),
  pergunta: z.string(),
  opcoes: z.array(z.string().min(1)).min(1),
});

const scoreBandSchema = z.object({
  min: z.number(),
  max: z.number(),
  rotulo: z.string(),
  descricao: z.string(),
});

const scoringSchema = z.object({
  formula: z.string(),
  aviso: z.string(),
  faixas: z.array(scoreBandSchema).min(1),
  regras_de_relatorio: z.array(z.string()).min(1),
});

export const screenerContractSchema = z.object({
  meta: metaSchema,
  cargos: cargosSchema,
  perfil_empresa: z.array(profileQuestionSchema).min(1),
  perguntas_contexto: z.array(contextQuestionSchema).length(0),
  dimensoes: z.array(dimensionSchema).length(10),
  pergunta_comercial: commercialQuestionSchema,
  scoring: scoringSchema,
});

// --- Inferred types ---

export type ScreenerMeta = z.infer<typeof metaSchema>;
export type ScreenerCargo = z.infer<typeof cargosSchema>[number];
export type ScreenerContextQuestion = z.infer<typeof contextQuestionSchema>;
export type ScreenerProfileQuestion = z.infer<typeof profileQuestionSchema>;
export type ScreenerDimensionOption = z.infer<typeof dimensionOptionSchema>;
export type ScreenerDimension = z.infer<typeof dimensionSchema>;
export type ScreenerCommercialQuestion = z.infer<typeof commercialQuestionSchema>;
export type ScoreBand = z.infer<typeof scoreBandSchema>;
export type ScoringConfig = z.infer<typeof scoringSchema>;
export type ScreenerContract = z.infer<typeof screenerContractSchema>;

// --- Contract loading ---

function loadContract(): ScreenerContract {
  const result = screenerContractSchema.safeParse(snapshotJson);
  if (!result.success) {
    const issues = result.error.issues
      .map((i) => `${i.path.join(".")}: ${i.message}`)
      .join("; ");
    throw new Error(`Contrato JSON inválido: ${issues}`);
  }
  return result.data;
}

export const SCREENER_CONTRACT: ScreenerContract = loadContract();

// --- Derived helpers ---

export const DIMENSION_IDS: string[] = SCREENER_CONTRACT.dimensoes.map(
  (d) => d.id,
);

export const CARGOS: string[] = [...SCREENER_CONTRACT.cargos];

export const PERFIL_IDS: string[] = SCREENER_CONTRACT.perfil_empresa.map(
  (q) => q.id,
);

export const COMMERCIAL_ID: string = SCREENER_CONTRACT.pergunta_comercial.id;

export function getDimensionById(
  id: string,
): ScreenerDimension | undefined {
  return SCREENER_CONTRACT.dimensoes.find((d) => d.id === id);
}

export function getProfileQuestionById(
  id: string,
): ScreenerProfileQuestion | undefined {
  return SCREENER_CONTRACT.perfil_empresa.find((q) => q.id === id);
}

export function getContextQuestionById(
  id: string,
): ScreenerContextQuestion | undefined {
  return SCREENER_CONTRACT.perguntas_contexto.find((q) => q.id === id);
}
