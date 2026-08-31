import type { LeadRepository } from "@/lib/repository/lead-repo";
import type { LeadResponseDTO } from "@/lib/dto/lead";

export class LeadServiceError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "LeadServiceError";
  }
}

export function createLeadService(deps: { leadRepo: LeadRepository }) {
  const { leadRepo } = deps;

  return {
    async createLead(params: {
      name: string;
      company: string;
      phone: string;
      email: string;
      role: string;
    }): Promise<LeadResponseDTO> {
      const email = params.email.trim().toLowerCase();

      const existing = await leadRepo.findByEmail(email);
      if (existing) {
        if (existing.status === "concluido") {
          throw new LeadServiceError(
            "Este email já concluiu o diagnóstico. Entre em contato com nosso time comercial para mais informações.",
            409,
          );
        }
        return { ok: true, leadId: existing.id };
      }

      try {
        const leadId = await leadRepo.create({
          name: params.name,
          company: params.company,
          phone: params.phone,
          email,
          role: params.role,
        });
        return { ok: true, leadId };
      } catch (err: unknown) {
        const pgError = err as { code?: string };
        if (pgError.code === "23505") {
          const raced = await leadRepo.findByEmail(email);
          if (raced && raced.status !== "concluido") {
            return { ok: true, leadId: raced.id };
          }
          throw new LeadServiceError(
            "Este email já concluiu o diagnóstico. Entre em contato com nosso time comercial para mais informações.",
            409,
          );
        }
        throw new LeadServiceError("Erro ao salvar cadastro", 500);
      }
    },
  };
}
