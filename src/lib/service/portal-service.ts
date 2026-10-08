import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import "server-only";
import type { LeadRepository } from "@/lib/repository/lead-repo";
import type { AssessmentRepository } from "@/lib/repository/assessment-repo";
import type {
  MarketInsightsRepository,
  MarketInsightsRow,
  MarketInsightsStatus,
} from "@/lib/repository/market-insights-repo";
import type { ShareTokenRepository, ShareTokenRow } from "@/lib/repository/share-token-repo";
import type { ScreenerContract } from "@/lib/screener/contract";
import type { AgentPayload } from "@/lib/schemas/agent-payload";
import { agentPayloadSchema } from "@/lib/schemas/agent-payload";
import type { PortalDTO, ManagerPortalDTO } from "@/lib/dto/portal";
import { stripPii } from "@/lib/dto/portal";
import { marketAnalysisSchema, insightsBriefSchema } from "@/lib/agents/types";
import { getStageByFaixa } from "@/lib/cmmi/stages";

export class PortalServiceError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "PortalServiceError";
  }
}

export const SHARE_TOKEN_TTL_DAYS = 90;

const GENERIC_NOT_FOUND = "Link inválido ou expirado";

type FullPortalState = PortalDTO & { email: string; phone: string };
export type PublicPortalDTO = Omit<FullPortalState, "email" | "phone">;

export function createPortalService(deps: {
  leadRepo: LeadRepository;
  assessmentRepo: AssessmentRepository;
  marketInsightsRepo: MarketInsightsRepository;
  shareTokenRepo: ShareTokenRepository;
  contract: ScreenerContract;
}) {
  const { leadRepo, assessmentRepo, marketInsightsRepo, shareTokenRepo } = deps;

  function sha256Hex(value: string): string {
    return createHash("sha256").update(value).digest("hex");
  }

  function assertTokenValid(row: ShareTokenRow): void {
    const isRevoked = row.revoked_at !== null;
    const isExpired = new Date(row.expires_at).getTime() <= Date.now();
    if (isRevoked || isExpired) {
      throw new PortalServiceError(GENERIC_NOT_FOUND, 404);
    }
  }

  function hashMatches(rawToken: string, row: ShareTokenRow): boolean {
    const computedBuf = Buffer.from(sha256Hex(rawToken), "utf8");
    const storedBuf = Buffer.from(row.token_hash, "utf8");
    if (computedBuf.length !== storedBuf.length) return false;
    return timingSafeEqual(computedBuf, storedBuf);
  }

  function assembleFull(leadId: string): Promise<FullPortalState> {
    return loadAndBuild(leadRepo, assessmentRepo, marketInsightsRepo, leadId);
  }

  return {
    async getForManager(leadId: string): Promise<ManagerPortalDTO> {
      const [full, shareRow] = await Promise.all([
        assembleFull(leadId),
        shareTokenRepo.findActiveByLeadId(leadId),
      ]);
      return {
        ...full,
        share: {
          active: shareRow !== null,
          url: null,
          expiresAt: shareRow?.expires_at ?? null,
        },
      };
    },

    async getByToken(rawToken: string): Promise<PublicPortalDTO> {
      const tokenHash = sha256Hex(rawToken);
      const row = await shareTokenRepo.findByHash(tokenHash);
      if (!row || !hashMatches(rawToken, row)) {
        throw new PortalServiceError(GENERIC_NOT_FOUND, 404);
      }
      assertTokenValid(row);
      const full = await assembleFull(row.lead_id);
      return stripPii(full);
    },

    async createShareToken(
      leadId: string,
    ): Promise<{ token: string; url: string; expiresAt: string }> {
      const token = randomBytes(32).toString("base64url");
      const expiresAt = new Date(
        Date.now() + SHARE_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000,
      ).toISOString();
      await shareTokenRepo.create({
        leadId,
        tokenHash: sha256Hex(token),
        expiresAt,
      });
      return { token, url: `/r/${token}`, expiresAt };
    },

    async revokeShareToken(leadId: string): Promise<void> {
      await shareTokenRepo.revokeByLeadId(leadId);
    },
  };
}

