import { z } from "zod";
import { DIMENSION_IDS } from "@/lib/screener/contract";
import servicosJson from "../../../docs/comercial/servicos.json";
import objecoesJson from "../../../docs/comercial/objecoes.json";

const catalogStatusSchema = z.enum(["rascunho", "aprovado"]);

const catalogIdSchema = z.string().regex(/^[a-z0-9-]+$/);

const dimensionIdSchema = z
  .string()
  .refine((value) => DIMENSION_IDS.includes(value), (value) => ({
    message: `dimensão desconhecida: ${value}`,
  }));

const serviceItemSchema = z
  .object({
    id: catalogIdSchema,
    nome: z.string().min(1),
    resumo: z.string().min(1),
    dimensoes: z.array(dimensionIdSchema).min(1),
    quando_indicar: z.string().min(1),
  })
  .strict();

const objectionGroupItemSchema = z
  .object({
    id: catalogIdSchema,
    nome: z.string().min(1),
    descricao: z.string().min(1),
  })
  .strict();

function rejectDuplicateIds(
  items: { id: string }[],
  ctx: z.RefinementCtx,
  field: string,
) {
  const seen = new Set<string>();
  items.forEach((item, index) => {
    if (seen.has(item.id)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `id duplicado: ${item.id}`,
        path: [field, index, "id"],
      });
    }
    seen.add(item.id);
  });
}

export const serviceCatalogSchema = z
  .object({
    versao: z.string().min(1),
    status: catalogStatusSchema,
    servicos: z.array(serviceItemSchema),
  })
  .strict()
  .superRefine((catalog, ctx) => rejectDuplicateIds(catalog.servicos, ctx, "servicos"));

export const objectionCatalogSchema = z
  .object({
    versao: z.string().min(1),
    status: catalogStatusSchema,
    grupos: z.array(objectionGroupItemSchema),
  })
  .strict()
  .superRefine((catalog, ctx) => rejectDuplicateIds(catalog.grupos, ctx, "grupos"));

export type CommercialService = z.infer<typeof serviceItemSchema>;
export type ObjectionGroup = z.infer<typeof objectionGroupItemSchema>;
export type CatalogStatus = z.infer<typeof catalogStatusSchema>;

export function composeCatalogStatus(
  servicosStatus: CatalogStatus,
  objecoesStatus: CatalogStatus,
): CatalogStatus {
  return servicosStatus === "rascunho" || objecoesStatus === "rascunho"
    ? "rascunho"
    : "aprovado";
}

export interface CommercialCatalog {
  status: CatalogStatus;
  servicos: CommercialService[];
  grupos: ObjectionGroup[];
}

const services = serviceCatalogSchema.parse(servicosJson);
const objections = objectionCatalogSchema.parse(objecoesJson);

export const SERVICE_IDS = services.servicos.map((service) => service.id) as [
  string,
  ...string[],
];

export const OBJECTION_GROUP_IDS = objections.grupos.map((group) => group.id) as [
  string,
  ...string[],
];

export const COMMERCIAL_CATALOG: CommercialCatalog = {
  status: composeCatalogStatus(services.status, objections.status),
  servicos: services.servicos,
  grupos: objections.grupos,
};

export function getService(id: string): CommercialService | undefined {
  return COMMERCIAL_CATALOG.servicos.find((service) => service.id === id);
}

export function getObjectionGroup(id: string): ObjectionGroup | undefined {
  return COMMERCIAL_CATALOG.grupos.find((group) => group.id === id);
}
