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

function payloadComLocalizacao(localizacao: Record<string, unknown>) {
  return { ...validPayload, empresa: { ...validPayload.empresa, ...localizacao } };
}

function parseValido(input: unknown) {
  const result = agentPayloadSchema.safeParse(input);
  if (!result.success) throw new Error(`payload deveria ser válido: ${result.error.message}`);
  return result.data;
}

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

  it("aceita payload legado sem empresa.cidade e empresa.estado", () => {
    const parsed = parseValido(validPayload);
    expect(parsed.empresa.cidade).toBeUndefined();
    expect(parsed.empresa.estado).toBeUndefined();
  });

  it("preserva empresa.cidade e empresa.estado quando presentes", () => {
    const parsed = parseValido(payloadComLocalizacao({ cidade: "São Paulo", estado: "SP" }));
    expect(parsed.empresa.cidade).toBe("São Paulo");
    expect(parsed.empresa.estado).toBe("SP");
  });

  it("aceita empresa.cidade e empresa.estado nulos", () => {
    const parsed = parseValido(payloadComLocalizacao({ cidade: null, estado: null }));
    expect(parsed.empresa.cidade).toBeNull();
    expect(parsed.empresa.estado).toBeNull();
  });

  it("aceita localização parcial (cidade nula e estado preenchido)", () => {
    const parsed = parseValido(payloadComLocalizacao({ cidade: null, estado: "SP" }));
    expect(parsed.empresa.cidade).toBeNull();
    expect(parsed.empresa.estado).toBe("SP");
  });

  it("rejeita empresa.cidade não string", () => {
    const result = agentPayloadSchema.safeParse(payloadComLocalizacao({ cidade: 123 }));
    expect(result.success).toBe(false);
  });

  it("rejeita empresa.estado não string", () => {
    const result = agentPayloadSchema.safeParse(payloadComLocalizacao({ estado: 123 }));
    expect(result.success).toBe(false);
  });

  it("rejeita chave extra no root mesmo com localização (strict)", () => {
    const result = agentPayloadSchema.safeParse({
      ...payloadComLocalizacao({ cidade: "São Paulo", estado: "SP" }),
      hacker: true,
    });
    expect(result.success).toBe(false);
  });
});
