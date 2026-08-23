import type { LeadRepository } from "@/lib/repository/lead-repo";
import type { AssessmentRepository } from "@/lib/repository/assessment-repo";
import type { ScreenerContract } from "@/lib/screener/contract";
import type { ScreenerSubmission } from "@/lib/schemas/screener";
import { computeScores } from "@/lib/screener/scoring";
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
}

export function createScreenService(deps: {
  leadRepo: LeadRepository;
  assessmentRepo: AssessmentRepository;
  contract: ScreenerContract;
  generatePdf: (input: GeneratePdfInput) => Promise<{ pdf: Buffer; filename: string }>;
  sendEmail: (params: {
    to: string;
    subject: string;
    html: string;
    attachment: { filename: string; content: Buffer };
  }) => Promise<void>;
}) {
  const { leadRepo, assessmentRepo, contract, generatePdf, sendEmail } = deps;

  return {
    async submitScreener(
      submission: ScreenerSubmission,
    ): Promise<{ ok: true }> {
      // 1. Honeypot: discard silently
      if (submission.website && submission.website.trim() !== "") {
        return { ok: true };
      }

      const email = submission.email.trim().toLowerCase();

      // 2. Duplicate pending lead
      const existing = await leadRepo.findByEmailAndStatus(email, "pendente");
      if (existing) {
        throw new ScreenServiceError(
          "Já existe uma solicitação pendente para este email.",
          409,
        );
      }

      // 3. Create lead
      let leadId: string;
      try {
        await leadRepo.create({
          name: submission.name,
          company: submission.company?.name ?? "",
          phone: "",
          email,
          role: submission.role,
        });
        const created = await leadRepo.findByEmailAndStatus(email, "pendente");
        if (!created) {
          throw new ScreenServiceError("Erro ao criar lead", 500);
        }
        leadId = created.id;
      } catch (err: unknown) {
        if (err instanceof ScreenServiceError) throw err;
        const pgError = err as { code?: string };
        if (pgError.code === "23505") {
          throw new ScreenServiceError(
            "Já existe uma solicitação pendente para este email.",
            409,
          );
        }
        throw new ScreenServiceError("Erro ao salvar cadastro", 500);
      }

      // 4. Compute scores
      const dimensionAnswers = submission.answers.map((a) => ({
        dimensionId: a.dimensionId,
        nivel: a.nivel,
      }));
      const result = computeScores(
        contract,
        dimensionAnswers,
        submission.context,
      );

      // 5. Build agent payload
      const agentPayload = buildAgentPayload({
        contract,
        respondent: { name: submission.name, role: submission.role },
        company: submission.company,
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
      } catch {
        throw new ScreenServiceError("Erro ao salvar diagnóstico", 500);
      }

      // 7. Generate PDF
      let pdfResult: { pdf: Buffer; filename: string };
      try {
        pdfResult = await generatePdf({
          respondentName: submission.name,
          band: { rotulo: result.band.rotulo, descricao: result.band.descricao },
          dimensionScores: result.dimensionScores,
          riskDimension: result.riskDimension,
          imbalance: result.imbalance,
          commercialAnswer: submission.commercialAnswer,
        });
      } catch {
        throw new ScreenServiceError("Erro ao gerar relatório", 500);
      }

      // 8. Send email
      const managerEmail =
        process.env.MANAGER_NOTIFICATION_EMAIL ?? "comercial@rhemadata.com";
      try {
        await sendEmail({
          to: managerEmail,
          subject: `Diagnóstico de Maturidade — ${submission.name}`,
          html: `<p>Novo diagnóstico recebido de <strong>${escapeHtml(submission.name)}</strong> (${escapeHtml(submission.role)}).</p><p>Faixa: <strong>${escapeHtml(result.band.rotulo)}</strong></p>`,
          attachment: {
            filename: pdfResult.filename,
            content: pdfResult.pdf,
          },
        });
      } catch {
        throw new ScreenServiceError("Erro ao enviar relatório", 502);
      }

      return { ok: true };
    },
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
