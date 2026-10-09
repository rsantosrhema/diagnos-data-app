"use client";

import { useState, useEffect, useCallback, type FormEvent } from "react";
import Link from "next/link";
import { RhemaLogo } from "../components/RhemaLogo";
import { WaveDivider } from "../components/WaveDivider";
import {
  getAdminDashboard,
  generateReport,
  downloadReportPdf,
  loginAdminSession,
  getAdminSessionInfo,
  logoutAdminSession,
  type AdminDashboardResponse,
  type AdminLeadRow,
} from "@/lib/api/client";
import {
  AnalysisBadge,
  DiagnosticBadge,
  KpiCard,
  Reveal,
  type AnalysisStatus,
} from "./components";

type View = "login" | "dashboard";

interface Toast {
  id: number;
  kind: "success" | "error";
  message: string;
}

let toastSeq = 0;

export default function AdminPage() {
  const [view, setView] = useState<View>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);

  const [data, setData] = useState<AdminDashboardResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const pushToast = useCallback((kind: Toast["kind"], message: string) => {
    const id = ++toastSeq;
    setToasts((prev) => [...prev, { id, kind, message }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getAdminDashboard();
      setData(result);
    } catch {
      setView("login");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (view === "dashboard") loadData();
  }, [view, loadData]);

  useEffect(() => {
    getAdminSessionInfo()
      .then((info) => {
        if (info.authenticated) setView("dashboard");
      })
      .catch(() => {});
  }, []);

  async function handleLogin(ev: FormEvent) {
    ev.preventDefault();
    setLoginError("");
    setLoginLoading(true);

    try {
      const info = await loginAdminSession(email.trim(), password);
      if (!info.authenticated) {
        setLoginError("Email ou senha inválidos");
        setLoginLoading(false);
        return;
      }
      setView("dashboard");
    } catch (err) {
      setLoginError(
        err instanceof Error && err.message
          ? err.message
          : "Email ou senha inválidos",
      );
    } finally {
      setLoginLoading(false);
    }
  }

  async function handleLogout() {
    await logoutAdminSession().catch(() => {});
    setData(null);
    setView("login");
  }

  async function handleGenerateReport(leadId: string) {
    setActionLoading(`play-${leadId}`);
    try {
      const result = await generateReport(leadId);
      await loadData();
      if (result.queued) {
        pushToast("success", "Relatório enfileirado — processando na frota de agentes");
      } else {
        pushToast("success", "Relatório já está na fila ou em processamento");
      }
    } catch (err) {
      pushToast("error", err instanceof Error ? err.message : "Não foi possível gerar o relatório");
    } finally {
      setActionLoading(null);
    }
  }

  async function handleDownloadReport(leadId: string) {
    setActionLoading(`report-${leadId}`);
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
      pushToast("error", err instanceof Error ? err.message : "Não foi possível baixar o relatório");
    } finally {
      setActionLoading(null);
    }
  }

  return (
    <main className="flex min-h-screen flex-col">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[60] focus:rounded-full focus:bg-rhema-primary focus:px-4 focus:py-2 focus:text-sm focus:text-white"
      >
        Pular para o conteúdo
      </a>

      {view === "login" ? (
        <LoginView
          email={email}
          setEmail={setEmail}
          password={password}
          setPassword={setPassword}
          loginError={loginError}
          setLoginError={setLoginError}
          loginLoading={loginLoading}
          onSubmit={handleLogin}
        />
      ) : (
        <DashboardView
          data={data}
          loading={loading}
          actionLoading={actionLoading}
          onRefresh={loadData}
          onLogout={handleLogout}
          onGenerateReport={handleGenerateReport}
          onDownloadReport={handleDownloadReport}
        />
      )}

      <ToastStack toasts={toasts} />
    </main>
  );
}

// ─── Toasts ───

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

// ─── Login ───

