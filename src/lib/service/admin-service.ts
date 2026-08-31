import type { TokenRepository } from "@/lib/repository/token-repo";
import type { LeadRepository } from "@/lib/repository/lead-repo";
import type { AssessmentRepository } from "@/lib/repository/assessment-repo";
import type { AdminTokensResponseDTO, AdminLeadRowDTO, AdminKpisDTO } from "@/lib/dto/admin";

export class AdminServiceError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "AdminServiceError";
  }
}

const REPROCESSABLE_STATUSES = ["analisado", "falha", "analise_pendente"];

export function createAdminService(deps: {
  tokenRepo: TokenRepository;
  leadRepo: LeadRepository;
  assessmentRepo: AssessmentRepository;
  analysisService: { enqueue(leadId: string): Promise<void> };
}) {
  const { tokenRepo, leadRepo, assessmentRepo, analysisService } = deps;

  return {
    async getTokensDashboard(): Promise<AdminTokensResponseDTO> {
      await tokenRepo.markExpiredTokens();

      const [leads, tokens] = await Promise.all([
        leadRepo.findAll(),
        tokenRepo.findAll(),
      ]);

      const latestTokenByLead = new Map<string, (typeof tokens)[number]>();
      for (const t of tokens) {
        if (!latestTokenByLead.has(t.lead_id)) latestTokenByLead.set(t.lead_id, t);
      }

      const now = Date.now();
      const rows: AdminLeadRowDTO[] = leads.map((lead) => {
        const token = latestTokenByLead.get(lead.id) ?? null;
        return {
          leadId: lead.id,
          name: lead.name,
          company: lead.company,
          email: lead.email,
          leadStatus: lead.status,
          tokenId: token?.id ?? null,
          tokenStatus: token?.status ?? null,
          tokenExpiresAt: token?.expires_at ?? null,
          tokenSentAt: token?.sent_at ?? null,
        };
      });

      const kpis: AdminKpisDTO = {
        pendentesEnvio: tokens.filter(
          (t) => t.status === "disponivel" && !t.sent_at && new Date(t.expires_at).getTime() > now,
        ).length,
        expirados: tokens.filter((t) => t.status === "expirado").length,
        cadastrados: leads.length,
      };

      return { kpis, rows };
    },

    async reprocessAnalysis(leadId: string): Promise<{ ok: true }> {
      const lead = await leadRepo.findById(leadId);
      if (!lead) {
        throw new AdminServiceError("Lead não encontrado ou sem diagnóstico", 400);
      }

      const hasDiagnostic = await assessmentRepo.existsForLead(leadId);
      if (!hasDiagnostic) {
        throw new AdminServiceError("Lead não encontrado ou sem diagnóstico", 400);
      }

      if (!REPROCESSABLE_STATUSES.includes(lead.status)) {
        throw new AdminServiceError("Lead sem análise reprocessável", 400);
      }

      await analysisService.enqueue(leadId);
      return { ok: true };
    },
  };
}
