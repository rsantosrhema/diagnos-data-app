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
  { color: string; soft: string; label: string; heading: string }
> = {
  alta: {
    color: "#C0392B",
    soft: "rgba(192,57,43,0.08)",
    label: "Prioridade alta",
    heading: "Prioridade alta",
  },
  media: {
    color: "#B7791F",
    soft: "rgba(183,121,31,0.10)",
    label: "Prioridade média",
    heading: "Prioridade média",
  },
  baixa: {
    color: "#2980B9",
    soft: "rgba(41,128,185,0.10)",
    label: "Prioridade baixa",
    heading: "Prioridade baixa",
  },
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
    <div className="space-y-8">
      {grouped.map(({ priority, items }) => (
        <div key={priority}>
          <p
            className="mb-3 flex items-center gap-2 font-poppins text-xs font-semibold uppercase tracking-wide"
            style={{ color: PRIORITY_CONFIG[priority].color }}
          >
            <span
              aria-hidden
              className="inline-block h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: PRIORITY_CONFIG[priority].color }}
            />
            {PRIORITY_CONFIG[priority].heading}
          </p>
          <div className="grid items-stretch gap-4 md:grid-cols-2">
            {items.map((bullet, idx) => {
              const config = PRIORITY_CONFIG[priority];
              const hasFilter =
                Boolean(onDimensaoFilter) &&
                Array.isArray(bullet.dimensao_ids) &&
                bullet.dimensao_ids.length > 0;
              return (
                <article
                  key={`${priority}-${idx}`}
                  data-dimensao-filter={hasFilter ? "true" : undefined}
                  onClick={(event) => handleClick(bullet, event)}
                  className={`flex h-full flex-col overflow-hidden rounded-2xl border border-rhema-lavender-light bg-white shadow-[0_8px_32px_rgba(59,35,102,0.10)] ${
                    hasFilter
                      ? "cursor-pointer transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:-translate-y-1 hover:shadow-[0_18px_48px_rgba(59,35,102,0.14)]"
                      : ""
                  }`}
                  style={{ borderLeft: `4px solid ${config.color}` }}
                >
                  <div className="flex flex-1 flex-col gap-3 p-5 md:p-6">
                    <div className="flex items-start gap-3">
                      <span
                        aria-hidden
                        className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl"
                        style={{ backgroundColor: config.soft, color: config.color }}
                      >
                        <svg
                          className="h-4 w-4"
                          viewBox="0 0 16 16"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.6"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M8 1.5 9.9 6l4.6.3-3.6 3 1.2 4.5L8 11.3 3.9 13.8 5.1 9.3 1.5 6.3 6.1 6z" />
                        </svg>
                      </span>
                      <h3 className="font-poppins text-base font-semibold leading-snug text-rhema-institutional">
                        {bullet.titulo ??
                          (bullet.dimensao_ids
                            ? fallbackTitle(bullet.texto)
                            : "—")}
                      </h3>
                    </div>

                    <p className="font-inter text-sm leading-relaxed text-rhema-dark/70">
                      {bullet.texto}
                    </p>
                  </div>

                  {bullet.proximo_passo && (
                    <div
                      className="mx-5 mb-5 rounded-xl border border-rhema-lavender-light px-4 py-3 md:mx-6 md:mb-6"
                      style={{ backgroundColor: config.soft }}
                    >
                      <p className="font-inter text-sm leading-relaxed text-rhema-dark/80">
                        <span className="font-semibold text-rhema-primary">
                          Próximo passo:{" "}
                        </span>
                        {bullet.proximo_passo}
                      </p>
                    </div>
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
