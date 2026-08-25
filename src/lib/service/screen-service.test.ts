import { describe, it, expect, vi } from "vitest";
import { createScreenService, ScreenServiceError } from "./screen-service";
import type { LeadRepository, LeadRow } from "@/lib/repository/lead-repo";
import type { AssessmentRepository } from "@/lib/repository/assessment-repo";
import { SCREENER_CONTRACT } from "@/lib/screener/contract";
import type { ScreenerSubmission } from "@/lib/schemas/screener";

const DIMS = SCREENER_CONTRACT.dimensoes;

const leadRow = (overrides: Partial<LeadRow> = {}): LeadRow => ({
  id: "lead-1",
  name: "João Silva",
  company: "Corp",
  email: "joao@corp.com",
  phone: "",
  role: "CTO",
  status: "token_gerado",
  created_at: new Date().toISOString(),
  ...overrides,
});

function validSubmission(overrides: Partial<ScreenerSubmission> = {}): ScreenerSubmission {
  return {
    leadId: "lead-1",
    name: "João Silva",
    role: "CTO",
    email: "joao@corp.com",
    consent: true,
    consentText: "Autorizo",
    context: {},
    profile: {
      perfil_01: "Indústria",
      perfil_02: "51 a 200",
      perfil_03: "R$ 5 a 50 milhões",
    },
    answers: DIMS.map((d) => ({ dimensionId: d.id, nivel: 3 })),
    commercialAnswer: "Até R$ 50 mil",
    ...overrides,
  };
}

function mockLeadRepo(overrides: Partial<LeadRepository> = {}): LeadRepository {
  return {
    findById: vi.fn(),
    findByEmail: vi.fn(),
    findByEmailAndStatus: vi.fn(),
    create: vi.fn(),
    updateStatus: vi.fn(),
    findAll: vi.fn(),
    findNameAndEmail: vi.fn(),
    findProfileById: vi.fn(),
    ...overrides,
  };
}

function mockAssessmentRepo(overrides: Partial<AssessmentRepository> = {}): AssessmentRepository {
  return {
    existsForLead: vi.fn().mockResolvedValue(false),
    createAssessmentResponse: vi.fn(),
    upsertAssessmentResponse: vi.fn(),
    createDiagnostic: vi.fn(),
    upsertDiagnostic: vi.fn(),
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
      findById: vi.fn().mockResolvedValue(leadRow()),
      findByEmail: vi.fn().mockResolvedValue(leadRow()),
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

  it("leadId inválido: lança 401", async () => {
    const service = createService({
      leadRepo: mockLeadRepo({
        findById: vi.fn().mockResolvedValue(null),
      }),
    });
    await expect(
      service.submitScreener(validSubmission({ leadId: "not-a-real-lead" })),
    ).rejects.toMatchObject({ status: 401 });
  });

  it("reenvio para lead já concluído: lança 409", async () => {
    const service = createService({
      assessmentRepo: mockAssessmentRepo({
        existsForLead: vi.fn().mockResolvedValue(true),
      }),
    });
    await expect(
      service.submitScreener(validSubmission({ leadId: "lead-1" })),
    ).rejects.toMatchObject({ status: 409 });
  });

  it("usa o lead da sessão quando leadId é enviado", async () => {
    const findById = vi.fn().mockResolvedValue(leadRow());
    const create = vi.fn();
    const service = createService({
      leadRepo: mockLeadRepo({ findById, create }),
    });
    await service.submitScreener(validSubmission({ leadId: "lead-1" }));
    expect(findById).toHaveBeenCalledWith("lead-1");
    expect(create).not.toHaveBeenCalled();
  });

  it("fallback sem leadId: reutiliza lead existente não-concluído", async () => {
    const findByEmail = vi.fn().mockResolvedValue(leadRow({ id: "lead-9", status: "token_gerado" }));
    const create = vi.fn();
    const service = createService({
      leadRepo: mockLeadRepo({
        findByEmail,
        findById: vi.fn(),
        create,
      }),
    });
    await service.submitScreener(validSubmission({ leadId: undefined }));
    expect(findByEmail).toHaveBeenCalledWith("joao@corp.com");
    expect(create).not.toHaveBeenCalled();
  });

  it("marca o lead como concluído após persistir", async () => {
    const updateStatus = vi.fn();
    const service = createService({
      leadRepo: mockLeadRepo({
        findById: vi.fn().mockResolvedValue(leadRow()),
        updateStatus,
      }),
    });
    await service.submitScreener(validSubmission({ leadId: "lead-1" }));
    expect(updateStatus).toHaveBeenCalledWith("lead-1", "concluido");
  });

  it("falha na persistência: lança 500", async () => {
    const service = createService({
      leadRepo: mockLeadRepo({
        findById: vi.fn().mockResolvedValue(leadRow()),
      }),
      assessmentRepo: mockAssessmentRepo({
        createAssessmentResponse: vi.fn().mockRejectedValue(new Error("db error")),
      }),
    });
    await expect(
      service.submitScreener(validSubmission({ leadId: "lead-1" })),
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

  it("fallback sem lead: erro 23505 vira 409", async () => {
    const create = vi.fn().mockImplementation(() => {
      return Promise.reject(Object.assign(new Error("dup"), { code: "23505" }));
    });
    const findById = vi.fn().mockResolvedValue(null);
    const findByEmail = vi.fn().mockResolvedValue(null);
    const service = createService({
      leadRepo: mockLeadRepo({ findById, findByEmail, create }),
    });
    await expect(
      service.submitScreener(
        validSubmission({ email: "JOAO@CORP.COM", leadId: undefined }),
      ),
    ).rejects.toMatchObject({ status: 409 });
    expect(findById).not.toHaveBeenCalled();
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({ email: "joao@corp.com" }),
    );
  });

  it("fallback sem lead: erro genérico vira 500", async () => {
    const create = vi.fn().mockRejectedValue(new Error("db down"));
    const findById = vi.fn().mockResolvedValue(null);
    const findByEmail = vi.fn().mockResolvedValue(null);
    const service = createService({
      leadRepo: mockLeadRepo({ findById, findByEmail, create }),
    });
    await expect(
      service.submitScreener(
        validSubmission({ leadId: undefined }),
      ),
    ).rejects.toMatchObject({ status: 500 });
  });
});
