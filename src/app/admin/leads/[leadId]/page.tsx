"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { RhemaLogo } from "../../../components/RhemaLogo";
import { WaveDivider } from "../../../components/WaveDivider";
import { Reveal } from "../../components";
import { StageHero } from "@/components/portal/StageHero";
import { RadarSpider } from "@/components/portal/RadarSpider";
import { MaturityBars } from "@/components/portal/MaturityBars";
import { AnswersAccordion } from "@/components/portal/AnswersAccordion";
import { CompetitorsGrid } from "@/components/portal/CompetitorsGrid";
import { InsightsBoard } from "@/components/portal/InsightsBoard";
import { SourcesList } from "@/components/portal/SourcesList";
import { AnalysisPlaceholder } from "@/components/portal/AnalysisPlaceholder";
import {
  getManagerPortal,
  createShareLink,
  revokeShareLink,
  generateReport,
  ApiError,
  type ManagerPortalResponse,
} from "@/lib/api/client";
import type { MarketAnalysis, InsightsBrief } from "@/lib/agents/types";

type PageError = "unauthorized" | "notfound" | "generic";

interface Toast {
  id: number;
  kind: "success" | "error";
  message: string;
}

let toastSeq = 0;

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function ToastStack({ toasts }: { toasts: Toast[] }) {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-4 z-[60] flex w-full max-w-sm flex-col gap-2 md:right-6">
      {toasts.map((t) => (
        <div
          key={t.id}
          role="status"
          aria-live="polite"
          className="animate-fade-in-up flex items-start gap-3 rounded-2xl border border-rhema-lavender-light bg-white px-4 py-3 shadow-[0_8px_32px_rgba(59,35,102,0.12)]"
        >
          <span
            className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
              t.kind === "success" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
            }`}
          >
            {t.kind === "success" ? (
              <svg className="h-3 w-3" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 8.5l3.5 3.5L13 4.5" />
              </svg>
            ) : (
              <svg className="h-3 w-3" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M8 4v5" />
                <circle cx="8" cy="12" r="0.5" fill="currentColor" />
              </svg>
            )}
          </span>
          <p className="font-inter text-sm leading-snug">{t.message}</p>
        </div>
      ))}
    </div>
  );
}

function PageSkeleton() {
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

function ErrorState({ error }: { error: PageError }) {
  if (error === "unauthorized") {
    return (
      <div className="card flex flex-col items-center justify-center p-16 text-center">
        <h2 className="font-poppins text-xl font-semibold text-rhema-institutional">
          Acesso não autorizado
        </h2>
        <p className="mt-2 max-w-md font-inter text-sm leading-relaxed text-rhema-dark/60">
          Faça login como gerente para ver o resultado deste diagnóstico.
        </p>
        <Link href="/admin" className="btn-primary mt-6">
          Voltar ao painel
        </Link>
      </div>
    );
  }
  return (
    <div className="card flex flex-col items-center justify-center p-16 text-center">
      <h2 className="font-poppins text-xl font-semibold text-rhema-institutional">
        {error === "notfound" ? "Diagnóstico não encontrado" : "Erro interno"}
      </h2>
      <p className="mt-2 max-w-md font-inter text-sm leading-relaxed text-rhema-dark/60">
        {error === "notfound"
          ? "Este lead ainda não concluiu o diagnóstico ou não existe."
          : "Não foi possível carregar o portal. Tente novamente."}
      </p>
      <Link href="/admin" className="btn-primary mt-6">
        Voltar ao painel
      </Link>
    </div>
  );
}

function mapError(err: unknown): PageError {
  if (err instanceof ApiError) {
    if (err.status === 401 || err.status === 403) return "unauthorized";
    if (err.status === 404) return "notfound";
  }
  return "generic";
}

export default function LeadPortalPage() {
  const params = useParams<{ leadId: string }>();
  const leadId = params?.leadId ?? "";

  const [data, setData] = useState<ManagerPortalResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState<PageError | null>(null);
  const [highlightIds, setHighlightIds] = useState<string[] | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [shareBusy, setShareBusy] = useState(false);
  const [reprocessBusy, setReprocessBusy] = useState(false);
  const [tick, setTick] = useState(0);
  const leadIdRef = useRef(leadId);
  leadIdRef.current = leadId;

  const pushToast = useCallback((kind: Toast["kind"], message: string) => {
    const id = ++toastSeq;
    setToasts((prev) => [...prev, { id, kind, message }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const load = useCallback(async () => {
    if (!leadIdRef.current) return;
    setLoading(true);
    try {
      const result = await getManagerPortal(leadIdRef.current);
      setData(result);
      setPageError(null);
    } catch (err) {
      setPageError(mapError(err));
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load, leadId]);

  const analysisStatus = data?.analysisStatus;

  useEffect(() => {
    if (analysisStatus !== "processando" && analysisStatus !== "pendente") return;
    const id = setInterval(() => setTick((t) => t + 1), 15000);
    return () => clearInterval(id);
  }, [analysisStatus]);

  useEffect(() => {
    if (tick > 0) load();
  }, [tick, load]);

  function handleDimensaoFilter(ids: string[]) {
    setHighlightIds(ids);
  }

  async function handleCopyLink() {
    if (!data) return;
    setShareBusy(true);
    try {
      const { url, expiresAt } = await createShareLink(leadId);
      const absolute = `${window.location.origin}${url}`;
      await navigator.clipboard.writeText(absolute);
      pushToast(
        "success",
        expiresAt
          ? `Link copiado: válido até ${formatDate(expiresAt)}`
          : "Link copiado",
      );
      await load();
    } catch (err) {
      pushToast(
        "error",
        err instanceof Error && err.message ? err.message : "Não foi possível gerar o link",
      );
    } finally {
      setShareBusy(false);
    }
  }

  async function handleRevoke() {
    setShareBusy(true);
    try {
      await revokeShareLink(leadId);
      pushToast("success", "Link revogado — o cliente perde o acesso");
      await load();
    } catch (err) {
      pushToast(
        "error",
        err instanceof Error && err.message ? err.message : "Não foi possível revogar o link",
      );
    } finally {
      setShareBusy(false);
    }
  }

  async function handleReprocess() {
    setReprocessBusy(true);
    try {
      await generateReport(leadId);
      pushToast("success", "Reprocessamento enfileirado — atualizando automaticamente");
      await load();
    } catch (err) {
      pushToast(
        "error",
        err instanceof Error && err.message ? err.message : "Não foi possível reprocessar",
      );
    } finally {
      setReprocessBusy(false);
    }
  }

  const analysis = data?.analysis as MarketAnalysis | undefined;
  const insights = data?.insights as InsightsBrief | undefined;
  const showAnalysis = data !== null && analysisStatus === "analisado";

  return (
    <main className="flex min-h-screen flex-col bg-rhema-offwhite">
      <a
        href="#portal-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[60] focus:rounded-full focus:bg-rhema-primary focus:px-4 focus:py-2 focus:text-sm focus:text-white"
      >
        Pular para o conteúdo
      </a>

      <header className="bg-rhema-institutional">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link href="/admin">
            <RhemaLogo variant="dark" width={140} />
          </Link>
          <div className="flex items-center gap-4">
            {data && (
              <div className="hidden text-right md:block">
                <p className="font-poppins text-sm font-medium text-white">{data.lead.name}</p>
                <p className="font-inter text-xs text-rhema-lavender/80">{data.lead.company}</p>
              </div>
            )}
            <Link href="/admin" className="font-poppins text-sm font-medium text-white/70 transition-colors hover:text-white">
              Voltar ao painel
            </Link>
          </div>
        </div>
      </header>

      <div id="portal-content" className="mx-auto w-full max-w-7xl flex-1 px-6 pb-24 pt-10">
        {loading && (
          <PageSkeleton />
        )}

        {!loading && pageError && <ErrorState error={pageError} />}

        {!loading && !pageError && data && (
          <div className="space-y-8">
            <Reveal delay={0}>
              <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
                <div>
                  <p className="font-poppins text-sm font-medium uppercase tracking-wide text-rhema-dark/50">
                    Portal do cliente
                  </p>
                  <h1 className="mt-1 font-poppins text-2xl font-bold text-rhema-institutional md:text-3xl">
                    Diagnóstico de {data.lead.name} · {data.lead.company}
                  </h1>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  {data.share.active && data.share.url && (
                    <button
                      onClick={handleRevoke}
                      disabled={shareBusy}
                      className="btn-ghost rounded-full border border-rhema-lavender-light px-5 py-2.5 font-poppins text-sm font-medium text-rhema-dark/70 transition-all duration-300 hover:border-red-300 hover:text-red-600 disabled:opacity-50"
                    >
                      Revogar link
                    </button>
                  )}
                  <button
                    onClick={handleCopyLink}
                    disabled={shareBusy}
                    className="btn-primary px-5 py-2.5"
                  >
                    {shareBusy ? "Copiando..." : "Copiar link cliente"}
                  </button>
                </div>
              </div>
            </Reveal>

            <Reveal delay={1}>
              <StageHero stage={data.stage} score={{ valor: data.score.valor, faixa: data.score.faixa }} />
            </Reveal>

            <div className="grid gap-6 md:grid-cols-2">
              <Reveal delay={2}>
                <div className="rounded-2xl border border-rhema-lavender-light bg-white p-6 shadow-[0_8px_32px_rgba(59,35,102,0.12)]">
                  <h2 className="mb-4 font-poppins text-lg font-semibold text-rhema-institutional">
                    Radar de maturidade
                  </h2>
                  <div className="overflow-x-auto">
                    <RadarSpider dimensions={data.dimensions} />
                  </div>
                </div>
              </Reveal>
              <Reveal delay={3}>
                <div className="rounded-2xl border border-rhema-lavender-light bg-white p-6 shadow-[0_8px_32px_rgba(59,35,102,0.12)]">
                  <div className="mb-2 flex items-center justify-between">
                    <h2 className="font-poppins text-lg font-semibold text-rhema-institutional">
                      Barras de maturidade
                    </h2>
                    {highlightIds && highlightIds.length > 0 && (
                      <button
                        onClick={() => setHighlightIds(null)}
                        role="button"
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
              </Reveal>
            </div>

            <Reveal delay={4}>
              <AnswersAccordion dimensions={data.dimensions} />
            </Reveal>

            {showAnalysis ? (
              <>
                <Reveal delay={5}>
                  <section aria-label="Concorrentes">
                    <h2 className="mb-4 font-poppins text-xl font-semibold text-rhema-institutional">
                      Concorrentes
                    </h2>
                    <CompetitorsGrid competitors={analysis?.contexto_concorrentes ?? []} />
                  </section>
                </Reveal>
                <Reveal delay={6}>
                  <section aria-label="Insights">
                    <h2 className="mb-4 font-poppins text-xl font-semibold text-rhema-institutional">
                      Insights
                    </h2>
                    <InsightsBoard
                      insights={insights ?? { bullets: [] }}
                      onDimensaoFilter={handleDimensaoFilter}
                    />
                  </section>
                </Reveal>
                <Reveal delay={7}>
                  <section aria-label="Fontes">
                    <h2 className="mb-4 font-poppins text-xl font-semibold text-rhema-institutional">
                      Fontes
                    </h2>
                    <SourcesList sources={data.sources} />
                  </section>
                </Reveal>
              </>
            ) : (
              <Reveal delay={5}>
                <section aria-label="Análise de mercado">
                  <h2 className="mb-4 font-poppins text-xl font-semibold text-rhema-institutional">
                    Análise de mercado
                  </h2>
                  <AnalysisPlaceholder
                    status={
                      analysisStatus === "falha"
                        ? "falha"
                        : analysisStatus === "analisado"
                          ? "processando"
                          : (analysisStatus ?? "pendente")
                    }
                    onReprocess={
                      analysisStatus === "falha" && !reprocessBusy
                        ? handleReprocess
                        : undefined
                    }
                  />
                </section>
              </Reveal>
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

      <ToastStack toasts={toasts} />
    </main>
  );
}
