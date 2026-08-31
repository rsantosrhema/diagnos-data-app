"use client";

import { useState, useEffect, useCallback } from "react";
import { RhemaLogo } from "../../components/RhemaLogo";
import { WaveDivider } from "../../components/WaveDivider";
import { supabase } from "@/lib/supabase/browser";
import { getAdminDashboard } from "@/lib/api/client";
import {
  AnalysisBadge,
  KpiCard,
  LogStepLabel,
  Reveal,
  formatDuration,
  formatTime,
  isLogErrorStep,
} from "../components";

export default function AdminFilaPage() {
  const [data, setData] = useState<Awaited<ReturnType<typeof getAdminDashboard>> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const getAuthToken = useCallback(async (): Promise<string | null> => {
    const { data: session } = await supabase.auth.getSession();
    return session.session?.access_token ?? null;
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const token = await getAuthToken();
      if (!token) return;
      const result = await getAdminDashboard(token);
      setData(result);
      setLastRefresh(new Date());
      setError(null);
    } catch {
      setError("Não foi possível carregar a fila de relatórios.");
    } finally {
      setLoading(false);
    }
  }, [getAuthToken]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  useEffect(() => {
    if (!data) return;
    const hasActive = data.rows.some(
      (r) => r.analysisStatus === "pendente" || r.analysisStatus === "processando",
    );
    if (!hasActive) return;
    const id = setInterval(loadData, 15000);
    return () => clearInterval(id);
  }, [data, loadData]);

  const rows = data?.rows ?? [];
  const queueRows = rows.filter(
    (r) =>
      r.analysisStatus === "pendente" ||
      r.analysisStatus === "processando" ||
      r.analysisStatus === "falha",
  );
  const kpis = data?.kpis;
  const queue = data?.queue;
  const logs = data?.logs ?? [];

  const lastUpdate = lastRefresh
    ? lastRefresh.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })
    : null;

  return (
    <main className="flex min-h-screen flex-col">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[60] focus:rounded-full focus:bg-rhema-primary focus:px-4 focus:py-2 focus:text-sm focus:text-white"
      >
        Pular para o conteúdo
      </a>

      <header className="bg-rhema-institutional">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <a href="/admin">
            <RhemaLogo variant="dark" width={140} />
          </a>
          <div className="flex items-center gap-6">
            <a
              href="/admin"
              className="hidden font-poppins text-sm font-medium text-white/70 transition-colors hover:text-white md:inline-block"
            >
              Voltar ao painel
            </a>
          </div>
        </div>
      </header>

      <section className="bg-rhema-institutional relative overflow-hidden">
        <div className="mx-auto max-w-7xl px-6 pb-16 pt-12 md:pb-20 md:pt-16">
          <p className="mb-3 font-poppins text-sm font-medium uppercase tracking-wide text-rhema-lavender">
            Diagnos Data · Gerencial
          </p>
          <h1 className="font-poppins text-3xl font-bold text-white md:text-4xl">
            Fila de relatórios
          </h1>
          <p className="mt-4 max-w-xl font-inter text-base leading-relaxed text-rhema-lavender/80">
            Acompanhe em que etapa cada relatório está, o estado da fila e o
            histórico de processamento.
          </p>
        </div>
        <WaveDivider color="var(--color-rhema-offwhite)" />
      </section>

      <main id="main-content" className="bg-rhema-offwhite -mt-1 flex-1">
        <div className="mx-auto max-w-7xl px-6 pb-24 pt-10 md:pt-14">
          {error && (
            <div
              role="alert"
              className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 font-inter text-sm text-red-700"
            >
              {error}
            </div>
          )}

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => void loadData()}
                disabled={loading}
                className="btn-primary"
              >
                {loading ? "Carregando..." : "Atualizar"}
              </button>
              {lastUpdate && (
                <span className="font-mono text-[11px] uppercase tracking-wider text-rhema-dark/40">
                  Atualizado às {lastUpdate}
                </span>
              )}
            </div>
          </div>

          {kpis && (
            <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Reveal delay={0}>
                <KpiCard label="Na fila" value={kpis.relatoriosPendentes} tone="amber" />
              </Reveal>
              <Reveal delay={1}>
                <KpiCard label="Em processamento" value={kpis.relatoriosEmProcessamento} tone="primary" />
              </Reveal>
              <Reveal delay={2}>
                <KpiCard label="Concluídos" value={queue?.analisado ?? 0} tone="green" />
              </Reveal>
              <Reveal delay={3}>
                <KpiCard label="Com falha" value={kpis.relatoriosFalha} tone="red" />
              </Reveal>
            </div>
          )}

          <Reveal delay={4}>
            <div className="card mt-8 overflow-hidden">
              <div className="flex items-center justify-between border-b border-rhema-lavender-light px-6 py-4">
                <h2 className="font-poppins text-lg font-semibold text-rhema-institutional">
                  Fila de relatórios
                </h2>
                <span className="font-mono text-[11px] uppercase tracking-wider text-rhema-dark/50">
                  {queue?.pendente ?? 0} na fila · {queue?.processando ?? 0} processando ·{" "}
                  {queue?.analisado ?? 0} concluídos · {queue?.falha ?? 0} falhas · profundidade{" "}
                  {queue?.queueLength ?? 0}
                </span>
              </div>

              <div className="overflow-x-auto">
                {loading && !data ? (
                  <div className="px-6 py-10 text-center font-inter text-sm text-rhema-dark/60">
                    Carregando…
                  </div>
                ) : queueRows.length === 0 ? (
                  <div className="px-6 py-10 text-center font-inter text-sm text-rhema-dark/60">
                    Nenhum relatório aguardando, em processamento ou com falha.
                  </div>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-rhema-lavender-light bg-rhema-lavender-light/30">
                        {["Cliente", "Status", "Na fila desde", "Tempo na fila", "Tentativas", "Erro"].map(
                          (h) => (
                            <th
                              key={h}
                              className="px-6 py-3 text-left font-poppins text-xs font-medium text-rhema-dark/60"
                            >
                              {h}
                            </th>
                          ),
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {queueRows.map((r) => (
                        <tr
                          key={r.leadId}
                          className="border-b border-rhema-lavender-light/50 last:border-0"
                        >
                          <td className="px-6 py-3.5 font-inter font-medium text-rhema-dark">
                            {r.name}
                          </td>
                          <td className="px-6 py-3.5">
                            <AnalysisBadge status={r.analysisStatus} />
                          </td>
                          <td className="px-6 py-3.5 font-inter text-rhema-dark/70">
                            {formatTime(r.analysisQueuedAt)}
                          </td>
                          <td className="px-6 py-3.5 font-inter text-rhema-dark/70 tabular-nums">
                            {formatDuration(r.ageSeconds)}
                          </td>
                          <td className="px-6 py-3.5 font-inter text-rhema-dark/70 tabular-nums">
                            {r.attempts}
                          </td>
                          <td className="px-6 py-3.5">
                            {r.analysisStatus === "falha" && r.errorMessage ? (
                              <span
                                title={r.errorMessage}
                                className="inline-block max-w-[240px] cursor-help truncate font-inter text-xs text-red-700"
                              >
                                {r.errorMessage}
                              </span>
                            ) : (
                              <span className="font-inter text-xs text-rhema-dark/40">—</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </Reveal>

          <Reveal delay={5}>
            <div className="card mt-8 overflow-hidden">
              <div className="flex items-center justify-between border-b border-rhema-lavender-light px-6 py-4">
                <h2 className="font-poppins text-lg font-semibold text-rhema-institutional">
                  Log de processamentos
                </h2>
                <span className="font-mono text-[11px] uppercase tracking-wider text-rhema-dark/50">
                  últimos {logs.length} eventos
                </span>
              </div>

              {logs.length === 0 ? (
                <div className="px-6 py-10 text-center font-inter text-sm text-rhema-dark/60">
                  Nenhum evento registrado ainda.
                </div>
              ) : (
                <div className="max-h-[520px] overflow-y-auto">
                  <ul className="divide-y divide-rhema-lavender-light/50">
                    {logs.map((log, i) => (
                      <li
                        key={`${log.leadId}-${log.createdAt}-${i}`}
                        className="flex items-start gap-3 px-6 py-3"
                      >
                        <span
                          className="mt-1 flex h-2 w-2 shrink-0 rounded-full bg-rhema-primary/60"
                          aria-hidden
                        />
                        <div className="min-w-0">
                          <p className="font-inter text-sm text-rhema-dark">
                            <span className="font-medium">{log.leadName ?? "Lead"}</span>
                            <span className="text-rhema-dark/50"> · </span>
                            <LogStepLabel step={log.step} />
                          </p>
                          {log.message && isLogErrorStep(log.step) && (
                            <p className="mt-0.5 font-inter text-xs text-red-700">{log.message}</p>
                          )}
                        </div>
                        <span className="ml-auto shrink-0 font-mono text-[11px] tabular-nums text-rhema-dark/50">
                          {formatTime(log.createdAt)}
                          {log.durationMs != null &&
                            ` · ${formatDuration(Math.round(log.durationMs / 1000))}`}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </Reveal>
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
    </main>
  );
}
