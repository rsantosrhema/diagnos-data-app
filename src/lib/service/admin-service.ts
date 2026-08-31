import type { LeadRepository } from "@/lib/repository/lead-repo";
import type { AssessmentRepository } from "@/lib/repository/assessment-repo";
import type { MarketInsightsRepository } from "@/lib/repository/market-insights-repo";
import type {
  AdminDashboardResponseDTO,
  AdminLeadRowDTO,
  AdminKpisDTO,
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
  analysisService: { enqueue(leadId: string): Promise<void> };
}) {
  const { leadRepo, assessmentRepo, marketInsightsRepo, analysisService } = deps;

  return {
    async getDashboard(): Promise<AdminDashboardResponseDTO> {
      const leads = await leadRepo.findAll();
      const [assessments, insights] = await Promise.all([
        Promise.all(leads.map((l) => assessmentRepo.existsForLead(l.id))),
        Promise.all(leads.map((l) => marketInsightsRepo.findByLeadId(l.id))),
      ]);

      const rows: AdminLeadRowDTO[] = leads.map((lead, i) => {
        const insight = insights[i];
        return {
          leadId: lead.id,
          name: lead.name,
          company: lead.company,
          email: lead.email,
          leadStatus: lead.status,
          hasDiagnostic: assessments[i],
          analysisStatus: insight ? (insight.status as MarketInsightsStatus) : null,
          analysisUpdatedAt: insight ? insight.updated_at : null,
        };
      });

      const kpis: AdminKpisDTO = {
        leadsTotal: leads.length,
        diagnosticosConcluidos: rows.filter((r) => r.hasDiagnostic).length,
        relatoriosPendentes: rows.filter(
          (r) => r.analysisStatus === "pendente" || r.analysisStatus === "processando",
        ).length,
        relatoriosFalha: rows.filter((r) => r.analysisStatus === "falha").length,
      };

      return { kpis, rows };
    },

    async generateReport(leadId: string): Promise<{ ok: true }> {
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

      await analysisService.enqueue(leadId);
      return { ok: true };
    },
  };
}
