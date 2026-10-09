import type { CSSProperties } from "react";

export interface MaturityBarDimension {
  id: string;
  name: string;
  nivel: number;
}

interface MaturityBarsProps {
  dimensions: MaturityBarDimension[];
  riskId: string;
  highlightIds?: string[];
}

const RISK_COLOR = "#C0392B";
const BAR_COLOR = "#4A2C7D";

export function MaturityBars({ dimensions, riskId, highlightIds }: MaturityBarsProps) {
  const highlightedSet = new Set(highlightIds ?? []);

  function barStyle(id: string): CSSProperties {
    const opacity =
      highlightIds && highlightIds.length > 0
        ? highlightedSet.has(id)
          ? 1
          : 0.35
        : 1;
    return {
      opacity,
      transition: "opacity 400ms cubic-bezier(0.32,0.72,0,1)",
    };
  }

  return (
    <div className="flex h-full flex-col">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-poppins text-sm font-semibold uppercase tracking-wide text-rhema-dark/60">
          Nível por dimensão
        </h3>
        <span className="flex items-center gap-1.5 font-inter text-xs text-rhema-dark/60">
          <span
            aria-hidden
            className="inline-block h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: RISK_COLOR }}
          />
          Risco principal
        </span>
      </div>

      <div className="relative flex-1">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 flex flex-col justify-between"
        >
          {[5, 4, 3, 2, 1].map((lvl) => (
            <div key={lvl} className="flex items-center gap-1.5">
              <span className="w-3 text-right font-mono text-[10px] tabular-nums text-rhema-dark/30">
                {lvl}
              </span>
              <span className="h-px flex-1 bg-rhema-lavender-light" />
            </div>
          ))}
        </div>

        <div className="flex h-full min-h-[200px] items-end gap-1.5 pl-5 md:gap-2">
          {dimensions.map((dim, idx) => {
            const isRisk = dim.id === riskId;
            const clamped = Math.min(5, Math.max(1, dim.nivel));
            const height = `${(clamped / 5) * 100}%`;
            const color = isRisk ? RISK_COLOR : BAR_COLOR;
            return (
              <div
                key={dim.id}
                data-testid={`maturity-bar-${idx}`}
                className={`group relative flex h-full flex-1 flex-col items-center justify-end ${
                  isRisk ? "is-risk" : ""
                }`}
                style={barStyle(dim.id)}
              >
                {isRisk && (
                  <span className="mb-1 rounded-full bg-red-50 px-2 py-0.5 font-inter text-[10px] font-medium text-red-700">
                    Risco
                  </span>
                )}
                <span
                  className="mb-1 font-mono text-[11px] font-semibold tabular-nums"
                  style={{ color }}
                >
                  {clamped}
                </span>
                <div className="flex w-full flex-1 items-end">
                  <div
                    data-testid={`maturity-fill-${idx}`}
                    aria-label={`${dim.name} — nível ${clamped}`}
                    aria-valuenow={clamped}
                    aria-valuemin={1}
                    aria-valuemax={5}
                    role="meter"
                    title={`${dim.name} — nível ${clamped}`}
                    className="w-full rounded-t-md transition-[height] duration-700 ease-[cubic-bezier(0.32,0.72,0,1)]"
                    style={{ height, backgroundColor: color }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <ul className="mt-5 grid grid-cols-1 gap-x-6 gap-y-1.5 sm:grid-cols-2">
        {dimensions.map((dim, i) => {
          const clamped = Math.min(5, Math.max(1, dim.nivel));
          const isRisk = dim.id === riskId;
          return (
            <li key={dim.id} className="flex items-center gap-2">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-rhema-lavender-light font-mono text-[10px] font-semibold text-rhema-primary">
                {i + 1}
              </span>
              <span
                className="truncate font-inter text-xs text-rhema-dark/70"
                title={dim.name}
              >
                {dim.name}
              </span>
              <span
                className="ml-auto shrink-0 font-mono text-[11px] font-semibold tabular-nums"
                style={{ color: isRisk ? RISK_COLOR : BAR_COLOR }}
              >
                {clamped}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
