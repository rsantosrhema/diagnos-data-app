"use client";

import { useState, useEffect, useCallback, type FormEvent } from "react";
import { RhemaLogo } from "../components/RhemaLogo";
import { WaveDivider } from "../components/WaveDivider";
import { supabase } from "@/lib/supabase/browser";
import {
  getAdminDashboard,
  generateReport,
  type AdminDashboardResponse,
  type AdminLeadRow,
  type AnalysisStatus,
} from "@/lib/api/client";

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
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const pushToast = useCallback((kind: Toast["kind"], message: string) => {
    const id = ++toastSeq;
    setToasts((prev) => [...prev, { id, kind, message }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const getAuthToken = useCallback(async (): Promise<string | null> => {
    const { data: session } = await supabase.auth.getSession();
    return session.session?.access_token ?? null;
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const token = await getAuthToken();
      if (!token) {
        setView("login");
        return;
      }
      const result = await getAdminDashboard(token);
      setData(result);
    } catch {
      setView("login");
    } finally {
      setLoading(false);
    }
  }, [getAuthToken]);

  useEffect(() => {
    if (view === "dashboard") loadData();
  }, [view, loadData]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: session }) => {
      if (session.session) setView("dashboard");
    });
  }, []);

  useEffect(() => {
    if (!openMenu) return;
    const close = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest("[data-action-menu]")) setOpenMenu(null);
    };
    const esc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpenMenu(null);
    };
    document.addEventListener("click", close);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("click", close);
      document.removeEventListener("keydown", esc);
    };
  }, [openMenu]);

  async function handleLogin(ev: FormEvent) {
    ev.preventDefault();
    setLoginError("");
    setLoginLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    setLoginLoading(false);

    if (error) {
      setLoginError("Email ou senha inválidos");
      return;
    }

    setView("dashboard");
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    setData(null);
    setView("login");
  }

  async function handleGenerateReport(leadId: string) {
    setActionLoading(`report-${leadId}`);
    try {
      const authToken = await getAuthToken();
      if (!authToken) return;
      await generateReport(leadId, authToken);
      await loadData();
      pushToast("success", "Relatório enfileirado — você receberá por email");
    } catch (err) {
      pushToast("error", err instanceof Error ? err.message : "Não foi possível gerar o relatório");
    } finally {
      setActionLoading(null);
      setOpenMenu(null);
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
          openMenu={openMenu}
          setOpenMenu={setOpenMenu}
          onRefresh={loadData}
          onLogout={handleLogout}
          onGenerateReport={handleGenerateReport}
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
  openMenu,
  setOpenMenu,
  onRefresh,
  onLogout,
  onGenerateReport,
}: {
  data: AdminDashboardResponse | null;
  loading: boolean;
  actionLoading: string | null;
  openMenu: string | null;
  setOpenMenu: (v: string | null) => void;
  onRefresh: () => void;
  onLogout: () => void;
  onGenerateReport: (leadId: string) => void;
}) {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(id);
  }, []);

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
                <KpiCard label="Relatórios pendentes" value={data.kpis.relatoriosPendentes} tone="amber" />
              </Reveal>
              <Reveal delay={3}>
                <KpiCard label="Relatórios com falha" value={data.kpis.relatoriosFalha} tone="red" />
              </Reveal>
            </div>
          )}

          {/* Table */}
          <Reveal delay={4}>
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
                            <RowActionMenu
                              row={row}
                              open={openMenu === row.leadId}
                              onToggle={() =>
                                setOpenMenu(openMenu === row.leadId ? null : row.leadId)
                              }
                              loadingKey={actionLoading}
                              onGenerateReport={onGenerateReport}
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
            <div className="ml-auto skeleton h-7 w-7" />
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

// ─── Reveal wrapper ───

function Reveal({ delay = 0, children }: { delay?: number; children: React.ReactNode }) {
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

// ─── Sub-components ───

function KpiCard({
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

function DiagnosticBadge({ hasDiagnostic }: { hasDiagnostic: boolean }) {
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

function AnalysisBadge({ status }: { status: AnalysisStatus }) {
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

  return (
    <span
      className={`inline-block rounded-full px-2.5 py-1 font-inter text-xs font-medium ${map[status]}`}
    >
      {labels[status]}
    </span>
  );
}

function RowActionMenu({
  row,
  open,
  onToggle,
  loadingKey,
  onGenerateReport,
}: {
  row: AdminLeadRow;
  open: boolean;
  onToggle: () => void;
  loadingKey: string | null;
  onGenerateReport: (leadId: string) => void;
}) {
  const canGenerate =
    row.hasDiagnostic && row.analysisStatus !== "processando";

  return (
    <div className="relative inline-block" data-action-menu>
      <button
        aria-label="Ações do cliente"
        aria-haspopup="menu"
        aria-expanded={open}
        className={`action-toggle ${open ? "bg-rhema-lavender-light/60" : ""}`}
        onClick={(e) => {
          e.stopPropagation();
          onToggle();
        }}
      >
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
          <circle cx="5" cy="12" r="1.5" />
          <circle cx="12" cy="12" r="1.5" />
          <circle cx="19" cy="12" r="1.5" />
        </svg>
      </button>

      {open && (
        <div className="action-menu" role="menu">
          {canGenerate && (
            <button
              role="menuitem"
              className="action-item"
              disabled={loadingKey === `report-${row.leadId}`}
              onClick={() => onGenerateReport(row.leadId)}
            >
              <svg className="h-3.5 w-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 1.5h5.5L13 5v9.5a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-12a1 1 0 0 1 1-1z" />
                <path d="M9.5 1.5V5H13" />
                <path d="M5.5 8h5" />
                <path d="M5.5 11h5" />
              </svg>
              {loadingKey === `report-${row.leadId}` ? "Gerando..." : "Gerar relatório"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
