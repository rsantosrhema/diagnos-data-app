"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  DiagnosticPortal,
  PortalErrorState,
  type DiagnosticPortalData,
} from "@/components/portal/DiagnosticPortal";
import {
  getManagerPortal,
  createShareLink,
  revokeShareLink,
  generateReport,
  downloadReportPdf,
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

function mapError(err: unknown): PageError {
  if (err instanceof ApiError) {
    if (err.status === 401 || err.status === 403) return "unauthorized";
    if (err.status === 404) return "notfound";
  }
  return "generic";
}

const ERROR_COPY: Record<PageError, { title: string; description: string }> = {
  unauthorized: {
    title: "Acesso não autorizado",
    description: "Faça login como gerente para ver o resultado deste diagnóstico.",
  },
  notfound: {
    title: "Diagnóstico não encontrado",
    description: "Este lead ainda não concluiu o diagnóstico ou não existe.",
  },
  generic: {
    title: "Erro interno",
    description: "Não foi possível carregar o portal. Tente novamente.",
  },
};

function toPortalData(data: ManagerPortalResponse): DiagnosticPortalData {
  return {
    lead: data.lead,
    score: data.score,
    dimensions: data.dimensions,
    risk: data.risk,
    imbalance: data.imbalance,
    stage: data.stage,
    analysisStatus: data.analysisStatus,
    analysis: data.analysis as MarketAnalysis | undefined,
    insights: data.insights as InsightsBrief | undefined,
    sources: data.sources,
    commercialAnswer: data.commercialAnswer,
  };
}

export default function LeadPortalPage() {
  const params = useParams<{ leadId: string }>();
  const leadId = params?.leadId ?? "";

  const [data, setData] = useState<ManagerPortalResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState<PageError | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [shareBusy, setShareBusy] = useState(false);
  const [reprocessBusy, setReprocessBusy] = useState(false);
  const [pdfBusy, setPdfBusy] = useState(false);
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

  async function handleDownloadPdf() {
    setPdfBusy(true);
    try {
      const { blob, filename } = await downloadReportPdf(leadId);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      pushToast("success", "Download do relatório iniciado");
    } catch (err) {
      pushToast(
        "error",
        err instanceof Error && err.message ? err.message : "Não foi possível baixar o relatório",
      );
    } finally {
      setPdfBusy(false);
    }
  }

  const errorCopy = ERROR_COPY[pageError ?? "generic"];

  return (
    <main className="flex min-h-screen flex-col bg-rhema-offwhite">
      <DiagnosticPortal
        mode="manager"
        data={data ? toPortalData(data) : null}
        loading={loading}
        onReprocess={
          data?.analysisStatus === "falha" && !reprocessBusy
            ? handleReprocess
            : undefined
        }
        actions={
          data ? (
            <div className="flex shrink-0 items-center gap-3">
              <button
                onClick={handleDownloadPdf}
                disabled={pdfBusy}
                className="rounded-full border border-rhema-lavender-light bg-transparent px-5 py-2.5 font-poppins text-sm font-medium text-rhema-dark/70 transition-all duration-300 hover:border-rhema-primary hover:text-rhema-primary disabled:opacity-50"
              >
                {pdfBusy ? "Gerando PDF..." : "Exportar PDF"}
              </button>
              {data.share.active && (
                <button
                  onClick={handleRevoke}
                  disabled={shareBusy}
                  className="rounded-full border border-rhema-lavender-light bg-transparent px-5 py-2.5 font-poppins text-sm font-medium text-rhema-dark/70 transition-all duration-300 hover:border-red-300 hover:text-red-600 disabled:opacity-50"
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
          ) : null
        }
        empty={
          <PortalErrorState
            title={errorCopy.title}
            description={errorCopy.description}
            action={
              <Link href="/admin" className="btn-primary">
                Voltar ao painel
              </Link>
            }
          />
        }
      />

      <ToastStack toasts={toasts} />
    </main>
  );
}
