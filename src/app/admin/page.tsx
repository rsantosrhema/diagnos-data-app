"use client";

import { useState, useEffect, useCallback, type FormEvent } from "react";
import { RhemaLogo } from "../components/RhemaLogo";
import { WaveDivider } from "../components/WaveDivider";
import { supabase } from "@/lib/supabase/browser";
import {
  getAdminTokens,
  generateToken,
  sendToken,
  cancelToken,
  regenerateToken,
  reprocessAnalysis,
  type AdminTokensResponse,
  type AdminLeadRow,
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

  const [data, setData] = useState<AdminTokensResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [generatedTokens, setGeneratedTokens] = useState<Record<string, string>>({});
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
      const result = await getAdminTokens(token);
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

  async function handleGenerate(leadId: string) {
    setActionLoading(`gen-${leadId}`);
    try {
      const token = await getAuthToken();
      if (!token) return;
      const result = await generateToken(leadId, token);
      // Store the plaintext token in memory — only available at generation time
      setGeneratedTokens((prev) => ({ ...prev, [leadId]: result.token }));
      await loadData();
      pushToast("success", "Token gerado e pronto para envio");
    } catch (err) {
      pushToast("error", err instanceof Error ? err.message : "Não foi possível gerar o token");
    } finally {
      setActionLoading(null);
      setOpenMenu(null);
    }
  }

  async function handleSend(row: AdminLeadRow) {
    const tokenPlain = generatedTokens[row.leadId] ?? null;
    if (!tokenPlain) {
      pushToast("error", "Gere um novo token antes de enviar. O token em texto puro não é recuperável após o envio.");
      return;
    }

    setActionLoading(`send-${row.tokenId}`);
    try {
      const authToken = await getAuthToken();
      if (!authToken || !row.tokenId) return;
      await sendToken(row.tokenId, tokenPlain, authToken);
      setGeneratedTokens((prev) => {
        const next = { ...prev };
        delete next[row.leadId];
        return next;
      });
      await loadData();
      pushToast("success", "Token enviado por email");
    } catch (err) {
      pushToast("error", err instanceof Error ? err.message : "Não foi possível enviar o token");
    } finally {
      setActionLoading(null);
      setOpenMenu(null);
    }
  }

  async function handleCancel(tokenId: string) {
    setActionLoading(`cancel-${tokenId}`);
    try {
      const token = await getAuthToken();
      if (!token) return;
      await cancelToken(tokenId, token);
      await loadData();
      pushToast("success", "Token cancelado");
    } catch (err) {
      pushToast("error", err instanceof Error ? err.message : "Não foi possível cancelar o token");
    } finally {
      setActionLoading(null);
      setOpenMenu(null);
    }
  }

  async function handleRegenerate(tokenId: string) {
    setActionLoading(`regen-${tokenId}`);
    try {
      const authToken = await getAuthToken();
      if (!authToken) return;
      const result = await regenerateToken(tokenId, authToken);
      // Find the leadId for this token from the current data
      const row = data?.rows.find((r) => r.tokenId === tokenId);
      if (row) {
        setGeneratedTokens((prev) => ({ ...prev, [row.leadId]: result.token }));
      }
      await loadData();
      pushToast("success", "Novo token gerado");
    } catch (err) {
      pushToast("error", err instanceof Error ? err.message : "Não foi possível regenerar o token");
    } finally {
      setActionLoading(null);
      setOpenMenu(null);
    }
  }

  async function handleReprocess(leadId: string) {
    setActionLoading(`reproc-${leadId}`);
    try {
      const authToken = await getAuthToken();
      if (!authToken) return;
      await reprocessAnalysis(leadId, authToken);
      await loadData();
      pushToast("success", "Análise reprocessada em background");
    } catch (err) {
      pushToast("error", err instanceof Error ? err.message : "Não foi possível reprocessar a análise");
    } finally {
      setActionLoading(null);
      setOpenMenu(null);
    }
  }

  const handleCopyToken = useCallback(
    async (token: string) => {
      try {
        await navigator.clipboard.writeText(token);
        pushToast("success", "Token copiado");
      } catch {
        // clipboard unavailable
      }
    },
    [pushToast],
  );

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
          generatedTokens={generatedTokens}
          openMenu={openMenu}
          setOpenMenu={setOpenMenu}
          onRefresh={loadData}
          onLogout={handleLogout}
          onGenerate={handleGenerate}
          onSend={handleSend}
          onCancel={handleCancel}
          onRegenerate={handleRegenerate}
          onReprocess={handleReprocess}
          onCopyToken={handleCopyToken}
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
  generatedTokens,
  openMenu,
  setOpenMenu,
  onRefresh,
  onLogout,
  onGenerate,
  onSend,
  onCancel,
  onRegenerate,
  onReprocess,
  onCopyToken,
}: {
  data: AdminTokensResponse | null;
  loading: boolean;
  actionLoading: string | null;
  generatedTokens: Record<string, string>;
  openMenu: string | null;
  setOpenMenu: (v: string | null) => void;
  onRefresh: () => void;
  onLogout: () => void;
  onGenerate: (leadId: string) => void;
  onSend: (row: AdminLeadRow) => void;
  onCancel: (tokenId: string) => void;
  onRegenerate: (tokenId: string) => void;
  onReprocess: (leadId: string) => void;
  onCopyToken: (token: string) => void;
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
            Gerencie leads e tokens de acesso. Cada token é de uso único e
            expira automaticamente.
          </p>
        </div>
        <WaveDivider color="var(--color-rhema-offwhite)" />
      </section>

      <main id="main-content" className="bg-rhema-offwhite -mt-1 flex-1">
        <div className="mx-auto max-w-7xl px-6 pb-24 pt-10 md:pt-14">
          {/* KPIs */}
          {data?.kpis && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Reveal delay={0}>
                <KpiCard label="Pendentes envio" value={data.kpis.pendentesEnvio} tone="amber" />
              </Reveal>
              <Reveal delay={1}>
                <KpiCard label="Expirados" value={data.kpis.expirados} tone="red" />
              </Reveal>
              <Reveal delay={2}>
                <KpiCard label="Cadastrados" value={data.kpis.cadastrados} tone="primary" />
              </Reveal>
            </div>
          )}

          {/* Table */}
          <Reveal delay={3}>
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
                        {["Nome", "Empresa", "Email", "Status Token", "Token", "Ações"].map(
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
                            <StatusBadge status={row.tokenStatus ?? null} />
                          </td>
                          <td className="px-6 py-3.5">
                            <TokenField
                              token={generatedTokens[row.leadId] ?? null}
                              valid={row.tokenStatus === "disponivel"}
                              onCopy={onCopyToken}
                            />
                          </td>
                          <td className="px-6 py-3.5 text-right">
                            <RowActionMenu
                              row={row}
                              open={openMenu === row.leadId}
                              onToggle={() =>
                                setOpenMenu(openMenu === row.leadId ? null : row.leadId)
                              }
                              loadingKey={actionLoading}
                              onGenerate={onGenerate}
                              onSend={onSend}
                              onCancel={onCancel}
                              onRegenerate={onRegenerate}
                              onReprocess={onReprocess}
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
            <div className="skeleton h-5 w-20" />
            <div className="skeleton h-7 w-28" />
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
        Quando um lead solicitar acesso pelo site, ele aparece aqui para você
        gerar e enviar o token.
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
  tone: "amber" | "red" | "primary";
}) {
  const tones: Record<string, string> = {
    amber: "text-amber-600",
    red: "text-red-600",
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

function StatusBadge({ status }: { status: string | null }) {
  if (!status) {
    return <span className="font-inter text-xs text-rhema-dark/40">—</span>;
  }

  const map: Record<string, string> = {
    pendente: "bg-amber-100 text-amber-700",
    token_gerado: "bg-blue-100 text-blue-700",
    diagnosticado: "bg-green-100 text-green-700",
    disponivel: "bg-blue-100 text-blue-700",
    usado: "bg-green-100 text-green-700",
    expirado: "bg-red-100 text-red-700",
    cancelado: "bg-gray-100 text-gray-600",
  };

  const labels: Record<string, string> = {
    disponivel: "Disponível",
    usado: "Usado",
    expirado: "Expirado",
    cancelado: "Cancelado",
  };

  return (
    <span
      className={`inline-block rounded-full px-2.5 py-1 font-inter text-xs font-medium ${
        map[status] ?? "bg-gray-100 text-gray-600"
      }`}
    >
      {labels[status] ?? status}
    </span>
  );
}

function TokenField({
  token,
  valid,
  onCopy,
}: {
  token: string | null;
  valid: boolean;
  onCopy: (token: string) => void;
}) {
  const [revealed, setRevealed] = useState(false);

  if (!token) {
    return <span className="font-inter text-xs text-rhema-dark/40">—</span>;
  }

  const tone = valid
    ? "text-rhema-primary bg-rhema-lavender-light/40 border-rhema-lavender"
    : "text-red-700 bg-red-50 border-red-200";

  const eyeTone = valid
    ? "border-rhema-lavender bg-white text-rhema-primary hover:bg-rhema-lavender-light"
    : "border-red-200 bg-red-50 text-red-700 hover:bg-red-100";

  return (
    <div className="inline-flex items-center gap-2">
      <span
        title={valid ? "Token válido" : "Token expirado/cancelado — não vale mais"}
        onClick={() => onCopy(token)}
        className={`inline-block w-28 cursor-pointer select-all rounded-lg border px-2.5 py-1.5 text-center font-mono text-sm font-semibold tracking-[0.18em] transition-colors duration-200 ${tone}`}
      >
        {revealed ? token : "••••••"}
      </span>
      <button
        type="button"
        aria-label={revealed ? "Ocultar token" : "Mostrar token"}
        title={revealed ? "Ocultar token" : "Mostrar token"}
        onClick={() => setRevealed((v) => !v)}
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border transition-colors duration-200 active:scale-[0.97] ${eyeTone}`}
      >
        {revealed ? (
          <svg
            className="h-4 w-4"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M1 8s2.5-4 7-4 7 4 7 4-2.5 4-7 4-7-4-7-4z" />
            <path d="M6.5 8a1.5 1.5 0 0 0 3 0 1.5 1.5 0 0 0-3 0z" />
          </svg>
        ) : (
          <svg
            className="h-4 w-4"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M1 8s2.5-4 7-4 7 4 7 4-2.5 4-7 4-7-4-7-4z" />
            <path d="M4 12l8-8" />
          </svg>
        )}
      </button>
    </div>
  );
}

function RowActionMenu({
  row,
  open,
  onToggle,
  loadingKey,
  onGenerate,
  onSend,
  onCancel,
  onRegenerate,
  onReprocess,
}: {
  row: AdminLeadRow;
  open: boolean;
  onToggle: () => void;
  loadingKey: string | null;
  onGenerate: (leadId: string) => void;
  onSend: (row: AdminLeadRow) => void;
  onCancel: (tokenId: string) => void;
  onRegenerate: (tokenId: string) => void;
  onReprocess: (leadId: string) => void;
}) {
  const hasToken = !!row.tokenId;
  const canReprocess =
    row.leadStatus === "analisado" ||
    row.leadStatus === "falha" ||
    row.leadStatus === "analise_pendente";

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
          {canReprocess && (
            <button
              role="menuitem"
              className="action-item"
              disabled={loadingKey === `reproc-${row.leadId}`}
              onClick={() => onReprocess(row.leadId)}
            >
              <svg className="h-3.5 w-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M13.5 8a5.5 5.5 0 1 1-1.6-3.9" />
                <path d="M13.5 2v2.5H11" />
              </svg>
              {loadingKey === `reproc-${row.leadId}` ? "Reprocessando..." : "Reprocessar análise"}
            </button>
          )}

          {!hasToken && (
            <button
              role="menuitem"
              className="action-item"
              disabled={loadingKey === `gen-${row.leadId}`}
              onClick={() => onGenerate(row.leadId)}
            >
              <svg className="h-3.5 w-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                <rect x="3" y="3" width="10" height="10" rx="2" />
                <path d="M8 5.5v5" />
                <path d="M5.5 8h5" />
              </svg>
              {loadingKey === `gen-${row.leadId}` ? "Gerando..." : "Gerar token"}
            </button>
          )}

          {hasToken && (
            <>
              <button
                role="menuitem"
                className="action-item"
                disabled={loadingKey === `send-${row.tokenId}` || row.tokenStatus !== "disponivel"}
                onClick={() => onSend(row)}
              >
                <svg className="h-3.5 w-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M1 8l13-6-5 12-2-5z" />
                  <path d="M7 9l7-7" />
                </svg>
                {loadingKey === `send-${row.tokenId}` ? "Enviando..." : "Enviar"}
              </button>
              <button
                role="menuitem"
                className="action-item"
                disabled={loadingKey === `regen-${row.tokenId}`}
                onClick={() => onRegenerate(row.tokenId!)}
              >
                <svg className="h-3.5 w-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M13.5 8a5.5 5.5 0 1 1-1.6-3.9" />
                  <path d="M13.5 2v2.5H11" />
                </svg>
                {loadingKey === `regen-${row.tokenId}` ? "Regenerando..." : "Regenerar"}
              </button>
              <button
                role="menuitem"
                className="action-item action-item--danger"
                disabled={loadingKey === `cancel-${row.tokenId}`}
                onClick={() => onCancel(row.tokenId!)}
              >
                <svg className="h-3.5 w-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M3 4h10" />
                  <path d="M6 4V2h4v2" />
                  <path d="M4 4l1 10h6l1-10" />
                </svg>
                {loadingKey === `cancel-${row.tokenId}` ? "Cancelando..." : "Cancelar"}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
