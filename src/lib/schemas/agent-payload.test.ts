import { describe, it, expect } from "vitest";
import { agentPayloadSchema } from "./agent-payload";

const validPayload = {
  versao: "1.0",
  solicitante: { nome: "Ana", cargo: "CTO" },
  empresa: {
    nome: "Corp",
    porte: "Médio",
    segmento: "Indústria",
    funcionarios: "51 a 200",
    faturamento: "R$ 5 a 50 milhões",
  },
  contexto: { perfil_01: "Indústria" },
  perfil_empresa: { perfil_01: "Indústria" },
  respostas: [
    {
      dimensao_id: "d01",
      dimensao: "Governança",
      pergunta: "Pergunta",
      nivel: 2,
      peso: 10,
      resposta: "Ad hoc",
    },
  ],
  resposta_comercial: { pergunta: "Q?", resposta: "Até R$ 50 mil" },
  score: { valor: 2.1, faixa: "Emergente", descricao: "Início" },
  risco: { dimensao_id: "d01", nivel: 2 },
  desequilibrio: false,
  consentimento: { aceito: true, texto: "ok", aceito_em: "2026-08-23T12:00:00Z" },
};

describe("agentPayloadSchema", () => {
  it("aceita payload válido", () => {
    const result = agentPayloadSchema.safeParse(validPayload);
    expect(result.success).toBe(true);
  });

  it("rejeita payload com score.faixa ausente", () => {
    const { faixa, ...rest } = validPayload.score;
    const result = agentPayloadSchema.safeParse({ ...validPayload, score: rest });
    expect(result.success).toBe(false);
  });

  it("rejeita nivel fora de 1..5", () => {
    const result = agentPayloadSchema.safeParse({
      ...validPayload,
      respostas: [{ ...validPayload.respostas[0], nivel: 9 }],
    });
    expect(result.success).toBe(false);
  });

  it("rejeita respostas vazias (pipeline sem dados)", () => {
    const result = agentPayloadSchema.safeParse({ ...validPayload, respostas: [] });
    expect(result.success).toBe(false);
  });

  it("rejeita campos extras (strict)", () => {
    const result = agentPayloadSchema.safeParse({ ...validPayload, hacker: true });
    expect(result.success).toBe(false);
  });
});
