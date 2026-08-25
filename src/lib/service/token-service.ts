import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { generateToken, hashToken, createSessionToken, hashSessionToken, isValidTokenFormat } from "@/lib/auth/token";
import type { TokenRepository } from "@/lib/repository/token-repo";
import type { LeadRepository } from "@/lib/repository/lead-repo";
import type { SessionRepository } from "@/lib/repository/session-repo";
import type { GenerateTokenResponseDTO } from "@/lib/dto/token";
import type { TokenActionDTO } from "@/lib/dto/admin";

const TOKEN_TTL_MS = 20 * 60 * 1000;
const MAX_GENERATE_ATTEMPTS = 5;
const SESSION_DURATION_MS = 2 * 60 * 60 * 1000;

const MASTER_LEAD_NAME = "Usuário Master";
const MASTER_LEAD_COMPANY = "Empresa Teste";
const MASTER_LEAD_ROLE = "CTO";

export class TokenServiceError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "TokenServiceError";
  }
}

export interface MasterSessionResult {
  sessionToken: string;
  sessionExpires: Date;
  isMaster: true;
}

function sha256(value: string): Buffer {
  return createHash("sha256").update(value).digest();
}

export function createTokenService(deps: {
  tokenRepo: TokenRepository;
  leadRepo: LeadRepository;
  sessionRepo: SessionRepository;
}) {
  const { tokenRepo, leadRepo, sessionRepo } = deps;

  return {
    async validateMasterToken(rawToken: string): Promise<MasterSessionResult | null> {
      const masterValue = process.env.MASTER_TOKEN_VALUE;
      if (!masterValue) return null;

      const token = rawToken.trim().toUpperCase();
      const provided = sha256(token);
      const expected = sha256(masterValue.trim().toUpperCase());

      if (provided.length !== expected.length) return null;
      if (!timingSafeEqual(provided, expected)) return null;

      const masterEmail = process.env.MASTER_TOKEN_LEAD_EMAIL ?? "master@diagnos.test";

      let lead = await leadRepo.findByEmail(masterEmail);
      if (!lead) {
        await leadRepo.create({
          name: MASTER_LEAD_NAME,
          company: MASTER_LEAD_COMPANY,
          phone: "",
          email: masterEmail,
          role: MASTER_LEAD_ROLE,
        });
        lead = await leadRepo.findByEmail(masterEmail);
        if (!lead) {
          throw new TokenServiceError("Erro ao criar lead de teste", 500);
        }
      }

      const sessionToken = createSessionToken();
      const sessionHash = hashSessionToken(sessionToken);
      const sessionExpires = new Date(Date.now() + SESSION_DURATION_MS);

      await sessionRepo.create({
        tokenHash: sessionHash,
        leadId: lead.id,
        expiresAt: sessionExpires.toISOString(),
        isMaster: true,
      });

      return { sessionToken, sessionExpires, isMaster: true };
    },

    async validateAndCreateSession(rawToken: string): Promise<{ sessionToken: string; sessionExpires: Date }> {
      const token = rawToken.trim().toUpperCase();
      if (!isValidTokenFormat(token)) {
        throw new TokenServiceError("Token inválido", 401);
      }

      const tokenHash = hashToken(token);
      const row = await tokenRepo.findByHash(tokenHash);

      if (!row) {
        throw new TokenServiceError("Token inválido", 401);
      }

      if (row.status === "disponivel" && new Date(row.expires_at).getTime() <= Date.now()) {
        await tokenRepo.markExpired(row.id);
        throw new TokenServiceError("Token expirado. Solicite um novo token.", 401);
      }

      if (row.status === "usado") {
        throw new TokenServiceError("Token já utilizado. Solicite um novo token.", 401);
      }
      if (row.status === "cancelado") {
        throw new TokenServiceError("Token cancelado. Solicite um novo token.", 401);
      }
      if (row.status === "expirado") {
        throw new TokenServiceError("Token expirado. Solicite um novo token.", 401);
      }

      await tokenRepo.consume(row.id);

      const sessionToken = createSessionToken();
      const sessionHash = hashSessionToken(sessionToken);
      const sessionExpires = new Date(Date.now() + SESSION_DURATION_MS);

      await sessionRepo.create({
        tokenHash: sessionHash,
        leadId: row.lead_id,
        expiresAt: sessionExpires.toISOString(),
      });

      return { sessionToken, sessionExpires };
    },

    async logoutSession(sessionToken: string): Promise<void> {
      const sessionHash = hashSessionToken(sessionToken);
      await sessionRepo.deleteByHash(sessionHash);
    },

    async generateForLead(leadId: string): Promise<GenerateTokenResponseDTO> {
      const lead = await leadRepo.findById(leadId);
      if (!lead) {
        throw new TokenServiceError("Cliente não encontrado", 404);
      }

      await tokenRepo.cancelActiveByLeadId(leadId);

      for (let attempt = 0; attempt < MAX_GENERATE_ATTEMPTS; attempt++) {
        const token = generateToken();
        const tokenHash = hashToken(token);
        const expiresAt = new Date(Date.now() + TOKEN_TTL_MS).toISOString();

        const result = await tokenRepo.create({
          leadId,
          tokenHash,
          expiresAt,
        });

        if (result) {
          await leadRepo.updateStatus(leadId, "token_gerado");
          return { token };
        }
      }

      throw new TokenServiceError("Não foi possível gerar um token único", 500);
    },

    async regenerate(tokenId: string): Promise<GenerateTokenResponseDTO> {
      const tokenRow = await tokenRepo.findById(tokenId);
      if (!tokenRow) {
        throw new TokenServiceError("Token não encontrado", 404);
      }

      await tokenRepo.cancelActiveByLeadId(tokenRow.lead_id);

      for (let attempt = 0; attempt < MAX_GENERATE_ATTEMPTS; attempt++) {
        const token = generateToken();
        const tokenHash = hashToken(token);
        const expiresAt = new Date(Date.now() + TOKEN_TTL_MS).toISOString();

        const result = await tokenRepo.create({
          leadId: tokenRow.lead_id,
          tokenHash,
          expiresAt,
        });

        if (result) {
          return { token };
        }
      }

      throw new TokenServiceError("Não foi possível regerar um token único", 500);
    },

    async cancel(tokenId: string): Promise<void> {
      const tokenRow = await tokenRepo.findById(tokenId);
      if (!tokenRow) {
        throw new TokenServiceError("Token não encontrado", 404);
      }
      await tokenRepo.cancel(tokenId);
    },

    async sendTokenEmail(
      tokenId: string,
      bodyToken: string | undefined,
      sendEmail: (params: { to: string; name: string; token: string }) => Promise<void>,
      buildMailto: (params: { to: string; name: string; token: string }) => string,
    ): Promise<TokenActionDTO> {
      const tokenRow = await tokenRepo.findById(tokenId);
      if (!tokenRow) {
        throw new TokenServiceError("Token não encontrado", 404);
      }

      if (tokenRow.status !== "disponivel") {
        throw new TokenServiceError(
          `Token não está disponível (status: ${tokenRow.status}).`,
          409,
        );
      }

      if (new Date(tokenRow.expires_at).getTime() <= Date.now()) {
        await tokenRepo.markExpired(tokenRow.id);
        throw new TokenServiceError("Token expirado. Gere um novo.", 409);
      }

      const lead = await leadRepo.findNameAndEmail(tokenRow.lead_id);
      if (!lead) {
        throw new TokenServiceError("Cliente não encontrado", 404);
      }

      const token = bodyToken;
      if (!token) {
        throw new TokenServiceError(
          "Token em texto puro é necessário para envio; gere um novo token.",
          400,
        );
      }

      try {
        await sendEmail({ to: lead.email, name: lead.name, token });
      } catch {
        const mailto = buildMailto({ to: lead.email, name: lead.name, token });
        return { mailto };
      }

      const sentAt = new Date().toISOString();
      await tokenRepo.updateSentAt(tokenId, sentAt);

      return { sentAt };
    },
  };
}
