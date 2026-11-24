import { SCREENER_CONTRACT, getDimensionById } from "@/lib/screener/contract";
import { SCORING_CALIBRATION } from "@/lib/screener/scoring-calibration";

export const INDEX_LABEL = "Índice de Maturidade Rhema · base DAMA-DMBOK2";

export const SCALE_LEGEND = `Escala de níveis (DAMA-DMBOK2): ${SCREENER_CONTRACT.meta.escala_niveis
  .map((nivel) => `${nivel.nivel} ${nivel.rotulo}`)
  .join(" · ")}`;

export const METHOD_NOTE = SCREENER_CONTRACT.meta.referencia;

export function formatWeight(peso: number, pesoPadrao: number): string {
  return peso === pesoPadrao
    ? `${peso}% (padrão)`
    : `${peso}% (padrão ${pesoPadrao}%)`;
}

export function formatScore(valor: number): string {
  return `${valor.toFixed(1).replace(".", ",")} de 5`;
}

export function getBaseWeight(id: string): number | null {
  return SCORING_CALIBRATION.dimensions[id]?.base_weight ?? null;
}

export function getAreaDmbok(id: string): string | null {
  return getDimensionById(id)?.area_dmbok ?? null;
}

export function describeDimension(
  id: string,
  peso: number,
): { pesoPadrao: number; areaDmbok: string } {
  return {
    pesoPadrao: getBaseWeight(id) ?? peso,
    areaDmbok: getAreaDmbok(id) ?? "",
  };
}
