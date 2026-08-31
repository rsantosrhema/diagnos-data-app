import type {
  AnalysisQueueJob,
  AnalysisQueueRepository,
  AnalysisQueueStats,
  EnqueueResult,
} from "@/lib/repository/analysis-queue-repo";
import type { MarketInsightsRepository } from "@/lib/repository/market-insights-repo";
import type { AgentPayload } from "@/lib/screener/agent-payload";
import type {
  MarketResearch,
  MarketAnalysis,
  InsightsBrief,
} from "@/lib/agents/types";
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
  orchestrator: {
    research(payload: AgentPayload): Promise<MarketResearch>;
    analyst(input: {
      research: MarketResearch;
      payload: AgentPayload;
    }): Promise<MarketAnalysis>;
    writer(input: {
      analysis: MarketAnalysis;
      payload: AgentPayload;
    }): Promise<InsightsBrief>;
  };
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

interface AgentOutput {
  research: MarketResearch;
  analysis: MarketAnalysis;
  insights: InsightsBrief;
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

  async function requeueWithLock(msgId: string, leadId: string): Promise<boolean> {
    // Lock de in-flight + retry atômico (transação SQL + lock_row):
    // apenas um worker devolve a mensagem à fila. Retorna true se outro worker
    // já fez o requeue (este processamento deve encerrar sem efeitos).
    try {
      const { alreadyRetried } = await queueRepo.resetReadCount(msgId);
      return alreadyRetried;
    } catch (reqErr) {
      console.error(
        `[analysis-service] falha ao requeue do job ${msgId} do lead ${leadId}:`,
        reqErr,
      );
      // Sem garantia de requeue: devolve a mensagem à fila pelo mecanismo de
      // visibility timeout (set_vt) como última alternativa, mas nunca dispara
      // e-mail duplicado a partir daqui.
      try {
        await queueRepo.requeue(msgId);
      } catch (vtErr) {
        console.error(
          `[analysis-service] falha no fallback de requeue do job ${msgId} do lead ${leadId}:`,
          vtErr,
        );
      }
      return false;
    }
  }

  async function logEventSafe(
    leadId: string,
    step: "failed",
    message: string,
    durationMs?: number,
  ): Promise<void> {
    try {
      await insightsRepo.logEvent(leadId, step, message, durationMs);
    } catch (logErr) {
      console.error(
        `[analysis-service] falha ao registrar evento ${step} do lead ${leadId}:`,
        logErr,
      );
    }
  }

  async function sendAnalysisEmail(opts: {
    leadId: string;
    payload: AgentPayload | null;
    output?: AgentOutput;
  }): Promise<{ pdf: boolean; email: boolean }> {
    let pdfMs = 0;
    let emailMs = 0;
    let pdfOk = false;
    let emailOk = false;

    try {
      const pdfStart = Date.now();
      const pdfResult = await generatePdf(buildPdfInput(opts.payload!, opts.output));
      pdfMs = Date.now() - pdfStart;
      pdfOk = true;
      await insightsRepo.logEvent(opts.leadId, "pdf", undefined, pdfMs);

      const to = process.env.MANAGER_NOTIFICATION_EMAIL ?? "comercial@rhemadata.com";
      const emailStart = Date.now();
      await sendEmail({
        to,
        subject: `Diagnóstico de Maturidade — ${opts.payload!.solicitante.nome}`,
        html: `<p>Diagnóstico recebido de <strong>${escapeHtml(opts.payload!.solicitante.nome)}</strong> (${escapeHtml(opts.payload!.solicitante.cargo)}).</p><p>Faixa: <strong>${escapeHtml(opts.payload!.score.faixa)}</strong></p>`,
        attachment: { filename: pdfResult.filename, content: pdfResult.pdf },
      });
      emailMs = Date.now() - emailStart;
      emailOk = true;
      await insightsRepo.logEvent(opts.leadId, "email", undefined, emailMs);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "erro desconhecido";
      const step = pdfOk ? "email_failed" : "pdf_failed";
      console.error(
        `[analysis-service] ${pdfOk ? "falha ao enviar e-mail" : "falha ao gerar PDF"} do relatório para lead ${opts.leadId}:`,
        message,
      );
      try {
        await insightsRepo.logEvent(
          opts.leadId,
          step,
          message,
          step === "email_failed" ? emailMs || undefined : pdfMs || undefined,
        );
      } catch (logErr) {
        console.error(
          `[analysis-service] falha ao registrar evento ${step} do lead ${opts.leadId}:`,
          logErr,
        );
      }
    }

    return { pdf: pdfOk, email: emailOk };
  }

