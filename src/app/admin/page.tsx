"use client";

import { useState, useEffect, useCallback, type FormEvent } from "react";
import Link from "next/link";
import { PageShell, Toolbar, SiteFooter, Icon } from "../components/PageShell";
import {
  getAdminDashboard,
  generateReport,
  cancelReport,
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

  async function handleCancelReport(leadId: string) {
    setActionLoading(`cancel-${leadId}`);
    try {
      await cancelReport(leadId);
      await loadData();
      pushToast("success", "Processamento interrompido — já é possível reprocessar");
    } catch (err) {
      pushToast("error", err instanceof Error ? err.message : "Não foi possível parar o processamento");
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
    <PageShell as="div">
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
          onCancelReport={handleCancelReport}
          onDownloadReport={handleDownloadReport}
        />
      )}

      <ToastStack toasts={toasts} />
    </PageShell>
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
    <>
      <Toolbar>
        <a href="/" className="rd-link flex items-center gap-2">
          <Icon name="arrowLeft" size={13} /> Voltar ao início
        </a>
      </Toolbar>

      <section className="flex flex-1 items-start justify-center px-6 pb-20 pt-12 md:pt-20">
        <div className="rd-card w-full max-w-[440px] p-9 animate-fade-in-up">
          <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-xl bg-[#f1edf8] text-[#4a2c7d]">
            <Icon name="lock" size={18} />
          </div>
          <h1 className="rd-h text-[26px]">Painel administrativo</h1>
          <p className="mb-6 mt-1.5 text-sm text-[#6e6e73]">Acesse com suas credenciais de gerente.</p>
          <form onSubmit={onSubmit} className="space-y-4" noValidate>
            <div>
              <label htmlFor="email" className="rd-label">Email</label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                className={`rd-input ${loginError ? "error" : ""}`}
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
              <label htmlFor="password" className="rd-label">Senha</label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                className={`rd-input ${loginError ? "error" : ""}`}
                placeholder="Sua senha"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (loginError) setLoginError("");
                }}
              />
              {loginError && (
                <p className="mt-1 text-xs text-[#b23a34]" role="alert">{loginError}</p>
              )}
            </div>
            <button type="submit" disabled={loginLoading} className="rd-btn mt-2 w-full">
              {loginLoading ? "Entrando..." : <>Entrar <Icon name="arrowRight" size={14} /></>}
            </button>
          </form>
        </div>
      </section>
    </>
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
  onCancelReport,
  onDownloadReport,
}: {
  data: AdminDashboardResponse | null;
  loading: boolean;
  actionLoading: string | null;
  onRefresh: () => void;
  onLogout: () => void;
  onGenerateReport: (leadId: string) => void;
  onCancelReport: (leadId: string) => void;
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
      <Toolbar>
        <a href="/" className="rd-link">Início</a>
        <button onClick={onLogout} className="rd-btn-ghost">Sair</button>
      </Toolbar>

      <main id="main-content" className="rd-container flex-1 pt-14">
        <p className="rd-eyebrow inline-flex items-center gap-2 rounded-full border border-[#1d1d1f1f] bg-white px-3 py-1.5">
          <Icon name="pulse" size={12} className="text-[#4a2c7d]" /> Diagnos Data · Gerencial
        </p>
        <h1 className="rd-h mt-3 text-[40px] leading-tight">Operações</h1>
        <p className="mt-3 text-[15px] text-[#6e6e73]">
          Acompanhe os diagnósticos recebidos e gere relatórios de análise sob demanda.
        </p>

        {data?.kpis && (
          <div className="rd-card mt-8 grid grid-cols-2 lg:grid-cols-4">
            <KpiCard label="Leads" value={data.kpis.leadsTotal} />
            <KpiCard label="Diagnósticos concluídos" value={data.kpis.diagnosticosConcluidos} />
            <KpiCard label="Em processamento" value={data.kpis.relatoriosEmProcessamento} />
            <KpiCard label="Relatórios com falha" value={data.kpis.relatoriosFalha} />
          </div>
        )}

        <div className="mt-4 flex flex-col items-start justify-between gap-4 rounded-[20px] bg-[#f1edf8] p-6 md:flex-row md:items-center">
          <div>
            <h2 className="rd-h text-base">Fila de relatórios</h2>
            <p className="mt-1 text-[13px] text-[#6e6e73]">
              Acompanhe o estado de cada relatório, o log de processamento e os KPIs da fila.
            </p>
          </div>
          <a href="/admin/fila" className="rd-btn rd-btn--sm shrink-0">
            Ver fila de relatórios <Icon name="arrowRight" size={14} />
          </a>
        </div>

        <div className="rd-card mt-6 overflow-hidden">
          <div className="flex items-center justify-between px-6 pb-3 pt-5">
            <h2 className="rd-h text-lg">Clientes</h2>
            <button
              onClick={onRefresh}
              disabled={loading}
              className="rd-link flex items-center gap-2 disabled:opacity-50"
            >
              <Icon name="refresh" size={13} /> {loading ? "Carregando..." : "Atualizar"}
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
                  <tr className="border-b border-[#1d1d1f1f]">
                    {["Nome", "Empresa", "Email", "Diagnóstico", "Análise", "Ações"].map((h, i) => (
                      <th key={h} className={`rd-th px-6 ${i === 5 ? "text-right" : ""}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.leadId} className="border-b border-[#1d1d1f12] last:border-0">
                      <td className="px-6 py-4 font-medium text-[#1d1d1f]">{row.name}</td>
                      <td className="px-6 py-4 text-[#6e6e73]">{row.company}</td>
                      <td className="px-6 py-4 text-[#6e6e73]">{row.email}</td>
                      <td className="px-6 py-4"><DiagnosticBadge hasDiagnostic={row.hasDiagnostic} /></td>
                      <td className="px-6 py-4"><AnalysisBadge status={row.analysisStatus} /></td>
                      <td className="px-6 py-4 text-right">
                        <RowActions
                          row={row}
                          loadingKey={actionLoading}
                          onPlay={onGenerateReport}
                          onCancel={onCancelReport}
                          onDownload={onDownloadReport}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className="flex items-center justify-between px-6 pb-4 pt-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#707077]">
            <span className="tabular-nums">Total: {data?.rows.length ?? 0} clientes</span>
            <span>Atualizado às {lastUpdate}</span>
          </div>
        </div>
      </main>

      <SiteFooter />
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
  "inline-flex h-8 w-8 items-center justify-center rounded-lg transition-colors duration-200";

function actionButtonClass(disabled: boolean, tone: "primary" | "neutral"): string {
  if (disabled) {
    return `${ACTION_BUTTON_BASE} cursor-not-allowed text-[#6e6e73] opacity-40`;
  }
  const tones: Record<"primary" | "neutral", string> = {
    primary:
      "bg-[#f1edf8] text-[#4a2c7d] hover:bg-[#e6dff2]",
    neutral:
      "text-[#6e6e73] hover:bg-[#1d1d1f0d]",
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

function StopIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 16 16" fill="currentColor">
      <rect x="3.5" y="3.5" width="9" height="9" rx="1.5" />
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
  onCancel,
  onDownload,
}: {
  row: AdminLeadRow;
  loadingKey: string | null;
  onPlay: (leadId: string) => void;
  onCancel: (leadId: string) => void;
  onDownload: (leadId: string) => void;
}) {
  const playBusy = loadingKey === `play-${row.leadId}`;
  const cancelBusy = loadingKey === `cancel-${row.leadId}`;
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

      {processing && (
        <RowActionButton
          label="Parar processamento"
          tone="neutral"
          disabled={cancelBusy}
          busy={cancelBusy}
          onClick={() => onCancel(row.leadId)}
        >
          {cancelBusy ? <SpinnerIcon /> : <StopIcon />}
        </RowActionButton>
      )}

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
