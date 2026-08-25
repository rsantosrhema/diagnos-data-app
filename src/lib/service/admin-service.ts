import type { TokenRepository } from "@/lib/repository/token-repo";
import type { LeadRepository } from "@/lib/repository/lead-repo";
import type { AdminTokensResponseDTO, AdminLeadRowDTO, AdminKpisDTO } from "@/lib/dto/admin";

export function createAdminService(deps: {
  tokenRepo: TokenRepository;
  leadRepo: LeadRepository;
}) {
  const { tokenRepo, leadRepo } = deps;

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
  };
}
