"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { Toolbar, SiteFooter, Icon } from "@/app/components/PageShell";
import type { MarketAnalysis, InsightsBrief } from "@/lib/agents/types";
import type { PortalDTO } from "@/lib/dto/portal";
import { AnalysisPlaceholder } from "./AnalysisPlaceholder";
import { AnswersTable } from "./AnswersTable";
import { CompetitorsGrid } from "./CompetitorsGrid";
import { InsightsBoard } from "./InsightsBoard";
import { MaturityBars } from "./MaturityBars";
import { RadarSpider } from "./RadarSpider";
import { SourcesList } from "./SourcesList";
import { StageHero } from "./StageHero";

export interface DiagnosticPortalData
  extends Omit<PortalDTO, "analysis" | "insights"> {
  analysis?: MarketAnalysis;
  insights?: InsightsBrief;
}

type PortalMode = "public" | "manager";

interface DiagnosticPortalProps {
  data: DiagnosticPortalData | null;
  mode: PortalMode;
  loading?: boolean;
  empty?: ReactNode;
  actions?: ReactNode;
  onReprocess?: () => void;
}

function formatLocation(lead: DiagnosticPortalData["lead"]): string | null {
  const city = lead.city?.trim();
  const state = lead.state?.trim();
  if (!city || !state) return null;
  return `${city}/${state}`;
}

function placeholderStatus(status: DiagnosticPortalData["analysisStatus"]) {
  if (status === "falha") return "falha";
  if (status === "processando") return "processando";
  return "pendente";
}

export function PortalSkeleton() {
  return (
    <div className="space-y-6" aria-hidden>
      <div className="skeleton h-60 rounded-2xl" />
      <div className="grid gap-6 md:grid-cols-2">
        <div className="skeleton h-80 rounded-2xl" />
        <div className="skeleton h-80 rounded-2xl" />
      </div>
      <div className="skeleton h-96 rounded-2xl" />
    </div>
  );
}

export function PortalErrorState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="rd-card flex flex-col items-center justify-center p-16 text-center">
      <h2 className="rd-h text-xl">
        {title}
      </h2>
      <p className="mt-2 max-w-md text-sm leading-relaxed text-[#6e6e73]">
        {description}
      </p>
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

export function DiagnosticPortal({
  data,
  mode,
  loading = false,
  empty = null,
  actions,
  onReprocess,
}: DiagnosticPortalProps) {
  const [highlightIds, setHighlightIds] = useState<string[] | null>(null);
  const isManager = mode === "manager";
  const location = data ? formatLocation(data.lead) : null;

  return (
    <>
      <a
        href="#portal-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[60] focus:rounded-full focus:bg-rhema-primary focus:px-4 focus:py-2 focus:text-sm focus:text-white"
      >
        Pular para o conteúdo
      </a>

      <Toolbar>
        {isManager && data && (
          <span className="hidden text-right text-xs text-[#707077] md:block">
            {data.lead.name}
          </span>
        )}
        {isManager && (
          <Link href="/admin" className="rd-link flex items-center gap-2">
            <Icon name="arrowLeft" size={13} /> Voltar ao painel
          </Link>
        )}
      </Toolbar>

      <section className="rd-container pb-2 pt-14">
        <p className="rd-eyebrow flex items-center gap-3">
          <span className="h-0.5 w-4 bg-[#4a2c7d]" />
          Diagnóstico de maturidade de dados
        </p>
        <h1 className="rd-h mt-4 text-4xl leading-tight md:text-[52px]">
          {data ? data.lead.company : "Resultado do diagnóstico"}
        </h1>
        {data && (
          <p className="mt-3 text-sm text-[#6e6e73]">
            {`${data.lead.name} · ${data.dimensions.length} dimensões avaliadas${
              location ? ` · ${location}` : ""
            }`}
          </p>
        )}
      </section>

      <div id="portal-content" className="rd-container w-full flex-1 pb-8 pt-8">
        {actions && data && !loading && (
          <div className="mb-6 flex flex-wrap items-center justify-end gap-3">
            {actions}
          </div>
        )}

        {loading && <PortalSkeleton />}

        {!loading && !data && empty}

        {!loading && data && (
          <div className="space-y-10">
            <div className="rd-card grid grid-cols-2 lg:grid-cols-4">
              {[
                ["Dimensões em risco", `${data.dimensions.filter((d) => d.nivel <= 2).length} de ${data.dimensions.length}`, "Com nível 2 ou inferior"],
                ["Maior lacuna", data.risk.name, `Nível ${data.risk.nivel} de 5`],
                ["Dimensões avançadas", `${data.dimensions.filter((d) => d.nivel >= 3).length} de ${data.dimensions.length}`, "Com nível 3 ou superior"],
                ["Desequilíbrio", data.imbalance ? "Sim" : "Não", "Distância entre maior e menor nível"],
              ].map(([label, value, hint]) => (
                <div key={label} className="border-[#1d1d1f12] p-5 [&:not(:first-child)]:border-l">
                  <p className="rd-eyebrow">{label}</p>
                  <p className="rd-h mt-2 text-lg">{value}</p>
                  <p className="mt-0.5 text-[11px] text-[#707077]">{hint}</p>
                </div>
              ))}
            </div>

            <StageHero
              stage={data.stage}
              score={{ valor: data.score.valor, faixa: data.score.faixa }}
            />

            <div className="grid items-stretch gap-6 md:grid-cols-2">
              <div className="flex h-full flex-col rd-card p-6">
                <h2 className="mb-4 rd-h text-base">
                  Radar de maturidade
                </h2>
                <div className="flex flex-1 items-center justify-center overflow-x-auto">
                  <RadarSpider dimensions={data.dimensions} />
                </div>
              </div>

              <div className="flex h-full flex-col rd-card p-6">
                <div className="mb-2 flex items-center justify-between">
                  <h2 className="rd-h text-base">
                    Barras de maturidade
                  </h2>
                  {isManager && highlightIds && highlightIds.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setHighlightIds(null)}
                      className="rounded-full bg-[#f1edf8] px-3 py-1 text-xs font-medium text-[#4a2c7d]"
                    >
                      Limpar filtro
                    </button>
                  )}
                </div>
                <MaturityBars
                  dimensions={data.dimensions}
                  riskId={data.risk.id}
                  highlightIds={highlightIds ?? undefined}
                />
              </div>
            </div>

            <AnswersTable dimensions={data.dimensions} />

            {data.analysisStatus === "analisado" ? (
              <>
                <section aria-label="Concorrentes">
                  <h2 className="rd-h mb-4 text-xl">
                    Concorrentes
                  </h2>
                  <CompetitorsGrid
                    competitors={data.analysis?.contexto_concorrentes ?? []}
                  />
                </section>
                <section aria-label="Insights">
                  <h2 className="rd-h mb-4 text-xl">
                    Insights
                  </h2>
                  <InsightsBoard
                    insights={data.insights ?? { bullets: [] }}
                    onDimensaoFilter={
                      isManager ? (ids) => setHighlightIds(ids) : undefined
                    }
                  />
                </section>
                <section aria-label="Fontes">
                  <h2 className="rd-h mb-4 text-xl">
                    Fontes
                  </h2>
                  <SourcesList sources={data.sources} />
                </section>
              </>
            ) : (
              <section aria-label="Análise de mercado">
                <h2 className="rd-h mb-4 text-xl">
                  Análise de mercado
                </h2>
                <AnalysisPlaceholder
                  status={placeholderStatus(data.analysisStatus)}
                  onReprocess={onReprocess}
                />
              </section>
            )}
          </div>
        )}
      </div>

      <SiteFooter />
    </>
  );
}
