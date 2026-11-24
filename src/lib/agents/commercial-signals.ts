import type { AgentPayload } from "@/lib/screener/agent-payload";

export interface CommercialSignals {
  menorNivel: string[];
  desequilibrio: boolean;
  cLevel: boolean;
  faixa: string;
  scoreValor: number;
  respostaComercial: string;
}

export function buildCommercialSignals(payload: AgentPayload): CommercialSignals {
  const lowestLevel = Math.min(...payload.respostas.map((answer) => answer.nivel));

  return {
    menorNivel: payload.respostas
      .filter((answer) => answer.nivel === lowestLevel)
      .map((answer) => answer.dimensao_id),
    desequilibrio: payload.desequilibrio,
    cLevel: payload.solicitante.cargo.toLowerCase().includes("c-level"),
    faixa: payload.score.faixa,
    scoreValor: payload.score.valor,
    respostaComercial: payload.resposta_comercial.resposta,
  };
}
