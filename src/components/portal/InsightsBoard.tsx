"use client";

import type { MouseEvent } from "react";

interface InsightCard {
  texto: string;
  prioridade: "alta" | "media" | "baixa";
  titulo?: string;
  dimensao_ids?: string[];
  proximo_passo?: string;
}

interface InsightsBoardProps {
  insights: { bullets: InsightCard[] };
  onDimensaoFilter?: (ids: string[]) => void;
}

const PRIORITY_CONFIG: Record<
  InsightCard["prioridade"],
  { color: string; label: string; heading: string }
> = {
  alta: { color: "#C0392B", label: "Prioridade alta", heading: "Prioridade alta" },
  media: { color: "#F1C40F", label: "Prioridade média", heading: "Prioridade média" },
  baixa: { color: "#2980B9", label: "Prioridade baixa", heading: "Prioridade baixa" },
};

const PRIORITY_ORDER: InsightCard["prioridade"][] = ["alta", "media", "baixa"];

function fallbackTitle(texto: string): string {
  const short = texto.trim().slice(0, 60);
  return texto.trim().length > 60 ? `${short}…` : short;
}

export function InsightsBoard({ insights, onDimensaoFilter }: InsightsBoardProps) {
  const grouped = PRIORITY_ORDER.map((priority) => ({
    priority,
    items: insights.bullets.filter((b) => b.prioridade === priority),
  })).filter((group) => group.items.length > 0);

  function handleClick(bullet: InsightCard, event: MouseEvent) {
    if (!onDimensaoFilter) return;
    const target = event.target as HTMLElement;
    const anchor = target.closest("a");
    if (anchor) return;
    const ids = bullet.dimensao_ids;
    if (ids && ids.length > 0) onDimensaoFilter(ids);
  }

  if (insights.bullets.length === 0) {
    return (
      <p className="rounded-2xl border border-rhema-lavender-light bg-white px-6 py-8 text-center font-inter text-sm text-rhema-dark/50 shadow-[0_8px_32px_rgba(59,35,102,0.12)]">
        Sem insights de análise para exibir.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      {grouped.map(({ priority, items }) => (
        <div key={priority}>
          <p
            className="mb-2 flex items-center gap-2 font-poppins text-xs font-semibold uppercase tracking-wide"
            style={{ color: PRIORITY_CONFIG[priority].color }}
          >
            <span
              aria-hidden
              className="inline-block h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: PRIORITY_CONFIG[priority].color }}
            />
            {PRIORITY_CONFIG[priority].heading}
          </p>
          <div className="grid gap-4 md:grid-cols-2">
            {items.map((bullet, idx) => {
              const hasFilter =
                Boolean(onDimensaoFilter) &&
                Array.isArray(bullet.dimensao_ids) &&
                bullet.dimensao_ids.length > 0;
              return (
                <article
                  key={`${priority}-${idx}`}
                  data-dimensao-filter={hasFilter ? "true" : undefined}
                  onClick={(event) => handleClick(bullet, event)}
                  className={`rounded-2xl border border-rhema-lavender-light bg-white shadow-[0_8px_32px_rgba(59,35,102,0.12)] ${
                    hasFilter ? "cursor-pointer transition-transform duration-300 hover:-translate-y-0.5" : ""
                  }`}
                  style={{ borderLeft: `4px solid ${PRIORITY_CONFIG[priority].color}` }}
                >
                  <h3 className="font-poppins text-sm font-semibold text-rhema-institutional">
                    {bullet.titulo ?? (bullet.dimensao_ids ? fallbackTitle(bullet.texto) : "—")}
                  </h3>
                  <p className="mt-2 font-inter text-sm leading-relaxed text-rhema-dark/70">
                    {bullet.texto}
                  </p>
                  {bullet.proximo_passo && (
                    <p className="mt-3 font-inter text-sm leading-relaxed text-rhema-dark/70">
                      <span className="font-medium text-rhema-primary">Próximo passo: </span>
                      {bullet.proximo_passo}
                    </p>
                  )}
                </article>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