function LoginView({
  email,
  setEmail,
  password,
  setPassword,
  loginError,
  setLoginError,
  loginLoading,
  onSubmit,
}: {
  email: string;
  setEmail: (v: string) => void;
  password: string;
  setPassword: (v: string) => void;
  loginError: string;
  setLoginError: (v: string) => void;
  loginLoading: boolean;
  onSubmit: (ev: FormEvent) => void;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="bg-rhema-institutional">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <a href="/">
            <RhemaLogo variant="dark" width={140} />
          </a>
          <a
            href="/"
            className="font-poppins text-sm font-medium text-white/70 transition-colors hover:text-white"
          >
            Voltar ao início
          </a>
        </div>
      </header>

      <section className="bg-rhema-institutional relative overflow-hidden">
        <div className="mx-auto max-w-6xl px-6 pb-20 pt-12 text-center md:pb-24 md:pt-16">
          <h1 className="font-poppins text-2xl font-bold text-white md:text-4xl">
            Painel administrativo
          </h1>
          <p className="mx-auto mt-4 max-w-md font-inter text-base text-rhema-lavender/80">
            Acesse com suas credenciais de gerente.
          </p>
        </div>
        <WaveDivider color="var(--color-rhema-offwhite)" />
      </section>

      <section className="bg-rhema-offwhite -mt-1 flex flex-1 items-start justify-center px-6 pb-20 pt-8 md:pt-16">
        <div className="card w-full max-w-md p-8 md:p-10 animate-fade-in-up">
          <form onSubmit={onSubmit} className="space-y-5" noValidate>
            <div>
              <label htmlFor="email" className="label-field">
                Email
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                className={`input-field ${loginError ? "error" : ""}`}
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (loginError) setLoginError("");
                }}
                autoFocus
              />
            </div>

            <div>
              <label htmlFor="password" className="label-field">
                Senha
              </label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                className={`input-field ${loginError ? "error" : ""}`}
                placeholder="Sua senha"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (loginError) setLoginError("");
                }}
              />
              {loginError && (
                <p className="mt-1 font-inter text-xs text-red-600" role="alert">
                  {loginError}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={loginLoading}
              className="btn-primary w-full"
            >
              {loginLoading ? "Entrando..." : "Entrar"}
            </button>
          </form>
        </div>
      </section>
    </div>
  );
}

// ─── Dashboard ───

