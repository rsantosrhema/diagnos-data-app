import { describe, it, expect } from "vitest";
import { screenerSubmissionSchema, agentPayloadSchema } from "./screener";
import { buildAgentPayload } from "@/lib/screener/agent-payload";
import { SCREENER_CONTRACT } from "@/lib/screener/contract";
import { computeScores } from "@/lib/screener/scoring";

const DIMS = SCREENER_CONTRACT.dimensoes;

function validSubmission() {
  return {
    name: "João Silva",
    role: "CTO",
    email: "joao@corp.com",
    consent: true as const,
    consentText: "Autorizo o uso dos dados.",
    context: {},
    profile: {
      perfil_01: "Indústria",
      perfil_02: "51 a 200",
      perfil_03: "R$ 5 a 50 milhões",
    },
    answers: DIMS.map((d) => ({ dimensionId: d.id, nivel: 3 })),
    commercialAnswer: "Até R$ 50 mil",
  };
}

describe("screenerSubmissionSchema", () => {
  it("aceita payload válido", () => {
    const result = screenerSubmissionSchema.safeParse(validSubmission());
    expect(result.success).toBe(true);
  });

  it("aceita payload sem role (cargo vem do lead)", () => {
    const result = screenerSubmissionSchema.safeParse({
      ...validSubmission(),
      role: undefined,
    });
    expect(result.success).toBe(true);
  });

  it("aceita leadId como uuid", () => {
    const result = screenerSubmissionSchema.safeParse({
      ...validSubmission(),
      leadId: "c0b1f2e3-4a5b-6c7d-8e9f-0a1b2c3d4e5f",
    });
    expect(result.success).toBe(true);
  });

  it("rejeita leadId que não é uuid", () => {
    const result = screenerSubmissionSchema.safeParse({
      ...validSubmission(),
      leadId: "nao-uuid",
    });
    expect(result.success).toBe(false);
  });

  it("rejeita nome muito curto", () => {
    const result = screenerSubmissionSchema.safeParse({
      ...validSubmission(),
      name: "A",
    });
    expect(result.success).toBe(false);
  });

  it("rejeita cargo muito curto quando fornecido", () => {
    const result = screenerSubmissionSchema.safeParse({
      ...validSubmission(),
      role: "A",
    });
    expect(result.success).toBe(false);
  });

  it("rejeita email inválido", () => {
    const result = screenerSubmissionSchema.safeParse({
      ...validSubmission(),
      email: "nao-e-email",
    });
    expect(result.success).toBe(false);
  });

  it("rejeita consent=false", () => {
    const result = screenerSubmissionSchema.safeParse({
      ...validSubmission(),
      consent: false,
    });
    expect(result.success).toBe(false);
  });

  it("rejeita menos de 10 respostas", () => {
    const result = screenerSubmissionSchema.safeParse({
      ...validSubmission(),
      answers: DIMS.slice(0, 9).map((d) => ({ dimensionId: d.id, nivel: 3 })),
    });
    expect(result.success).toBe(false);
  });

  it("rejeita nivel fora de 1–5", () => {
    const answers = DIMS.map((d) => ({ dimensionId: d.id, nivel: 3 }));
    answers[0] = { dimensionId: "d01", nivel: 0 };
    const result = screenerSubmissionSchema.safeParse({
      ...validSubmission(),
      answers,
    });
    expect(result.success).toBe(false);
  });

  it("aceita payload sem company", () => {
    const submission = validSubmission();
    const result = screenerSubmissionSchema.safeParse({
      name: submission.name,
      role: submission.role,
      email: submission.email,
      consent: submission.consent,
      consentText: submission.consentText,
      context: submission.context,
      profile: submission.profile,
      answers: submission.answers,
      commercialAnswer: submission.commercialAnswer,
    });
    expect(result.success).toBe(true);
  });

  it("aceita payload com honeypot vazio", () => {
    const result = screenerSubmissionSchema.safeParse({
      ...validSubmission(),
      website: "",
    });
    expect(result.success).toBe(true);
  });

  it("normaliza email para lowercase via transformação no service (schema não transforma)", () => {
    const result = screenerSubmissionSchema.safeParse({
      ...validSubmission(),
      email: "JOAO@CORP.COM",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBe("JOAO@CORP.COM");
    }
  });
});

describe("agentPayloadSchema", () => {
  it("valida payload gerado pelo buildAgentPayload", () => {
    const dimensionAnswers = DIMS.map((d) => ({ dimensionId: d.id, nivel: 3 }));
    const result = computeScores(SCREENER_CONTRACT, dimensionAnswers, {}, "CTO");
    const payload = buildAgentPayload({
      contract: SCREENER_CONTRACT,
      respondent: { name: "João", role: "CTO" },
      company: { name: "Corp", size: "51 a 200" },
      profileAnswers: {
        perfil_01: "Indústria",
        perfil_02: "51 a 200",
        perfil_03: "R$ 5 a 50 milhões",
      },
      contextAnswers: {},
      dimensionAnswers,
      commercialAnswer: "Até R$ 50 mil",
      result,
      consent: { accepted: true, text: "ok", acceptedAt: "2026-08-23T12:00:00Z" },
    });

    const validated = agentPayloadSchema.safeParse(payload);
    expect(validated.success).toBe(true);
  });
});
