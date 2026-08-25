import type { LeadRepository } from "@/lib/repository/lead-repo";
import type { LeadResponseDTO } from "@/lib/dto/token";

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
        throw new LeadServiceError(
          "Já existe uma solicitação para este email. Verifique seu e-mail ou entre em contato.",
          409,
        );
      }

      try {
        await leadRepo.create({
          name: params.name,
          company: params.company,
          phone: params.phone,
          email,
          role: params.role,
        });
      } catch (err: unknown) {
        const pgError = err as { code?: string };
        if (pgError.code === "23505") {
          throw new LeadServiceError(
            "Já existe uma solicitação pendente para este email.",
            409,
          );
        }
        throw new LeadServiceError("Erro ao salvar cadastro", 500);
      }

      return { ok: true };
    },
  };
}
