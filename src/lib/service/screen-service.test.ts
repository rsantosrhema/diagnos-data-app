import { describe, it, expect, vi } from "vitest";
import { createScreenService, ScreenServiceError } from "./screen-service";
import type { LeadRepository } from "@/lib/repository/lead-repo";
import type { AssessmentRepository } from "@/lib/repository/assessment-repo";
import { SCREENER_CONTRACT } from "@/lib/screener/contract";
import type { ScreenerSubmission } from "@/lib/schemas/screener";

const DIMS = SCREENER_CONTRACT.dimensoes;

function validSubmission(overrides: Partial<ScreenerSubmission> = {}): ScreenerSubmission {
  return {
    name: "João Silva",
    role: "CTO",
    email: "joao@corp.com",
    consent: true,
    consentText: "Autorizo",
    context: { ctx_01: "C-level (CEO, CTO, CFO, CIO)", ctx_02: "51 a 200" },
    answers: DIMS.map((d) => ({ dimensionId: d.id, nivel: 3 })),
    commercialAnswer: "Até R$ 50 mil",
    ...overrides,
  };
}

function mockLeadRepo(overrides: Partial<LeadRepository> = {}): LeadRepository {
  return {
    findById: vi.fn(),
    findByEmailAndStatus: vi.fn().mockResolvedValue(null),
    create: vi.fn(),
    updateStatus: vi.fn(),
    findAll: vi.fn(),
    findNameAndEmail: vi.fn(),
    ...overrides,
  };
}

function mockAssessmentRepo(overrides: Partial<AssessmentRepository> = {}): AssessmentRepository {
  return {
    createAssessmentResponse: vi.fn(),
    createDiagnostic: vi.fn(),
    findByLeadId: vi.fn(),
    ...overrides,
  };
}

function mockGeneratePdf() {
  return vi.fn().mockResolvedValue({
    pdf: Buffer.from("fake-pdf"),
    filename: "diagnostico.pdf",
  });
}

function mockSendEmail() {
  return vi.fn().mockResolvedValue(undefined);
}

function createService(deps: {
  leadRepo?: LeadRepository;
  assessmentRepo?: AssessmentRepository;
  generatePdf?: ReturnType<typeof mockGeneratePdf>;
  sendEmail?: ReturnType<typeof mockSendEmail>;
} = {}) {
  return createScreenService({
    leadRepo: deps.leadRepo ?? mockLeadRepo({
      findByEmailAndStatus: vi.fn()
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ id: "lead-1" }),
    }),
    assessmentRepo: deps.assessmentRepo ?? mockAssessmentRepo(),
    contract: SCREENER_CONTRACT,
    generatePdf: deps.generatePdf ?? mockGeneratePdf(),
    sendEmail: deps.sendEmail ?? mockSendEmail(),
  });
}

describe("ScreenService", () => {
  it("happy path: retorna { ok: true }", async () => {
    const service = createService();
    const result = await service.submitScreener(validSubmission());
    expect(result).toEqual({ ok: true });
  });

  it("honeypot preenchido: retorna ok sem processar", async () => {
    const create = vi.fn();
    const service = createService({
      leadRepo: mockLeadRepo({ create }),
    });
    const result = await service.submitScreener(
      validSubmission({ website: "http://spam.com" }),
    );
    expect(result).toEqual({ ok: true });
    expect(create).not.toHaveBeenCalled();
  });

  it("lead duplicado pendente: lança 409", async () => {
    const service = createService({
      leadRepo: mockLeadRepo({
        findByEmailAndStatus: vi.fn().mockResolvedValue({ id: "existing" }),
      }),
    });
    await expect(
      service.submitScreener(validSubmission()),
    ).rejects.toMatchObject({ status: 409 });
  });

  it("falha na persistência: lança 500", async () => {
    const service = createService({
      leadRepo: mockLeadRepo({
        findByEmailAndStatus: vi.fn()
          .mockResolvedValueOnce(null)
          .mockResolvedValueOnce({ id: "lead-1" }),
      }),
      assessmentRepo: mockAssessmentRepo({
        createAssessmentResponse: vi.fn().mockRejectedValue(new Error("db error")),
      }),
    });
    await expect(
      service.submitScreener(validSubmission()),
    ).rejects.toMatchObject({ status: 500 });
  });

  it("falha na geração do PDF: lança 500", async () => {
    const service = createService({
      generatePdf: vi.fn().mockRejectedValue(new Error("pdf error")),
    });
    await expect(
      service.submitScreener(validSubmission()),
    ).rejects.toMatchObject({ status: 500 });
  });

  it("falha no envio do email: lança 502", async () => {
    const service = createService({
      sendEmail: vi.fn().mockRejectedValue(new Error("email error")),
    });
    await expect(
      service.submitScreener(validSubmission()),
    ).rejects.toMatchObject({ status: 502 });
  });

  it("chama generatePdf com os dados corretos", async () => {
    const generatePdf = mockGeneratePdf();
    const service = createService({ generatePdf });
    await service.submitScreener(validSubmission());
    expect(generatePdf).toHaveBeenCalledWith(
      expect.objectContaining({
        respondentName: "João Silva",
        band: expect.objectContaining({ rotulo: "Estruturado" }),
      }),
    );
  });

  it("chama sendEmail para MANAGER_NOTIFICATION_EMAIL", async () => {
    const sendEmail = mockSendEmail();
    const service = createService({ sendEmail });
    await service.submitScreener(validSubmission());
    expect(sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: expect.any(String),
        subject: expect.stringContaining("João Silva"),
      }),
    );
  });

  it("cria lead com email normalizado", async () => {
    const create = vi.fn();
    const service = createService({
      leadRepo: mockLeadRepo({
        create,
        findByEmailAndStatus: vi.fn()
          .mockResolvedValueOnce(null)
          .mockResolvedValueOnce({ id: "lead-1" }),
      }),
    });
    await service.submitScreener(validSubmission({ email: "JOAO@CORP.COM" }));
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({ email: "joao@corp.com" }),
    );
  });
});
