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
    return { opacity, transition: "opacity 300ms ease" };
  }

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-poppins text-sm font-semibold uppercase tracking-wide text-rhema-dark/60">
          Nível por dimensão
        </h3>
        <span className="flex items-center gap-1.5 font-inter text-xs text-rhema-dark/60">
          <span
            aria-hidden
            className="inline-block h-2.5 w-2.5 rounded-sm"
            style={{ backgroundColor: RISK_COLOR }}
          />
          Risco principal
        </span>
      </div>
      <div className="relative flex h-56 items-end gap-2 md:gap-3">
        <div aria-hidden className="pointer-events-none absolute inset-0 flex flex-col justify-between">
          {[5, 4, 3, 2, 1].map((lvl) => (
            <div key={lvl} className="flex items-center gap-1 border-t border-dashed border-rhema-lavender-light">
              <span className="font-mono text-[10px] text-rhema-dark/30">{lvl}</span>
            </div>
          ))}
        </div>
        {dimensions.map((dim, idx) => {
          const isRisk = dim.id === riskId;
          const clamped = Math.min(5, Math.max(1, dim.nivel));
          const height = `${(clamped / 5) * 100}%`;
          return (
            <div
              key={dim.id}
              data-testid={`maturity-bar-${idx}`}
              className={`relative flex h-full flex-1 flex-col ${isRisk ? "is-risk" : ""}`}
              style={barStyle(dim.id)}
            >
              {isRisk && (
                <span className="mb-1 self-center rounded-full bg-red-50 px-2 py-0.5 font-inter text-[10px] font-medium text-red-700">
                  Risco
                </span>
              )}
              <div className="flex h-full flex-1 items-end">
                <div
                  data-testid={`maturity-fill-${idx}`}
                  aria-label={`${dim.name} — nível ${clamped}`}
                  aria-valuenow={clamped}
                  aria-valuemin={1}
                  aria-valuemax={5}
                  role="meter"
                  title={`${dim.name} — nível ${clamped}`}
                  className="w-full rounded-t-lg border-t-4 transition-all duration-500"
                  style={{
                    height,
                    backgroundColor: isRisk ? RISK_COLOR : BAR_COLOR,
                    borderTopColor: isRisk ? "#E74C3C" : "#7C5CBF",
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-2 flex gap-2 md:gap-3">
        {dimensions.map((dim) => (
          <span
            key={dim.id}
            className="flex-1 truncate text-center font-inter text-[10px] leading-tight text-rhema-dark/60"
          >
            {dim.name}
          </span>
        ))}
      </div>
    </div>
  );
}
