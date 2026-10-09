"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { RhemaLogo } from "../../components/RhemaLogo";
import { WaveDivider } from "../../components/WaveDivider";
import { StageHero } from "@/components/portal/StageHero";
import { RadarSpider } from "@/components/portal/RadarSpider";
import { MaturityBars } from "@/components/portal/MaturityBars";
import { AnswersTable } from "@/components/portal/AnswersTable";
import { CompetitorsGrid } from "@/components/portal/CompetitorsGrid";
import { InsightsBoard } from "@/components/portal/InsightsBoard";
import { SourcesList } from "@/components/portal/SourcesList";
import { AnalysisPlaceholder } from "@/components/portal/AnalysisPlaceholder";
import { getPublicPortal, type PublicPortalResponse } from "@/lib/api/client";
import type { MarketAnalysis, InsightsBrief } from "@/lib/agents/types";

function PublicSkeleton() {
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

function InvalidState() {
  return (
    <div className="card flex flex-col items-center justify-center p-16 text-center">
      <h2 className="font-poppins text-xl font-semibold text-rhema-institutional">
        Link inválido ou expirado
      </h2>
      <p className="mt-2 max-w-md font-inter text-sm leading-relaxed text-rhema-dark/60">
        Este link de diagnóstico não está mais disponível. Solicite um novo
        link ao consultor responsável.
      </p>
      <a href="/" className="btn-primary mt-6">
        Voltar ao início
      </a>
    </div>
  );
}

export default function PublicPortalPage() {
  const params = useParams<{ token: string }>();
  const token = params?.token ?? "";

  const [data, setData] = useState<PublicPortalResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [invalid, setInvalid] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!token) {
        setInvalid(true);
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const result = await getPublicPortal(token);
        if (!cancelled) {
          setData(result);
          setInvalid(false);
        }
      } catch {
        if (!cancelled) {
          setData(null);
          setInvalid(true);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const analysis = data?.analysis as MarketAnalysis | undefined;
  const insights = data?.insights as InsightsBrief | undefined;
  const showAnalysis = data !== null && data.analysisStatus === "analisado";

  return (
    <main className="flex min-h-screen flex-col bg-rhema-offwhite">
      <header className="bg-rhema-institutional">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <a href="/">
            <RhemaLogo variant="dark" width={140} />
          </a>
        </div>
      </header>

      <section className="bg-rhema-institutional relative overflow-hidden">
        <div className="mx-auto max-w-7xl px-6 pb-16 pt-12 md:pb-20 md:pt-16">
          <p className="mb-3 font-poppins text-sm font-medium uppercase tracking-wide text-rhema-lavender">
            Diagnos Data · Diagnóstico de maturidade de dados
          </p>
          {data ? (
            <h1 className="font-poppins text-3xl font-bold text-white md:text-4xl">
              Resultado de {data.lead.name} · {data.lead.company}
            </h1>
          ) : (
            <h1 className="font-poppins text-3xl font-bold text-white md:text-4xl">
              Resultado do diagnóstico
            </h1>
          )}
        </div>
        <WaveDivider color="var(--color-rhema-offwhite)" />
      </section>

      <div className="-mt-1 mx-auto w-full max-w-7xl flex-1 px-6 pb-24 pt-10">
        {loading && <PublicSkeleton />}
        {!loading && (invalid || !data) && <InvalidState />}
        {!loading && !invalid && data && (
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
                <h2 className="mb-3 font-poppins text-lg font-semibold text-rhema-institutional">
                  Barras de maturidade
                </h2>
                <MaturityBars dimensions={data.dimensions} riskId={data.risk.id} />
              </div>
            </div>

            <AnswersTable dimensions={data.dimensions} />

            {showAnalysis ? (
              <>
                <section aria-label="Concorrentes">
                  <h2 className="mb-4 font-poppins text-xl font-semibold text-rhema-institutional">
                    Concorrentes
                  </h2>
                  <CompetitorsGrid competitors={analysis?.contexto_concorrentes ?? []} />
                </section>
                <section aria-label="Insights">
                  <h2 className="mb-4 font-poppins text-xl font-semibold text-rhema-institutional">
                    Insights
                  </h2>
                  <InsightsBoard insights={insights ?? { bullets: [] }} />
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
                  status={
                    data.analysisStatus === "analisado"
                      ? "processando"
                      : data.analysisStatus
                  }
                />
              </section>
            )}
          </div>
        )}
      </div>

      <footer className="bg-rhema-institutional">
        <WaveDivider flip color="var(--color-rhema-institutional)" className="-mb-1" />
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 py-10 md:flex-row">
          <RhemaLogo variant="dark" width={120} />
          <p className="font-inter text-xs text-white/50">
            © {new Date().getFullYear()} Rhema Data. Todos os direitos reservados.
          </p>
        </div>
      </footer>
    </main>
  );
}