function DashboardView({
  data,
  loading,
  actionLoading,
  onRefresh,
  onLogout,
  onGenerateReport,
  onDownloadReport,
}: {
  data: AdminDashboardResponse | null;
  loading: boolean;
  actionLoading: string | null;
  onRefresh: () => void;
  onLogout: () => void;
  onGenerateReport: (leadId: string) => void;
  onDownloadReport: (leadId: string) => void;
}) {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!data) return;
    const hasActive = data.rows.some(
      (r) => r.analysisStatus === "pendente" || r.analysisStatus === "processando",
    );
    if (!hasActive) return;
    const id = setInterval(onRefresh, 15000);
    return () => clearInterval(id);
  }, [data, onRefresh]);

  const lastUpdate = now.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const rows = data?.rows ?? [];
  const showSkeletons = loading && !data;
  const showEmpty = !loading && data && rows.length === 0;

  return (
    <>
      <header className="bg-rhema-institutional">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <RhemaLogo variant="dark" width={140} />
          <div className="flex items-center gap-6">
            <a
              href="/"
              className="hidden font-poppins text-sm font-medium text-white/70 transition-colors hover:text-white md:inline-block"
            >
              Início
            </a>
            <button
              onClick={onLogout}
              className="rounded-full bg-white px-5 py-2 font-poppins text-sm font-medium text-rhema-primary transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:-translate-y-0.5 hover:bg-rhema-lavender active:scale-[0.98]"
            >
              Sair
            </button>
          </div>
        </div>
      </header>

      <section className="bg-rhema-institutional relative overflow-hidden">
        <div className="mx-auto max-w-7xl px-6 pb-16 pt-12 md:pb-20 md:pt-16">
          <p className="mb-3 font-poppins text-sm font-medium uppercase tracking-wide text-rhema-lavender">
            Diagnos Data · Gerencial
          </p>
          <h1 className="font-poppins text-3xl font-bold text-white md:text-4xl">
            Operações
          </h1>
          <p className="mt-4 max-w-xl font-inter text-base leading-relaxed text-rhema-lavender/80">
            Acompanhe os diagnósticos recebidos e gere relatórios de análise
            sob demanda.
          </p>
        </div>
        <WaveDivider color="var(--color-rhema-offwhite)" />
      </section>

      <main id="main-content" className="bg-rhema-offwhite -mt-1 flex-1">
        <div className="mx-auto max-w-7xl px-6 pb-24 pt-10 md:pt-14">
          {/* KPIs */}
          {data?.kpis && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Reveal delay={0}>
                <KpiCard label="Leads" value={data.kpis.leadsTotal} tone="primary" />
              </Reveal>
              <Reveal delay={1}>
                <KpiCard label="Diagnósticos concluídos" value={data.kpis.diagnosticosConcluidos} tone="green" />
              </Reveal>
              <Reveal delay={2}>
                <KpiCard label="Em processamento" value={data.kpis.relatoriosEmProcessamento} tone="amber" />
              </Reveal>
              <Reveal delay={3}>
                <KpiCard label="Relatórios com falha" value={data.kpis.relatoriosFalha} tone="red" />
              </Reveal>
            </div>
          )}

          {/* Fila de relatórios — página dedicada */}
          <Reveal delay={4}>
            <div className="card mt-8 flex items-center justify-between p-6">
              <div>
                <h2 className="font-poppins text-lg font-semibold text-rhema-institutional">
                  Fila de relatórios
                </h2>
                <p className="mt-1 font-inter text-sm text-rhema-dark/60">
                  Acompanhe o estado de cada relatório, o log de processamento e os
                  KPIs da fila.
                </p>
              </div>
              <a href="/admin/fila" className="btn-primary shrink-0">
                Ver fila de relatórios
              </a>
            </div>
          </Reveal>

          {/* Table */}
          <Reveal delay={5}>
            <div className="card mt-8 overflow-hidden">
              <div className="flex items-center justify-between border-b border-rhema-lavender-light px-6 py-4">
                <h2 className="font-poppins text-lg font-semibold text-rhema-institutional">
                  Clientes
                </h2>
                <button
                  onClick={onRefresh}
                  disabled={loading}
                  className="font-inter text-sm text-rhema-primary transition-colors hover:underline disabled:opacity-50"
                >
                  {loading ? "Carregando..." : "Atualizar"}
                </button>
              </div>

              <div className="overflow-x-auto">
                {showSkeletons ? (
                  <TableSkeleton />
                ) : showEmpty ? (
                  <EmptyState />
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-rhema-lavender-light bg-rhema-lavender-light/30">
                        {["Nome", "Empresa", "Email", "Diagnóstico", "Análise", "Ações"].map(
                          (h, i) => (
                            <th
                              key={h}
                              className={`px-6 py-3 font-poppins text-xs font-medium text-rhema-dark/60 ${
                                i === 5 ? "text-right" : "text-left"
                              }`}
                            >
                              {h}
                            </th>
                          ),
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((row) => (
                        <tr
                          key={row.leadId}
                          className="border-b border-rhema-lavender-light/50 transition-colors last:border-0 hover:bg-rhema-lavender-light/20"
                        >
                          <td className="px-6 py-3.5 font-inter font-medium text-rhema-dark">
                            {row.name}
                          </td>
                          <td className="px-6 py-3.5 font-inter text-rhema-dark/70">
                            {row.company}
                          </td>
                          <td className="px-6 py-3.5 font-inter text-rhema-dark/70">
                            {row.email}
                          </td>
                          <td className="px-6 py-3.5">
                            <DiagnosticBadge hasDiagnostic={row.hasDiagnostic} />
                          </td>
                          <td className="px-6 py-3.5">
                            <AnalysisBadge status={row.analysisStatus} />
                          </td>
                          <td className="px-6 py-3.5 text-right">
                            <RowActions
                              row={row}
                              loadingKey={actionLoading}
                              onPlay={onGenerateReport}
                              onDownload={onDownloadReport}
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </Reveal>

          {/* Footer meta */}
          <div className="mt-6 flex flex-col items-center justify-between gap-2 font-mono text-[11px] uppercase tracking-wider text-rhema-dark/40 md:flex-row">
            <span className="tabular-nums">Total: {data?.rows.length ?? 0} clientes</span>
            <span>Atualizado às {lastUpdate}</span>
          </div>
        </div>
      </main>

      <footer className="bg-rhema-institutional">
        <WaveDivider flip color="var(--color-rhema-institutional)" className="-mb-1" />
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 py-10 md:flex-row">
          <RhemaLogo variant="dark" width={120} />
          <p className="font-inter text-xs text-white/50">
            © {new Date().getFullYear()} Rhema Data. Todos os direitos reservados.
          </p>
        </div>
      </footer>
    </>
  );
}

// ─── Table loading & empty states ───

function TableSkeleton() {
  return (
    <div className="px-6 py-6" aria-hidden>
      <div className="space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4">
            <div className="skeleton h-5 w-32" />
            <div className="skeleton h-5 w-40" />
            <div className="skeleton h-5 w-44" />
            <div className="skeleton h-5 w-24" />
            <div className="skeleton h-5 w-24" />
            <div className="ml-auto flex gap-2">
              <div className="skeleton h-8 w-8" />
              <div className="skeleton h-8 w-8" />
              <div className="skeleton h-8 w-8" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-rhema-primary/10 text-rhema-primary">
        <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="3" />
          <path d="M9 3v18" />
        </svg>
      </div>
      <h3 className="font-poppins text-lg font-semibold text-rhema-institutional">
        Nenhum cliente cadastrado
      </h3>
      <p className="mt-2 max-w-sm font-inter text-sm leading-relaxed text-rhema-dark/60">
        Quando um lead se cadastrar e concluir o diagnóstico pelo site, ele
        aparece aqui para você gerar o relatório de análise.
      </p>
    </div>
  );
}

// ─── Sub-components ───

const ACTION_BUTTON_BASE =
  "inline-flex h-8 w-8 items-center justify-center rounded-lg border transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]";

function actionButtonClass(disabled: boolean, tone: "primary" | "neutral"): string {
  if (disabled) {
    return `${ACTION_BUTTON_BASE} cursor-not-allowed border-rhema-lavender-light bg-white text-rhema-institutional opacity-40`;
  }
  const tones: Record<"primary" | "neutral", string> = {
    primary:
      "border-rhema-primary bg-rhema-primary text-white hover:bg-rhema-primary-light hover:-translate-y-0.5",
    neutral:
      "border-rhema-lavender bg-white text-rhema-institutional hover:bg-rhema-lavender-light hover:-translate-y-0.5",
  };
  return `${ACTION_BUTTON_BASE} ${tones[tone]}`;
}

function SpinnerIcon() {
  return (
    <svg
      className="h-4 w-4 animate-spin"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    >
      <path d="M12 3a9 9 0 1 0 9 9" />
    </svg>
  );
}

function PlayIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 16 16" fill="currentColor">
      <path d="M4.5 2.7a.9.9 0 0 1 1.36-.77l7.1 5.3a.9.9 0 0 1 0 1.54l-7.1 5.3A.9.9 0 0 1 4.5 13.3z" />
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg
      className="h-4 w-4"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M8 2v8" />
      <path d="M4.5 6.8 8 10.3l3.5-3.5" />
      <path d="M3 13.5h10" />
    </svg>
  );
}

function PortalIcon() {
  return (
    <svg
      className="h-4 w-4"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="1.5" y="2.5" width="13" height="11" rx="1.5" />
      <path d="M4.5 5.5h4" />
      <path d="M4.5 8h7" />
      <path d="M4.5 10.5h5" />
    </svg>
  );
}

function RowActionButton({
  label,
  disabled,
  busy = false,
  tone,
  onClick,
  href,
  children,
}: {
  label: string;
  disabled: boolean;
  busy?: boolean;
  tone: "primary" | "neutral";
  onClick?: () => void;
  href?: string;
  children: React.ReactNode;
}) {
  const className = actionButtonClass(disabled, tone);

  if (href && !disabled) {
    return (
      <Link href={href} aria-label={label} title={label} className={className}>
        {children}
      </Link>
    );
  }

  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      aria-busy={busy || undefined}
      disabled={disabled}
      onClick={disabled ? undefined : onClick}
      className={className}
    >
      {children}
    </button>
  );
}

function RowActions({
  row,
  loadingKey,
  onPlay,
  onDownload,
}: {
  row: AdminLeadRow;
  loadingKey: string | null;
  onPlay: (leadId: string) => void;
  onDownload: (leadId: string) => void;
}) {
  const playBusy = loadingKey === `play-${row.leadId}`;
  const downloading = loadingKey === `report-${row.leadId}`;
  const processing =
    row.analysisStatus === "pendente" || row.analysisStatus === "processando";
  const analyzed = row.analysisStatus === "analisado";

  const playDisabled = !row.hasDiagnostic || analyzed || processing || playBusy;
  const reportDisabled = !analyzed || downloading;
  const portalDisabled = !row.hasDiagnostic;

  const playLabel = analyzed
    ? "Relatório já processado"
    : processing
      ? "Processando relatório"
      : "Processar relatório";

  return (
    <div className="flex items-center justify-end gap-2">
      <RowActionButton
        label={playLabel}
        tone="primary"
        disabled={playDisabled}
        busy={playBusy || processing}
        onClick={() => onPlay(row.leadId)}
      >
        {playBusy || processing ? <SpinnerIcon /> : <PlayIcon />}
      </RowActionButton>

      <RowActionButton
        label={analyzed ? "Baixar relatório em PDF" : "Relatório disponível após o processamento"}
        tone="neutral"
        disabled={reportDisabled}
        busy={downloading}
        onClick={() => onDownload(row.leadId)}
      >
        {downloading ? <SpinnerIcon /> : <DownloadIcon />}
      </RowActionButton>

      <RowActionButton
        label="Abrir portal do cliente"
        tone="neutral"
        disabled={portalDisabled}
        href={`/admin/leads/${row.leadId}`}
      >
        <PortalIcon />
      </RowActionButton>
    </div>
  );
}
