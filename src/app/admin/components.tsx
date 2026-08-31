import { useState, useEffect } from "react";
import type { AnalysisStatus } from "@/lib/api/client";

export type { AnalysisStatus };

export function KpiCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "amber" | "red" | "green" | "primary";
}) {
  const tones: Record<string, string> = {
    amber: "text-amber-600",
    red: "text-red-600",
    green: "text-green-600",
    primary: "text-rhema-primary",
  };

  return (
    <div className="card p-5 transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:-translate-y-0.5">
      <p className="font-inter text-xs uppercase tracking-wide text-rhema-dark/50">
        {label}
      </p>
      <p
        className={`mt-2 font-poppins text-3xl font-bold tabular-nums ${tones[tone]}`}
      >
        {value}
      </p>
    </div>
  );
}

export function DiagnosticBadge({ hasDiagnostic }: { hasDiagnostic: boolean }) {
  return hasDiagnostic ? (
    <span className="inline-block rounded-full bg-green-100 px-2.5 py-1 font-inter text-xs font-medium text-green-700">
      Concluído
    </span>
  ) : (
    <span className="inline-block rounded-full bg-gray-100 px-2.5 py-1 font-inter text-xs font-medium text-gray-600">
      Pendente
    </span>
  );
}

export function AnalysisBadge({ status }: { status: AnalysisStatus }) {
  if (!status) {
    return <span className="font-inter text-xs text-rhema-dark/40">—</span>;
  }

  const map: Record<Exclude<AnalysisStatus, null>, string> = {
    pendente: "bg-amber-100 text-amber-700",
    processando: "bg-blue-100 text-blue-700",
    analisado: "bg-green-100 text-green-700",
    falha: "bg-red-100 text-red-700",
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
      className={`inline-block rounded-full px-2.5 py-1 font-inter text-xs font-medium ${map[status]}${pulse}`}
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
};

export function LogStepLabel({ step }: { step: string }) {
  const label = LOG_STEP_LABELS[step] ?? step;
  const tone = step === "failed" ? "text-red-700 font-medium" : "text-rhema-dark/70";
  return <span className={tone}>{label}</span>;
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
