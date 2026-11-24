import type { AgentPayload } from "@/lib/schemas/agent-payload";
import type { GeneratePdfInput } from "@/lib/service/screen-service";
import { describeDimension } from "@/lib/maturity/methodology";

export function buildPdfInput(
  payload: AgentPayload,
  extras: {
    analysis?: GeneratePdfInput["analysis"];
    insights?: GeneratePdfInput["insights"];
    arsenal?: GeneratePdfInput["arsenal"];
  },
  location?: NonNullable<GeneratePdfInput["location"]>,
): GeneratePdfInput {
  const dimensionScores = payload.respostas.map((r) => ({
    name: r.dimensao,
    nivel: r.nivel,
    peso: r.peso,
    ...describeDimension(r.dimensao_id, r.peso),
  }));
  const riskDim = payload.respostas.find(
    (r) => r.dimensao_id === payload.risco.dimensao_id,
  );
  return {
    respondentName: payload.solicitante.nome,
    band: { rotulo: payload.score.faixa, descricao: payload.score.descricao },
    dimensionScores,
    riskDimension: { name: riskDim?.dimensao ?? "Dimensão", nivel: payload.risco.nivel },
    imbalance: payload.desequilibrio,
    commercialAnswer: payload.resposta_comercial.resposta,
    ...(location ? { location } : {}),
    ...(extras.analysis ? { analysis: extras.analysis } : {}),
    ...(extras.insights ? { insights: extras.insights } : {}),
    ...(extras.arsenal ? { arsenal: extras.arsenal } : {}),
  };
}
