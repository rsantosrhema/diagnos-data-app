/**
 * Drena a fila de relatórios chamando POST /api/analysis-worker.
 *
 * Fallback local para o Vercel Cron: roda o mesmo pipeline de agentes/PDF/email
 * sem depender de deploy na Vercel. Pode ser chamado manualmente ou por um
 * agendador do SO (ex.: Windows Task Scheduler a cada 5 min).
 *
 * Uso:
 *   npm run worker:run            # processa até 5 jobs agora
 *   npm run worker:watch          # loop infinito a cada 5 min
 *
 * O worker é autenticado com o header x-internal-api-key (vem de .env.local).
 * Se o servidor não estiver rodando, o script loga e sai com código 1.
 */
require("dotenv").config({ path: ".env.local" });

const MIN_INTERVAL_MS = 5 * 60 * 1000;

function getBaseUrl() {
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
}

function getInternalKey() {
  const key = process.env.INTERNAL_API_KEY;
  if (!key) throw new Error("INTERNAL_API_KEY não configurada no .env.local");
  return key;
}

async function runOnce() {
  const base = getBaseUrl();
  const url = `${base.replace(/\/$/, "")}/api/analysis-worker`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "x-internal-api-key": getInternalKey() },
  });
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(
      `worker respondeu ${res.status}: ${body?.error ?? JSON.stringify(body)}`,
    );
  }
  return body;
}

async function main() {
  const mode = process.argv[2] ?? "once";

  if (mode === "once") {
    const result = await runOnce();
    const now = new Date().toISOString();
    console.log(
      `[worker-cron] ${now} ok=true processed=${result.processed ?? 0} staleFailed=${result.staleFailed ?? 0}`,
    );
    return;
  }

  if (mode === "watch") {
    // Loop contínuo — substitui o Vercel Cron em ambiente local/produção sem Vercel.
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const started = Date.now();
      try {
        const result = await runOnce();
        const now = new Date().toISOString();
        console.log(
          `[worker-cron] ${now} ok=true processed=${result.processed ?? 0} staleFailed=${result.staleFailed ?? 0}`,
        );
      } catch (err) {
        const now = new Date().toISOString();
        console.error(`[worker-cron] ${now} erro: ${err instanceof Error ? err.message : err}`);
      }
      const elapsed = Date.now() - started;
      const wait = Math.max(0, MIN_INTERVAL_MS - elapsed);
      await new Promise((r) => setTimeout(r, wait));
    }
  }

  throw new Error(`modo desconhecido: ${mode} (use "once" ou "watch")`);
}

main().catch((err) => {
  console.error(
    `[worker-cron] erro fatal: ${err instanceof Error ? err.message : err}`,
  );
  process.exit(1);
});
