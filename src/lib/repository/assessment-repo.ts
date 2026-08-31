import type { SupabaseClient } from "@supabase/supabase-js";

export interface AssessmentResponseRow {
  id: string;
  lead_id: string;
  context: unknown;
  answers: unknown;
  commercial_answer: unknown;
  consent: unknown;
  agent_payload: unknown;
  created_at: string;
}

export function createAssessmentRepository(supabase: SupabaseClient) {
  return {
    async existsForLead(leadId: string): Promise<boolean> {
      const { data, error } = await supabase
        .from("assessment_responses")
        .select("id")
        .eq("lead_id", leadId)
        .maybeSingle();
      if (error) throw error;
      return data !== null;
    },

    async createAssessmentResponse(params: {
      leadId: string;
      context: Record<string, string>;
      profile: Record<string, string>;
      answers: unknown;
      commercialAnswer: unknown;
      consent: unknown;
      agentPayload: unknown;
    }): Promise<void> {
      const { error } = await supabase.from("assessment_responses").insert({
        lead_id: params.leadId,
        context: params.context,
        answers: params.answers,
        commercial_answer: params.commercialAnswer,
        consent: params.consent,
        agent_payload: params.agentPayload,
      });
      if (error) throw error;
    },

    async createDiagnostic(params: {
      leadId: string;
      overallScore: number;
      overallLevel: number;
      dimensionScores: unknown;
      narrative: unknown;
      chartData: unknown;
    }): Promise<void> {
      const { error } = await supabase.from("diagnostics").insert({
        lead_id: params.leadId,
        overall_score: params.overallScore,
        overall_level: params.overallLevel,
        dimension_scores: params.dimensionScores,
        narrative: params.narrative,
        chart_data: params.chartData,
      });
      if (error) throw error;
    },

    async findByLeadId(
      leadId: string,
    ): Promise<AssessmentResponseRow | null> {
      const { data, error } = await supabase
        .from("assessment_responses")
        .select(
          "id, lead_id, context, answers, commercial_answer, consent, agent_payload, created_at",
        )
        .eq("lead_id", leadId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  };
}

export type AssessmentRepository = ReturnType<
  typeof createAssessmentRepository
>;
