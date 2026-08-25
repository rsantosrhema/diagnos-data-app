import type { ScreenerContract } from "./contract";
import type { ScreenerResult } from "./scoring";

// --- Types ---

export interface AgentPayloadInput {
  contract: ScreenerContract;
  respondent: { name: string; role: string };
  company?: { name?: string; size?: string };
  profileAnswers?: Record<string, string>;
  contextAnswers: Record<string, string>;
  dimensionAnswers: { dimensionId: string; nivel: number }[];
  commercialAnswer: string;
  result: ScreenerResult;
  consent: { accepted: boolean; text: string; acceptedAt: string };
}

export interface AgentPayload {
  versao: string;
  solicitante: { nome: string; cargo: string };
  empresa: {
    nome: string | null;
    porte: string | null;
    segmento: string | null;
    funcionarios: string | null;
    faturamento: string | null;
  };
  contexto: Record<string, string>;
  perfil_empresa: Record<string, string>;
  respostas: {
    dimensao_id: string;
    dimensao: string;
    pergunta: string;
    nivel: number;
    peso: number;
    resposta: string;
  }[];
  resposta_comercial: { pergunta: string; resposta: string };
  score: { valor: number; faixa: string; descricao: string };
  risco: { dimensao_id: string; nivel: number };
  desequilibrio: boolean;
  consentimento: { aceito: boolean; texto: string; aceito_em: string };
}

// --- Builder ---

export function buildAgentPayload(input: AgentPayloadInput): AgentPayload {
  const {
    contract,
    respondent,
    company,
    profileAnswers,
    contextAnswers,
    dimensionAnswers,
    commercialAnswer,
    result,
    consent,
  } = input;

  const respostas = dimensionAnswers.map((a) => {
    const dim = contract.dimensoes.find((d) => d.id === a.dimensionId)!;
    const opcao = dim.opcoes.find((o) => o.nivel === a.nivel);
    return {
      dimensao_id: dim.id,
      dimensao: dim.nome,
      pergunta: dim.pergunta,
      nivel: a.nivel,
      peso: dim.peso,
      resposta: opcao?.texto ?? "",
    };
  });

  const profileAnswersFlat = profileAnswers ?? {};

  return {
    versao: "1.0",
    solicitante: { nome: respondent.name, cargo: respondent.role },
    empresa: {
      nome: company?.name ?? null,
      porte: company?.size ?? null,
      segmento: profileAnswersFlat.perfil_01 ?? null,
      funcionarios: profileAnswersFlat.perfil_02 ?? null,
      faturamento: profileAnswersFlat.perfil_03 ?? null,
    },
    contexto: { ...contextAnswers },
    perfil_empresa: { ...profileAnswersFlat },
    respostas,
    resposta_comercial: {
      pergunta: contract.pergunta_comercial.pergunta,
      resposta: commercialAnswer,
    },
    score: {
      valor: Number(result.score.toFixed(2)),
      faixa: result.band.rotulo,
      descricao: result.band.descricao,
    },
    risco: {
      dimensao_id: result.riskDimension.id,
      nivel: result.riskDimension.nivel,
    },
    desequilibrio: result.imbalance,
    consentimento: {
      aceito: consent.accepted,
      texto: consent.text,
      aceito_em: consent.acceptedAt,
    },
  };
}
