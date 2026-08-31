import type { LeadRepository } from "@/lib/repository/lead-repo";
import type { AssessmentRepository } from "@/lib/repository/assessment-repo";
import type { ScreenerContract } from "@/lib/screener/contract";
import type { ScreenerSubmission } from "@/lib/schemas/screener";
import type { ScoringCalibration } from "@/lib/screener/scoring-calibration";
import type { InsightsBrief, MarketAnalysis } from "@/lib/agents/types";
import { computeScores, computeContextualScores } from "@/lib/screener/scoring";
import { buildAgentPayload } from "@/lib/screener/agent-payload";

export class ScreenServiceError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "ScreenServiceError";
  }
}

export interface GeneratePdfInput {
  respondentName: string;
  band: { rotulo: string; descricao: string };
  dimensionScores: { name: string; nivel: number; peso: number }[];
  riskDimension: { name: string; nivel: number };
  imbalance: boolean;
  commercialAnswer: string;
  analysis?: MarketAnalysis;
  insights?: InsightsBrief;
}

export function createScreenService(deps: {
  leadRepo: LeadRepository;
  assessmentRepo: AssessmentRepository;
  contract: ScreenerContract;
  loadActiveCalibration: () => Promise<ScoringCalibration>;
}) {
  const { leadRepo, assessmentRepo, contract, loadActiveCalibration } = deps;

  return {
    async submitScreener(submission: ScreenerSubmission): Promise<{ ok: true }> {
      // 1. Honeypot: discard silently
      if (submission.website && submission.website.trim() !== "") {
        return { ok: true };
      }

      const email = submission.email.trim().toLowerCase();
      const role = submission.role ?? "";
      const profile = submission.profile ?? {};

      // 2. Resolve o lead: via leadId (cadastro na landing) ou fallback por email
      let leadId: string;
      if (submission.leadId) {
        const lead = await leadRepo.findById(submission.leadId);
        if (!lead) {
          throw new ScreenServiceError("Lead inválido", 401);
        }
        leadId = lead.id;
      } else {
        // Fallback: tenta reutilizar lead existente não-concluído
        const existing = await leadRepo.findByEmail(email);
        if (existing && existing.status !== "concluido") {
          leadId = existing.id;
        } else {
          leadId = await createLeadWithRepo({
            leadRepo,
            name: submission.name,
            company: submission.company?.name ?? "",
            email,
            role,
          });
        }
      }

      // 3. Bloqueia reenvio
      const alreadyDone = await assessmentRepo.existsForLead(leadId);
      if (alreadyDone) {
        throw new ScreenServiceError(
          "Este diagnóstico já foi enviado. Caso precise de ajustes, entre em contato conosco.",
          409,
        );
      }

      // 4. Compute scores (contextual)
      const dimensionAnswers = submission.answers.map((a) => ({
        dimensionId: a.dimensionId,
        nivel: a.nivel,
      }));

      let result;
      try {
        const calibration = await loadActiveCalibration();
        result = computeContextualScores({
          contract,
          calibration,
          answers: dimensionAnswers,
          contextAnswers: submission.context,
          profile,
          role,
        });
      } catch {
        result = computeScores(contract, dimensionAnswers, submission.context, role);
      }

      // 5. Build agent payload
      const agentPayload = buildAgentPayload({
        contract,
        respondent: { name: submission.name, role },
        company: submission.company,
        profileAnswers: profile,
        contextAnswers: submission.context,
        dimensionAnswers,
        commercialAnswer: submission.commercialAnswer,
        result,
        consent: {
          accepted: true,
          text: submission.consentText,
          acceptedAt: new Date().toISOString(),
        },
      });

      // 6. Persist assessment response + diagnostic
      try {
        await assessmentRepo.createAssessmentResponse({
          leadId,
          context: submission.context,
          profile,
          answers: submission.answers,
          commercialAnswer: submission.commercialAnswer,
          consent: {
            accepted: true,
            text: submission.consentText,
            acceptedAt: new Date().toISOString(),
          },
          agentPayload,
        });

        await assessmentRepo.createDiagnostic({
          leadId,
          overallScore: result.score,
          overallLevel: result.band.rotulo === "Inicial" ? 1
            : result.band.rotulo === "Emergente" ? 2
            : result.band.rotulo === "Estruturado" ? 3
            : result.band.rotulo === "Gerenciado" ? 4
            : 5,
          dimensionScores: result.dimensionScores,
          narrative: {
            faixa: result.band.rotulo,
            descricao: result.band.descricao,
            risco: result.riskDimension,
            desequilibrio: result.imbalance,
            cLevel: result.cLevel,
          },
          chartData: result.dimensionScores.map((d) => ({
            dimension: d.name,
            score: d.nivel,
          })),
        });

        await leadRepo.updateStatus(leadId, "concluido");
      } catch {
        throw new ScreenServiceError("Erro ao salvar diagnóstico", 500);
      }

      // 7. A geração de relatório agora é disparada sob demanda pelo gerente
      // comercial (painel admin). O submit apenas persiste os dados.
      return { ok: true };
    },
  };
}

async function createLeadWithRepo(params: {
  leadRepo: LeadRepository;
  name: string;
  company: string;
  email: string;
  role: string;
}): Promise<string> {
  const { leadRepo, name, company, email, role } = params;
  try {
    await leadRepo.create({
      name,
      company,
      phone: "",
      email,
      role,
    });
    const created = await leadRepo.findByEmail(email);
    if (!created) {
      throw new ScreenServiceError("Erro ao criar lead", 500);
    }
    return created.id;
  } catch (err: unknown) {
    if (err instanceof ScreenServiceError) throw err;
    const pgError = err as { code?: string };
    if (pgError.code === "23505") {
      throw new ScreenServiceError(
        "Já existe uma solicitação para este email. Verifique seu e-mail ou entre em contato.",
        409,
      );
    }
    throw new ScreenServiceError("Erro ao salvar cadastro", 500);
  }
}

