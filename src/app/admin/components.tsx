import { useState, useEffect } from "react";
import type { AnalysisStatus } from "@/lib/api/client";

export type { AnalysisStatus };

export function KpiCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="border-[#1d1d1f12] p-6 [&:not(:first-child)]:border-l">
      <p className="rd-eyebrow">{label}</p>
      <p className="rd-h mt-2 text-[28px] tabular-nums">{value}</p>
    </div>
  );
}

export function DiagnosticBadge({ hasDiagnostic }: { hasDiagnostic: boolean }) {
  return hasDiagnostic ? (
    <span className="rd-pill rd-pill--ok">
      Concluído
    </span>
  ) : (
    <span className="rd-pill rd-pill--gray">
      Pendente
    </span>
  );
}

export function AnalysisBadge({ status }: { status: AnalysisStatus }) {
  if (!status) {
    return <span className="text-xs text-[#707077]">—</span>;
  }

  const map: Record<Exclude<AnalysisStatus, null>, string> = {
    pendente: "rd-pill--amber",
    processando: "rd-pill--blue",
    analisado: "rd-pill--ok",
    falha: "rd-pill--risk",
  };

  const labels: Record<Exclude<AnalysisStatus, null>, string> = {
    pendente: "Pendente",
    processando: "Processando",
    analisado: "Analisado",
    falha: "Falha",
  };

  const pulse = status === "processando" ? " animate-pulse" : "";

  return (
    <span
      className={`rd-pill ${map[status]}${pulse}`}
    >
      {labels[status]}
    </span>
  );
}

export function formatTime(value: string | null): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

export function formatDuration(seconds: number | null): string {
  if (seconds == null) return "—";
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return s > 0 ? `${m}m ${s}s` : `${m}m`;
}

const LOG_STEP_LABELS: Record<string, string> = {
  enqueued: "Enfileirado",
  started: "Processamento iniciado",
  researcher: "Pesquisa de mercado (Exa)",
  analyst: "Análise (LLM)",
  writer: "Geração de insights (LLM)",
  pdf: "PDF gerado",
  email: "E-mail enviado",
  completed: "Concluído",
  failed: "Falha",
  pdf_failed: "Falha ao gerar PDF",
  email_failed: "Falha ao enviar e-mail",
  requeue: "Devolvido à fila (retry)",
};

const LOG_ERROR_STEPS = new Set(["failed", "pdf_failed", "email_failed"]);

export function LogStepLabel({ step }: { step: string }) {
  const label = LOG_STEP_LABELS[step] ?? step;
  const tone = LOG_ERROR_STEPS.has(step)
    ? "text-[#b23a34] font-medium"
    : "text-[#6e6e73]";
  return <span className={tone}>{label}</span>;
}

export function isLogErrorStep(step: string): boolean {
  return LOG_ERROR_STEPS.has(step);
}

export function Reveal({ delay = 0, children }: { delay?: number; children: React.ReactNode }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 100 * delay);
    return () => clearTimeout(timer);
  }, [delay]);

  return (
    <div
      className={`reveal ${visible ? "is-visible" : ""}`}
      style={{ transitionDelay: `${100 * delay}ms` }}
    >
      {children}
    </div>
  );
}