  return {
    async enqueue(leadId: string): Promise<EnqueueResult> {
      return queueRepo.enqueue(leadId);
    },

    async failStale(maxAgeMinutes: number): Promise<number> {
      return queueRepo.failStale(maxAgeMinutes);
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

        const emailResult = await sendAnalysisEmail({ leadId, payload, output });

        const totalMs = Date.now() - pipelineStart;
        if (emailResult.pdf) {
          await queueRepo.ack(job.msgId, leadId, "analisado", undefined, totalMs);
        } else {
          // PDF não foi produzido: relatório não existe → falha real + marcado
          // para reprocessamento manual.
          await queueRepo.ack(job.msgId, leadId, "falha", "Falha ao gerar o PDF do relatório", totalMs);
          try {
            await leadRepo.updateStatus(leadId, "analise_pendente");
          } catch (statusErr) {
            console.error(
              `[analysis-service] falha ao marcar lead ${leadId} como analise_pendente:`,
              statusErr,
            );
          }
        }

        return { processed: true };
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "erro desconhecido no pipeline";
        console.error(`[analysis-service] pipeline falhou para lead ${leadId}:`, message);
        const totalMs = Date.now() - pipelineStart;

        await logEventSafe(leadId, "failed", message, totalMs);

        let attempts = 0;
        try {
          const row = await insightsRepo.findByLeadId(leadId);
          attempts = row?.attempts ?? 0;
        } catch {
          /* tenta retry mesmo sem conseguir ler attempts */
        }

        if (attempts < 2) {
          // Retry único: devolve a mensagem à fila sem arquivar. O lead fica
          // 'pendente' para bloquear re-enfileiramento duplicado via admin.
          //
          // O e-mail de fallback NÃO é enviado aqui: o job ainda vai ser
          // reprocessado (possivelmente com sucesso) e o envio seria duplicado.
          // O e-mail só sai na falha definitiva (attempts >= 2), via
          // sendAnalysisEmail abaixo.
          const alreadyRetried = await requeueWithLock(job.msgId, leadId);
          if (alreadyRetried) {
            // Outro worker já devolveu esta mensagem à fila (o lock de
            // in-flight impediu a leitura dupla): não arquiva, não envia
            // e-mail, apenas encerra este processamento.
            return { processed: true };
          }

          try {
            await leadRepo.updateStatus(leadId, "analise_pendente");
          } catch (statusErr) {
            console.error(
              `[analysis-service] falha ao marcar lead ${leadId} como analise_pendente:`,
              statusErr,
            );
          }
          // Job devolvido à fila para nova tentativa (sem e-mail de fallback —
          // o envio só acontece na falha definitiva).
          try {
            await insightsRepo.logEvent(
              leadId,
              "requeue",
              "Job devolvido à fila para nova tentativa",
            );
          } catch (logErr) {
            console.error(
              `[analysis-service] falha ao registrar evento requeue do lead ${leadId}:`,
              logErr,
            );
          }
          return { processed: true };
        }

        // Falha definitiva após a(s) tentativa(s) de retry.
        try {
          await queueRepo.ack(job.msgId, leadId, "falha", message, totalMs);
        } catch (ackErr) {
          console.error(
            `[analysis-service] falha ao arquivar job ${job.msgId} do lead ${leadId}:`,
            ackErr,
          );
        }
        if (payload) {
          try {
            await leadRepo.updateStatus(leadId, "analise_pendente");
          } catch (statusErr) {
            console.error(
              `[analysis-service] falha ao marcar lead ${leadId} como analise_pendente:`,
              statusErr,
            );
          }
          // EMAIL-03: fallback — PDF básico (sem insights/analysis). O e-mail
          // só é enviado aqui, na falha definitiva, para nunca duplicar envio
          // em conjunto com um retry pendente na fila.
          await sendAnalysisEmail({ leadId, payload });
        }
        return { processed: true };
      }
    },

    async requeueWithLock(
      msgId: string,
      leadId: string,
    ): Promise<boolean> {
      // Lock de in-flight + retry atômico (transação SQL + lock_row):
      // apenas um worker devolve a mensagem à fila. Retorna true se outro
      // worker já fez o requeue desta mensagem.
      const { alreadyRetried } = await queueRepo.resetReadCount(msgId);
      return alreadyRetried;
    },
  };

  async function runPipelineWithLogs(payload: AgentPayload, leadId: string): Promise<AgentOutput> {
    let startedAt = Date.now();
    const research = await orchestrator.research(payload);
    await insightsRepo.logEvent(leadId, "researcher", undefined, Date.now() - startedAt);

    startedAt = Date.now();
    const analysis = await orchestrator.analyst({ research, payload });
    await insightsRepo.logEvent(leadId, "analyst", undefined, Date.now() - startedAt);

    startedAt = Date.now();
    const insights = await orchestrator.writer({ analysis, payload });
    await insightsRepo.logEvent(leadId, "writer", undefined, Date.now() - startedAt);

    return { research, analysis, insights };
  }
}
