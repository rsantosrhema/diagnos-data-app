import { z } from "zod";
import { DIMENSION_IDS } from "@/lib/screener/contract";
import { OBJECTION_GROUP_IDS, SERVICE_IDS } from "@/lib/comercial/catalog";

export const SPIN_STAGES = ["situacao", "problema", "implicacao", "necessidade"] as const;
export const QUESTION_FORMATS = ["aberta", "fechada"] as const;

export const ARSENAL_LIMITS = {
  pontosChave: { min: 3, max: 5, titulo: 70, texto: 300 },
  objecoes: { min: 3, max: 6, objecaoProvavel: 200, contorno: 400, apoio: 250 },
  servico: { justificativa: 500, complementares: 2 },
  perguntas: {
    total: 10,
    texto: 240,
    objetivo: 160,
    minAbertas: 4,
    minFechadas: 3,
    maxSituacao: 1,
    minProblema: 2,
    minImplicacao: 2,
    minNecessidade: 2,
  },
} as const;

function truncateAtWord(text: string, max: number): string {
  const cut = text.slice(0, max - 1);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`;
}

function clampedString(max: number) {
  return z.preprocess((value) => {
    if (typeof value !== "string") return value;
    const trimmed = value.trim();
    return trimmed.length > max ? truncateAtWord(trimmed, max) : trimmed;
  }, z.string().min(1).max(max));
}

const dimensionIdEnum = z.enum(DIMENSION_IDS as [string, ...string[]]);

export const keyPointSchema = z
  .object({
    titulo: clampedString(ARSENAL_LIMITS.pontosChave.titulo),
    texto: clampedString(ARSENAL_LIMITS.pontosChave.texto),
    dimensao_ids: z.array(dimensionIdEnum).min(1),
  })
  .strict();

export const recommendedServiceSchema = z
  .object({
    servico_id: z.enum(SERVICE_IDS),
    justificativa: clampedString(ARSENAL_LIMITS.servico.justificativa),
    dimensoes_atacadas: z.array(dimensionIdEnum).min(1),
    complementares: z
      .array(z.enum(SERVICE_IDS))
      .max(ARSENAL_LIMITS.servico.complementares)
      .optional(),
  })
  .strict()
  .superRefine((service, ctx) => {
    if (!service.complementares) return;
    const unique = new Set(service.complementares);
    if (
      unique.size !== service.complementares.length ||
      service.complementares.includes(service.servico_id)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "complementares não pode repetir o serviço principal ou outro complementar",
        path: ["complementares"],
      });
    }
  });

export const objectionSchema = z
  .object({
    grupo: z.enum(OBJECTION_GROUP_IDS),
    objecao_provavel: clampedString(ARSENAL_LIMITS.objecoes.objecaoProvavel),
    contorno: clampedString(ARSENAL_LIMITS.objecoes.contorno),
    apoio: clampedString(ARSENAL_LIMITS.objecoes.apoio),
  })
  .strict();

export const spinQuestionSchema = z
  .object({
    texto: clampedString(ARSENAL_LIMITS.perguntas.texto),
    formato: z.enum(QUESTION_FORMATS),
    spin: z.enum(SPIN_STAGES),
    objetivo: clampedString(ARSENAL_LIMITS.perguntas.objetivo),
  })
  .strict();

const objectionsSchema = z
  .array(objectionSchema)
  .min(ARSENAL_LIMITS.objecoes.min)
  .max(ARSENAL_LIMITS.objecoes.max)
  .superRefine((items, ctx) => {
    const seen = new Set<string>();
    items.forEach((item, index) => {
      if (seen.has(item.grupo)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `grupo repetido: ${item.grupo}`,
          path: [index, "grupo"],
        });
      }
      seen.add(item.grupo);
    });
  });

const questionsSchema = z
  .array(spinQuestionSchema)
  .length(ARSENAL_LIMITS.perguntas.total)
  .superRefine((items, ctx) => {
    const count = (predicate: (item: (typeof items)[number]) => boolean) =>
      items.filter(predicate).length;
    const abertas = count((item) => item.formato === "aberta");
    const fechadas = count((item) => item.formato === "fechada");
    const situacao = count((item) => item.spin === "situacao");
    const problema = count((item) => item.spin === "problema");
    const implicacao = count((item) => item.spin === "implicacao");
    const necessidade = count((item) => item.spin === "necessidade");

    if (abertas < ARSENAL_LIMITS.perguntas.minAbertas) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `mínimo de ${ARSENAL_LIMITS.perguntas.minAbertas} perguntas abertas (recebido ${abertas})`,
      });
    }
    if (fechadas < ARSENAL_LIMITS.perguntas.minFechadas) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `mínimo de ${ARSENAL_LIMITS.perguntas.minFechadas} perguntas fechadas (recebido ${fechadas})`,
      });
    }
    if (situacao > ARSENAL_LIMITS.perguntas.maxSituacao) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `no máximo ${ARSENAL_LIMITS.perguntas.maxSituacao} pergunta de 'situacao' (recebido ${situacao})`,
      });
    }
    if (problema < ARSENAL_LIMITS.perguntas.minProblema) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `mínimo de ${ARSENAL_LIMITS.perguntas.minProblema} perguntas de 'problema' (recebido ${problema})`,
      });
    }
    if (implicacao < ARSENAL_LIMITS.perguntas.minImplicacao) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `mínimo de ${ARSENAL_LIMITS.perguntas.minImplicacao} perguntas de 'implicacao' (recebido ${implicacao})`,
      });
    }
    if (necessidade < ARSENAL_LIMITS.perguntas.minNecessidade) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `mínimo de ${ARSENAL_LIMITS.perguntas.minNecessidade} perguntas de 'necessidade' (recebido ${necessidade})`,
      });
    }
  });

export const commercialArsenalSchema = z
  .object({
    pontos_chave: z
      .array(keyPointSchema)
      .min(ARSENAL_LIMITS.pontosChave.min)
      .max(ARSENAL_LIMITS.pontosChave.max),
    servico_recomendado: recommendedServiceSchema,
    objecoes: objectionsSchema,
    perguntas: questionsSchema,
  })
  .strict();

export type CommercialArsenal = z.infer<typeof commercialArsenalSchema>;
