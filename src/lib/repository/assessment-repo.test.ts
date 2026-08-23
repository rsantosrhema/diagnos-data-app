import { describe, it, expect, vi } from "vitest";
import { createAssessmentRepository } from "./assessment-repo";

function mockSupabase(insertResult: { error: unknown | null } = { error: null }) {
  const insert = vi.fn().mockResolvedValue(insertResult);
  const select = vi.fn().mockReturnValue({
    eq: vi.fn().mockReturnValue({
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    }),
  });
  return {
    from: vi.fn().mockReturnValue({ insert, select }),
    _insert: insert,
    _select: select,
  };
}

describe("AssessmentRepository", () => {
  describe("createAssessmentResponse", () => {
    it("insere na tabela assessment_responses", async () => {
      const sb = mockSupabase();
      const repo = createAssessmentRepository(sb as never);

      await repo.createAssessmentResponse({
        leadId: "lead-1",
        context: { ctx_01: "C-level", ctx_02: "51 a 200" },
        answers: [],
        commercialAnswer: "Até R$ 50 mil",
        consent: { accepted: true },
        agentPayload: { versao: "1.0" },
      });

      expect(sb.from).toHaveBeenCalledWith("assessment_responses");
      expect(sb._insert).toHaveBeenCalledWith(
        expect.objectContaining({
          lead_id: "lead-1",
          context: { ctx_01: "C-level", ctx_02: "51 a 200" },
        }),
      );
    });

    it("propaga erro do Supabase", async () => {
      const sb = mockSupabase({ error: new Error("duplicate") });
      const repo = createAssessmentRepository(sb as never);

      await expect(
        repo.createAssessmentResponse({
          leadId: "lead-1",
          context: {},
          answers: [],
          commercialAnswer: "",
          consent: {},
          agentPayload: {},
        }),
      ).rejects.toThrow("duplicate");
    });
  });

  describe("createDiagnostic", () => {
    it("insere na tabela diagnostics", async () => {
      const sb = mockSupabase();
      const repo = createAssessmentRepository(sb as never);

      await repo.createDiagnostic({
        leadId: "lead-1",
        overallScore: 3.0,
        overallLevel: 3,
        dimensionScores: [],
        narrative: {},
        chartData: {},
      });

      expect(sb.from).toHaveBeenCalledWith("diagnostics");
      expect(sb._insert).toHaveBeenCalledWith(
        expect.objectContaining({
          lead_id: "lead-1",
          overall_score: 3.0,
          overall_level: 3,
        }),
      );
    });
  });

  describe("findByLeadId", () => {
    it("retorna null quando não encontra", async () => {
      const sb = mockSupabase();
      const repo = createAssessmentRepository(sb as never);

      const result = await repo.findByLeadId("lead-inexistente");
      expect(result).toBeNull();
    });
  });
});
