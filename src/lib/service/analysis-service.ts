import type { AnalysisQueueRepository } from "@/lib/repository/analysis-queue-repo";
import type { EnqueueResult } from "@/lib/repository/analysis-queue-repo";
import type { MarketInsightsRepository } from "@/lib/repository/market-insights-repo";
import type { AgentPayload } from "@/lib/screener/agent-payload";
import type { AgentOutput } from "@/lib/agents/orchestrator";
import type { GeneratePdfInput } from "@/lib/service/screen-service";

export class AnalysisServiceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AnalysisServiceError";
  }
}

export interface SendReportEmailParams {
  to: string;
  subject: string;
  html: string;
  attachment: { filename: string; content: Buffer };
}

export interface AnalysisServiceDeps {
  queueRepo: AnalysisQueueRepository;
  insightsRepo: MarketInsightsRepository;
  orchestrator: { run(payload: AgentPayload): Promise<AgentOutput> };
  payloadLoader: (leadId: string) => Promise<AgentPayload | null>;
  leadRepo: { updateStatus(id: string, status: string): Promise<void> };
  generatePdf: (input: GeneratePdfInput) => Promise<{ pdf: Buffer; filename: string }>;
  sendEmail: (params: SendReportEmailParams) => Promise<void>;
}

function buildPdfInput(payload: AgentPayload, output?: AgentOutput): GeneratePdfInput {
  const dims = payload.respostas.map((r) => ({
    name: r.dimensao,
    nivel: r.nivel,
    peso: r.peso,
  }));
  const riskDim = payload.respostas.find(
    (r) => r.dimensao_id === payload.risco.dimensao_id,
  );
  return {
    respondentName: payload.solicitante.nome,
    band: { rotulo: payload.score.faixa, descricao: payload.score.descricao },
    dimensionScores: dims,
    riskDimension: { name: riskDim?.dimensao ?? "Dimensão", nivel: payload.risco.nivel },
    imbalance: payload.desequilibrio,
    commercialAnswer: payload.resposta_comercial.resposta,
    ...(output ? { analysis: output.analysis, insights: output.insights } : {}),
  };
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function createAnalysisService(deps: AnalysisServiceDeps) {
  const { queueRepo, insightsRepo, orchestrator, payloadLoader, leadRepo, generatePdf, sendEmail } = deps;

  async function sendAnalysisEmail(opts: {
    leadId: string;
    payload: AgentPayload;
    output?: AgentOutput;
  }): Promise<void> {
    try {
      const pdfResult = await generatePdf(buildPdfInput(opts.payload, opts.output));
      const to = process.env.MANAGER_NOTIFICATION_EMAIL ?? "comercial@rhemadata.com";
      await sendEmail({
        to,
        subject: `Diagnóstico de Maturidade — ${opts.payload.solicitante.nome}`,
        html: `<p>Diagnóstico recebido de <strong>${escapeHtml(opts.payload.solicitante.nome)}</strong> (${escapeHtml(opts.payload.solicitante.cargo)}).</p><p>Faixa: <strong>${escapeHtml(opts.payload.score.faixa)}</strong></p>`,
        attachment: { filename: pdfResult.filename, content: pdfResult.pdf },
      });
    } catch (err) {
      // EMAIL-04: falha de e-mail não derruba o worker nem muda o status
      console.error(
        `[analysis-service] falha ao enviar e-mail do relatório para lead ${opts.leadId}:`,
        err instanceof Error ? err.message : err,
      );
    }
  }

  return {
    async enqueue(leadId: string): Promise<EnqueueResult> {
      return queueRepo.enqueue(leadId);
    },

    async processNext(): Promise<{ processed: boolean }> {
      let job;
      try {
        job = await queueRepo.read();
      } catch (err) {
        // infra: fila indisponível — não derruba o worker
        console.error("[analysis-service] falha ao ler job:", err);
        return { processed: false };
      }

      if (!job) return { processed: false };

      const leadId = job.leadId;
      let payload: AgentPayload | null = null;
      const pipelineStart = Date.now();

      try {
        payload = await payloadLoader(leadId);
        if (!payload) {
          const ackMs = Date.now() - pipelineStart;
          await insightsRepo.logEvent(leadId, "failed", "agent_payload não encontrado para o lead");
          await queueRepo.ack(job.msgId, leadId, "falha", "agent_payload não encontrado para o lead", ackMs);
          return { processed: true };
        }

        const output = await runPipelineWithLogs(payload, leadId);
        await insightsRepo.upsert({
          leadId,
          research: output.research,
          analysis: output.analysis,
          insights: output.insights,
          sources: output.research.sources,
          status: "analisado",
        });

        const totalMs = Date.now() - pipelineStart;
        await insightsRepo.logEvent(leadId, "pdf", undefined, totalMs);
        await insightsRepo.logEvent(leadId, "email", undefined, totalMs);
        await queueRepo.ack(job.msgId, leadId, "analisado", undefined, totalMs);

        // EMAIL-02: e-mail com PDF enriquecido após a análise
        await sendAnalysisEmail({ leadId, payload, output });

        return { processed: true };
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "erro desconhecido no pipeline";
        console.error(`[analysis-service] pipeline falhou para lead ${leadId}:`, message);
        const totalMs = Date.now() - pipelineStart;
        try {
          await insightsRepo.logEvent(leadId, "failed", message, totalMs);
        } catch (logErr) {
          console.error(
            `[analysis-service] falha ao registrar evento failed do lead ${leadId}:`,
            logErr,
          );
        }
        try {
          await queueRepo.ack(job.msgId, leadId, "falha", message, totalMs);
        } catch (ackErr) {
          console.error(
            `[analysis-service] falha ao arquivar job ${job.msgId} do lead ${leadId}:`,
            ackErr,
          );
        }
        // EMAIL-03: fallback — PDF básico + lead marcado para reprocessamento
        if (payload) {
          try {
            await leadRepo.updateStatus(leadId, "analise_pendente");
          } catch (statusErr) {
            console.error(
              `[analysis-service] falha ao marcar lead ${leadId} como analise_pendente:`,
              statusErr,
            );
          }
          await sendAnalysisEmail({ leadId, payload });
        }
        return { processed: true };
      }
    },
  };

  async function runPipelineWithLogs(payload: AgentPayload, leadId: string): Promise<AgentOutput> {
    const startedAt = Date.now();
    const output = await orchestrator.run(payload);
    const stageMs = Math.round((Date.now() - startedAt) / 3);
    await insightsRepo.logEvent(leadId, "researcher", undefined, stageMs);
    await insightsRepo.logEvent(leadId, "analyst", undefined, stageMs);
    await insightsRepo.logEvent(leadId, "writer", undefined, stageMs);
    return output;
  }
}
