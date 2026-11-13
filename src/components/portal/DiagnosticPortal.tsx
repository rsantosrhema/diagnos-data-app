"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { RhemaLogo } from "@/app/components/RhemaLogo";
import { WaveDivider } from "@/app/components/WaveDivider";
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
    <div className="card flex flex-col items-center justify-center p-16 text-center">
      <h2 className="font-poppins text-xl font-semibold text-rhema-institutional">
        {title}
      </h2>
      <p className="mt-2 max-w-md font-inter text-sm leading-relaxed text-rhema-dark/60">
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
  const title = data
    ? `Resultado de ${data.lead.name} · ${data.lead.company}`
    : "Resultado do diagnóstico";

  return (
    <>
      <a
        href="#portal-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[60] focus:rounded-full focus:bg-rhema-primary focus:px-4 focus:py-2 focus:text-sm focus:text-white"
      >
        Pular para o conteúdo
      </a>

      <header className="bg-rhema-institutional">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link href={isManager ? "/admin" : "/"} aria-label="Rhema Data">
            <RhemaLogo variant="dark" width={140} />
          </Link>
          {isManager && data && (
            <div className="flex items-center gap-4">
              <div className="hidden text-right md:block">
                <p className="font-poppins text-sm font-medium text-white">
                  {data.lead.name}
                </p>
                <p className="font-inter text-xs text-rhema-lavender/80">
                  {data.lead.company}
                </p>
              </div>
              <Link
                href="/admin"
                className="font-poppins text-sm font-medium text-white/70 transition-colors hover:text-white"
              >
                Voltar ao painel
              </Link>
            </div>
          )}
        </div>
      </header>

      <section className="relative overflow-hidden bg-rhema-institutional">
        <div className="mx-auto max-w-7xl px-6 pb-16 pt-12 md:pb-20 md:pt-16">
          <p className="mb-3 font-poppins text-sm font-medium uppercase tracking-wide text-rhema-lavender">
            Diagnos Data · Diagnóstico de maturidade de dados
          </p>
          <h1 className="font-poppins text-3xl font-bold text-white md:text-4xl">
            {title}
          </h1>
        </div>
        <WaveDivider color="var(--color-rhema-offwhite)" />
      </section>

      <div
        id="portal-content"
        className="-mt-1 mx-auto w-full max-w-7xl flex-1 px-6 pb-24 pt-10"
      >
        {actions && data && !loading && (
          <div className="mb-6 flex flex-wrap items-center justify-end gap-3">
            {actions}
          </div>
        )}

        {loading && <PortalSkeleton />}

        {!loading && !data && empty}

        {!loading && data && (
          <div className="space-y-8">
            <StageHero
              stage={data.stage}
              score={{ valor: data.score.valor, faixa: data.score.faixa }}
            />

            <div className="grid items-stretch gap-6 md:grid-cols-2">
              <div className="flex h-full flex-col rounded-2xl border border-rhema-lavender-light bg-white p-6 shadow-[0_8px_32px_rgba(59,35,102,0.12)]">
                <h2 className="mb-4 font-poppins text-lg font-semibold text-rhema-institutional">
                  Radar de maturidade
                </h2>
                <div className="flex flex-1 items-center justify-center overflow-x-auto">
                  <RadarSpider dimensions={data.dimensions} />
                </div>
              </div>

              <div className="flex h-full flex-col rounded-2xl border border-rhema-lavender-light bg-white p-6 shadow-[0_8px_32px_rgba(59,35,102,0.12)]">
                <div className="mb-2 flex items-center justify-between">
                  <h2 className="font-poppins text-lg font-semibold text-rhema-institutional">
                    Barras de maturidade
                  </h2>
                  {isManager && highlightIds && highlightIds.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setHighlightIds(null)}
                      className="rounded-full bg-rhema-lavender-light px-3 py-1 font-inter text-xs font-medium text-rhema-primary transition-colors hover:bg-rhema-lavender-light/60"
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
                  <h2 className="mb-4 font-poppins text-xl font-semibold text-rhema-institutional">
                    Concorrentes
                  </h2>
                  <CompetitorsGrid
                    competitors={data.analysis?.contexto_concorrentes ?? []}
                  />
                </section>
                <section aria-label="Insights">
                  <h2 className="mb-4 font-poppins text-xl font-semibold text-rhema-institutional">
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
                  <h2 className="mb-4 font-poppins text-xl font-semibold text-rhema-institutional">
                    Fontes
                  </h2>
                  <SourcesList sources={data.sources} />
                </section>
              </>
            ) : (
              <section aria-label="Análise de mercado">
                <h2 className="mb-4 font-poppins text-xl font-semibold text-rhema-institutional">
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

      <footer className="bg-rhema-institutional">
        <WaveDivider
          flip
          color="var(--color-rhema-institutional)"
          className="-mb-1"
        />
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 py-10 md:flex-row">
          <RhemaLogo variant="dark" width={120} />
          <p className="font-inter text-xs text-white/50">
            © {new Date().getFullYear()} Rhema Data. Todos os direitos
            reservados.
          </p>
        </div>
      </footer>
    </>
  );
}
