import type { LeadRepository } from "@/lib/repository/lead-repo";
import type { AssessmentRepository } from "@/lib/repository/assessment-repo";
import type { MarketInsightsRepository } from "@/lib/repository/market-insights-repo";
import type { AnalysisQueueRepository } from "@/lib/repository/analysis-queue-repo";
import type {
  AdminDashboardResponseDTO,
  AdminLeadRowDTO,
  AdminKpisDTO,
  AdminLogEntryDTO,
  AdminQueueStatsDTO,
} from "@/lib/dto/admin";
import type { MarketInsightsStatus } from "@/lib/repository/market-insights-repo";

export class AdminServiceError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "AdminServiceError";
  }
}

const ENQUEUEABLE_STATUSES = new Set([
  "concluido",
  "analisado",
  "falha",
  "analise_pendente",
]);

export function createAdminService(deps: {
  leadRepo: LeadRepository;
  assessmentRepo: AssessmentRepository;
  marketInsightsRepo: MarketInsightsRepository;
  queueRepo: AnalysisQueueRepository;
  logLoader: (limit: number) => Promise<AdminLogEntryDTO[]>;
  analysisService: { enqueue(leadId: string): Promise<{ ok: boolean; queued: boolean }> };
}) {
  const { leadRepo, assessmentRepo, marketInsightsRepo, queueRepo, logLoader, analysisService } = deps;

  return {
    async getDashboard(): Promise<AdminDashboardResponseDTO> {
      const leads = await leadRepo.findAll();
      const [assessments, insights, queueStats, logs] = await Promise.all([
        Promise.all(leads.map((l) => assessmentRepo.existsForLead(l.id))),
        Promise.all(leads.map((l) => marketInsightsRepo.findByLeadId(l.id))),
        queueRepo.stats(),
        logLoader(50),
      ]);

      const rows: AdminLeadRowDTO[] = leads.map((lead, i) => {
        const insight = insights[i];
        const queuedAt = insight?.queued_at ?? null;
        const ageSeconds =
          queuedAt && insight?.status !== "analisado" && insight?.status !== "falha"
            ? Math.max(0, Math.round((Date.now() - new Date(queuedAt).getTime()) / 1000))
            : null;
        return {
          leadId: lead.id,
          name: lead.name,
          company: lead.company,
          email: lead.email,
          leadStatus: lead.status,
          hasDiagnostic: assessments[i],
          analysisStatus: insight ? (insight.status as MarketInsightsStatus) : null,
          analysisUpdatedAt: insight ? insight.updated_at : null,
          analysisQueuedAt: insight ? insight.queued_at : null,
          processingStartedAt: insight ? insight.processing_started_at : null,
          attempts: insight ? insight.attempts : 0,
          errorMessage: insight ? insight.error : null,
          ageSeconds,
        };
      });

      const kpis: AdminKpisDTO = {
        leadsTotal: leads.length,
        diagnosticosConcluidos: rows.filter((r) => r.hasDiagnostic).length,
        relatoriosPendentes: rows.filter(
          (r) => r.analysisStatus === "pendente" || r.analysisStatus === "processando",
        ).length,
        relatoriosFalha: rows.filter((r) => r.analysisStatus === "falha").length,
        relatoriosEmProcessamento: rows.filter((r) => r.analysisStatus === "processando").length,
      };

      const queue: AdminQueueStatsDTO = {
        queueLength: queueStats.queueLength,
        oldestAgeSec: queueStats.oldestAgeSec,
        pendente: queueStats.pendente,
        processando: queueStats.processando,
        analisado: queueStats.analisado,
        falha: queueStats.falha,
      };

      return { kpis, rows, queue, logs };
    },

    async generateReport(leadId: string): Promise<{ ok: true; queued: true }> {
      const lead = await leadRepo.findById(leadId);
      if (!lead) {
        throw new AdminServiceError("Lead não encontrado ou sem diagnóstico", 400);
      }

      const hasDiagnostic = await assessmentRepo.existsForLead(leadId);
      if (!hasDiagnostic) {
        throw new AdminServiceError("Lead não encontrado ou sem diagnóstico", 400);
      }

      if (!ENQUEUEABLE_STATUSES.has(lead.status)) {
        throw new AdminServiceError("Lead sem relatório gerável", 400);
      }

      const enqueued = await analysisService.enqueue(leadId);
      if (!enqueued.queued) {
        throw new AdminServiceError(
          "Relatório já está na fila ou em processamento",
          409,
        );
      }
      return { ok: true, queued: true };
    },
  };
}