async function loadAndBuild(
  leadRepo: LeadRepository,
  assessmentRepo: AssessmentRepository,
  insightsRepo: MarketInsightsRepository,
  leadId: string,
): Promise<FullPortalState> {
  const lead = await leadRepo.findById(leadId);
  if (!lead) throw new PortalServiceError("Lead não encontrado", 404);

  const assessment = await assessmentRepo.findByLeadId(leadId);
  if (!assessment) {
    throw new PortalServiceError("Diagnóstico não encontrado", 404);
  }
  const payload = validateAgentPayload(assessment.agent_payload, leadId);

  const insights = await insightsRepo.findByLeadId(leadId);
  const analysisState = extractAnalysisState(insights);
  const risk = buildRisk(payload);

  const dto: PortalDTO = {
    lead: { id: lead.id, name: lead.name, company: lead.company },
    score: payload.score,
    dimensions: payload.respostas.map((r) => ({
      id: r.dimensao_id,
      name: r.dimensao,
      nivel: r.nivel,
      peso: r.peso,
      score: r.nivel * r.peso,
      pergunta: r.pergunta,
      resposta: r.resposta,
    })),
    risk,
    imbalance: payload.desequilibrio,
    stage: getStageByFaixa(payload.score.faixa),
    analysisStatus: analysisState.status,
    analysis: analysisState.analysis,
    insights: analysisState.insights,
    sources: analysisState.sources,
    commercialAnswer: payload.resposta_comercial.resposta,
  };
  return { ...dto, email: lead.email, phone: lead.phone };
}

function validateAgentPayload(candidate: unknown, leadId: string): AgentPayload {
  if (!candidate || typeof candidate !== "object") {
    console.error(`[portal] agent_payload ausente para lead ${leadId}`);
    throw new PortalServiceError("Diagnóstico indisponível", 404);
  }
  const parsed = agentPayloadSchema.safeParse(candidate);
  if (!parsed.success) {
    console.error(
      `[portal] agent_payload inválido para lead ${leadId}:`,
      parsed.error.issues
        .map((i) => `${i.path.join(".")}: ${i.message}`)
        .join("; "),
    );
    throw new PortalServiceError("Diagnóstico indisponível", 404);
  }
  return parsed.data;
}

function buildRisk(payload: AgentPayload): PortalDTO["risk"] {
  const level = payload.risco.nivel;
  const name =
    payload.respostas.find((r) => r.dimensao_id === payload.risco.dimensao_id)
      ?.dimensao ?? payload.risco.dimensao_id;
  return { id: payload.risco.dimensao_id, name, nivel: level };
}

function parseAnalysisStatus(status: string | undefined): MarketInsightsStatus {
  if (
    status === "analisado" ||
    status === "processando" ||
    status === "falha"
  ) {
    return status;
  }
  return "pendente";
}

function parseSources(raw: unknown): { url: string }[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((s) => (typeof s === "string" && s.length > 0 ? [{ url: s }] : []));
}

function extractAnalysisState(insights: MarketInsightsRow | null): {
  status: MarketInsightsStatus;
  analysis: PortalDTO["analysis"];
  insights: PortalDTO["insights"];
  sources: { url: string }[];
} {
  const status = parseAnalysisStatus(insights?.status ?? undefined);
  if (!insights || status !== "analisado") {
    return { status, analysis: undefined, insights: undefined, sources: [] };
  }

  const analysisParsed = marketAnalysisSchema.safeParse(insights.analysis);
  const briefParsed = insightsBriefSchema.safeParse(insights.insights);
  return {
    status,
    analysis: analysisParsed.success ? analysisParsed.data : undefined,
    insights: briefParsed.success ? briefParsed.data : undefined,
    sources: parseSources(insights.sources),
  };
}
