export type InsightPriority = "alta" | "media" | "baixa";

export const PRIORITY_LIMITS: Record<InsightPriority, number> = {
  alta: 3,
  media: 5,
  baixa: 5,
};

export function normalizeInsights<T extends { prioridade: InsightPriority }>(
  bullets: T[],
): T[] {
  const alta = bullets.filter((b) => b.prioridade === "alta");
  const media = bullets.filter((b) => b.prioridade === "media");
  const baixa = bullets.filter((b) => b.prioridade !== "alta" && b.prioridade !== "media");

  const keptAlta = alta.slice(0, PRIORITY_LIMITS.alta);
  const demotedToMedia = alta
    .slice(PRIORITY_LIMITS.alta)
    .map((b) => ({ ...b, prioridade: "media" as const }));

  const allMedia = [...media, ...demotedToMedia];
  const keptMedia = allMedia.slice(0, PRIORITY_LIMITS.media);
  const demotedToBaixa = allMedia
    .slice(PRIORITY_LIMITS.media)
    .map((b) => ({ ...b, prioridade: "baixa" as const }));

  const keptBaixa = [...baixa, ...demotedToBaixa].slice(0, PRIORITY_LIMITS.baixa);

  return [...keptAlta, ...keptMedia, ...keptBaixa];
}
