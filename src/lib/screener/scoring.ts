import {
  SCREENER_CONTRACT,
  getDimensionById,
  type ScreenerContract,
  type ScoreBand,
} from "./contract";

export interface DimensionAnswer {
  dimensionId: string;
  nivel: number; // 1–5
}

export interface ScreenerResult {
  score: number;
  band: ScoreBand;
  riskDimension: { id: string; name: string; nivel: number };
  imbalance: boolean;
  cLevel: boolean;
  dimensionScores: {
    id: string;
    name: string;
    nivel: number;
    peso: number;
    score: number; // nivel * peso
  }[];
}

export class ScoringError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ScoringError";
  }
}

// --- Scoring engine ---

export function computeScores(
  contract: ScreenerContract,
  answers: DimensionAnswer[],
  contextAnswers: Record<string, string>,
  role?: string,
): ScreenerResult {
  if (answers.length !== contract.dimensoes.length) {
    throw new ScoringError(
      `Esperadas ${contract.dimensoes.length} respostas, recebidas ${answers.length}`,
    );
  }

  const dimensionScores = answers.map((a) => {
    const dim = getDimensionById(a.dimensionId);
    if (!dim) {
      throw new ScoringError(`Dimensão desconhecida: ${a.dimensionId}`);
    }
    if (a.nivel < 1 || a.nivel > 5 || !Number.isInteger(a.nivel)) {
      throw new ScoringError(
        `Nível inválido para ${a.dimensionId}: ${a.nivel}`,
      );
    }
    return {
      id: dim.id,
      name: dim.nome,
      nivel: a.nivel,
      peso: dim.peso,
      score: a.nivel * dim.peso,
    };
  });

  const totalScore = dimensionScores.reduce((sum, d) => sum + d.score, 0);
  const score = totalScore / 100;

  const band = mapToBand(contract, score);

  const sorted = [...dimensionScores].sort((a, b) => a.nivel - b.nivel);
  const lowest = sorted[0];
  const highest = sorted[sorted.length - 1];

  const riskDimension = {
    id: lowest.id,
    name: lowest.name,
    nivel: lowest.nivel,
  };

  const imbalance = highest.nivel - lowest.nivel > 3;

  const cLevel = detectCLevel(role);

  return { score, band, riskDimension, imbalance, cLevel, dimensionScores };
}

function mapToBand(contract: ScreenerContract, score: number): ScoreBand {
  const faixas = contract.scoring.faixas;
  for (const faixa of faixas) {
    const isLast = faixa === faixas[faixas.length - 1];
    if (isLast) {
      if (score >= faixa.min && score <= faixa.max) return faixa;
    } else {
      if (score >= faixa.min && score < faixa.max) return faixa;
    }
  }
  throw new ScoringError(
    `Score ${score.toFixed(2)} não encontrado em nenhuma faixa`,
  );
}

function detectCLevel(role?: string): boolean {
  if (!role) return false;
  return role.toLowerCase().includes("c-level");
}
