"use client";

import { useState, useEffect, useCallback } from "react";
import { PageShell, Toolbar, SiteFooter, Icon } from "../../components/PageShell";
import { cancelReport, generateReport, getAdminDashboard } from "@/lib/api/client";
import {
  AnalysisBadge,
  KpiCard,
  LogStepLabel,
  formatDuration,
  formatTime,
  isLogErrorStep,
} from "../components";

export default function AdminFilaPage() {
  const [data, setData] = useState<Awaited<ReturnType<typeof getAdminDashboard>> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [busyLeadId, setBusyLeadId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getAdminDashboard();
      setData(result);
      setLastRefresh(new Date());
      setError(null);
    } catch {
      setError("Não foi possível carregar a fila de relatórios.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  async function runAction(leadId: string, action: (id: string) => Promise<unknown>, failMsg: string) {
    setBusyLeadId(leadId);
    try {
      await action(leadId);
      await loadData();
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : failMsg);
    } finally {
      setBusyLeadId(null);
    }
  }

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

  const statusDot = (step: string) => {
    if (isLogErrorStep(step)) return "bg-[#b23a34]";
    if (["started", "researcher", "analyst", "writer"].includes(step)) return "bg-[#2f6fa8]";
    if (["enqueued", "requeue"].includes(step)) return "bg-[#a9741a]";
    return "bg-[#2e7d57]";
  };

  return (
    <PageShell as="div">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[60] focus:rounded-full focus:bg-[#4a2c7d] focus:px-4 focus:py-2 focus:text-sm focus:text-white"
      >
        Pular para o conteúdo
      </a>

      <Toolbar>
        <a href="/admin" className="rd-link flex items-center gap-2">
          <Icon name="arrowLeft" size={13} /> Voltar ao painel
        </a>
      </Toolbar>

      <main id="main-content" className="rd-container flex-1 pt-14">
        <p className="rd-eyebrow inline-flex items-center gap-2 rounded-full border border-[#1d1d1f1f] bg-white px-3 py-1.5">
          <Icon name="list" size={12} className="text-[#4a2c7d]" /> Diagnos Data · Gerencial
        </p>
        <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="rd-h text-[40px] leading-tight">Fila de relatórios</h1>
            <p className="mt-3 text-[15px] text-[#6e6e73]">
              Acompanhe em que etapa cada relatório está, o estado da fila e o histórico de processamento.
            </p>
          </div>
          <div className="flex items-center gap-3">
            {lastUpdate && <span className="text-xs text-[#707077]">Atualizado às {lastUpdate}</span>}
            <button onClick={() => void loadData()} disabled={loading} className="rd-btn-ghost">
              <Icon name="refresh" size={13} /> {loading ? "Carregando..." : "Atualizar"}
            </button>
          </div>
        </div>

        {error && (
          <div role="alert" className="mt-6 rounded-2xl bg-[#f9eae8] px-4 py-3 text-sm text-[#b23a34]">
            {error}
          </div>
        )}

        {kpis && (
          <div className="rd-card mt-8 grid grid-cols-2 lg:grid-cols-4">
            <KpiCard label="Na fila" value={kpis.relatoriosPendentes} />
            <KpiCard label="Em processamento" value={kpis.relatoriosEmProcessamento} />
            <KpiCard label="Concluídos" value={queue?.analisado ?? 0} />
            <KpiCard label="Com falha" value={kpis.relatoriosFalha} />
          </div>
        )}

        <section className="rd-card mt-4 overflow-hidden">
          <div className="px-6 pb-2 pt-5">
            <h2 className="rd-h text-base">Fila de relatórios</h2>
          </div>
          <div className="overflow-x-auto">
            {loading && !data ? (
              <div className="px-6 py-10 text-center text-sm text-[#6e6e73]">Carregando…</div>
            ) : queueRows.length === 0 ? (
              <div className="px-6 py-10 text-center text-sm text-[#6e6e73]">
                Nenhum relatório aguardando, em processamento ou com falha.
              </div>
            ) : (
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="border-b border-[#1d1d1f1f]">
                    {["Cliente", "Status", "Na fila desde", "Tempo na fila", "Tentativas", "Erro", "Ações"].map((h) => (
                      <th key={h} className="rd-th px-6">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {queueRows.map((r) => (
                    <tr key={r.leadId} className="border-b border-[#1d1d1f12] last:border-0">
                      <td className="px-6 py-3.5 font-medium text-[#1d1d1f]">{r.name}</td>
                      <td className="px-6 py-3.5"><AnalysisBadge status={r.analysisStatus} /></td>
                      <td className="px-6 py-3.5 text-[#6e6e73]">{formatTime(r.analysisQueuedAt)}</td>
                      <td className="px-6 py-3.5 tabular-nums text-[#6e6e73]">{formatDuration(r.ageSeconds)}</td>
                      <td className="px-6 py-3.5 tabular-nums text-[#6e6e73]">{r.attempts}</td>
                      <td className="px-6 py-3.5">
                        {r.analysisStatus === "falha" && r.errorMessage ? (
                          <span title={r.errorMessage} className="inline-block max-w-[240px] cursor-help truncate text-xs text-[#b23a34]">
                            {r.errorMessage}
                          </span>
                        ) : (
                          <span className="text-xs text-[#707077]">—</span>
                        )}
                      </td>
                      <td className="px-6 py-3.5">
                        {r.analysisStatus === "falha" ? (
                          <button
                            type="button"
                            className="text-xs font-medium text-[#1d1d1f] underline disabled:opacity-50"
                            disabled={busyLeadId === r.leadId}
                            onClick={() => runAction(r.leadId, generateReport, "Não foi possível reprocessar")}
                          >
                            Reprocessar
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="text-xs font-medium text-[#b23a34] underline disabled:opacity-50"
                            disabled={busyLeadId === r.leadId}
                            onClick={() => runAction(r.leadId, cancelReport, "Não foi possível parar o processamento")}
                          >
                            Parar
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>

        <section className="rd-card mt-4 overflow-hidden">
          <div className="flex items-center justify-between border-b border-[#1d1d1f1f] px-6 py-5">
            <h2 className="rd-h text-base">Log de processamentos</h2>
            <span className="rd-eyebrow">Últimos {logs.length} eventos</span>
          </div>
          {logs.length === 0 ? (
            <div className="px-6 py-10 text-center text-sm text-[#6e6e73]">Nenhum evento registrado ainda.</div>
          ) : (
            <ul className="max-h-[520px] divide-y divide-[#1d1d1f12] overflow-y-auto">
              {logs.map((log, i) => (
                <li key={`${log.leadId}-${log.createdAt}-${i}`} className="flex items-start gap-3 px-6 py-3">
                  <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${statusDot(log.step)}`} aria-hidden />
                  <div className="min-w-0">
                    <p className="text-[13px] text-[#6e6e73]">
                      <span className="font-medium text-[#1d1d1f]">{log.leadName ?? "Lead"}</span>
                      <span> · </span>
                      <LogStepLabel step={log.step} />
                    </p>
                    {log.message && isLogErrorStep(log.step) && (
                      <p className="mt-0.5 text-xs text-[#b23a34]">{log.message}</p>
                    )}
                  </div>
                  <span className="ml-auto shrink-0 text-xs tabular-nums text-[#707077]">
                    {formatTime(log.createdAt)}
                    {log.durationMs != null && ` · ${formatDuration(Math.round(log.durationMs / 1000))}`}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>

      <SiteFooter />
    </PageShell>
  );
}
