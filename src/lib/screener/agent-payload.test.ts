import { describe, it, expect } from "vitest";
import { SCREENER_CONTRACT } from "./contract";
import { computeScores } from "./scoring";
import { buildAgentPayload } from "./agent-payload";
import type { AgentPayloadInput } from "./agent-payload";

const DIMS = SCREENER_CONTRACT.dimensoes;

function makeInput(overrides: Partial<AgentPayloadInput> = {}): AgentPayloadInput {
  const dimensionAnswers = DIMS.map((d) => ({ dimensionId: d.id, nivel: 3 }));
  const result = computeScores(SCREENER_CONTRACT, dimensionAnswers, {
    ctx_01: "C-level (CEO, CTO, CFO, CIO)",
    ctx_02: "51 a 200",
  });
  return {
    contract: SCREENER_CONTRACT,
    respondent: { name: "João Silva", role: "CTO" },
    company: { name: "Corp LTDA", size: "51 a 200" },
    contextAnswers: { ctx_01: "C-level (CEO, CTO, CFO, CIO)", ctx_02: "51 a 200" },
    dimensionAnswers,
    commercialAnswer: "Entre R$ 50 mil e R$ 250 mil",
    result,
    consent: {
      accepted: true,
      text: "Autorizo o uso dos dados para fins de diagnóstico.",
      acceptedAt: "2026-08-23T12:00:00Z",
    },
    ...overrides,
  };
}

describe("buildAgentPayload", () => {
  it("gera payload com versão 1.0", () => {
    const payload = buildAgentPayload(makeInput());
    expect(payload.versao).toBe("1.0");
  });

  it("contém solicitante com nome e cargo", () => {
    const payload = buildAgentPayload(makeInput());
    expect(payload.solicitante.nome).toBe("João Silva");
    expect(payload.solicitante.cargo).toBe("CTO");
  });

  it("contém empresa com nome e porte", () => {
    const payload = buildAgentPayload(makeInput());
    expect(payload.empresa.nome).toBe("Corp LTDA");
    expect(payload.empresa.porte).toBe("51 a 200");
  });

  it("empresa nula quando não fornecida", () => {
    const payload = buildAgentPayload(makeInput({ company: undefined }));
    expect(payload.empresa.nome).toBeNull();
    expect(payload.empresa.porte).toBeNull();
  });

  it("contém contexto das perguntas de contexto", () => {
    const payload = buildAgentPayload(makeInput());
    expect(payload.contexto.ctx_01).toBe("C-level (CEO, CTO, CFO, CIO)");
    expect(payload.contexto.ctx_02).toBe("51 a 200");
  });

  it("contém 10 respostas pontuadas", () => {
    const payload = buildAgentPayload(makeInput());
    expect(payload.respostas).toHaveLength(10);
  });

  it("cada resposta tem dimensao_id, dimensao, pergunta, nivel, peso, resposta", () => {
    const payload = buildAgentPayload(makeInput());
    for (const r of payload.respostas) {
      expect(r.dimensao_id.length).toBeGreaterThan(0);
      expect(r.dimensao.length).toBeGreaterThan(0);
      expect(r.pergunta.length).toBeGreaterThan(0);
      expect(r.nivel).toBeGreaterThanOrEqual(1);
      expect(r.nivel).toBeLessThanOrEqual(5);
      expect(r.peso).toBeGreaterThan(0);
      expect(r.resposta.length).toBeGreaterThan(0);
    }
  });

  it("contém resposta_comercial", () => {
    const payload = buildAgentPayload(makeInput());
    expect(payload.resposta_comercial.pergunta.length).toBeGreaterThan(0);
    expect(payload.resposta_comercial.resposta).toBe("Entre R$ 50 mil e R$ 250 mil");
  });

  it("contém score com valor, faixa e descricao", () => {
    const payload = buildAgentPayload(makeInput());
    expect(payload.score.valor).toBe(3.0);
    expect(payload.score.faixa).toBe("Estruturado");
    expect(payload.score.descricao.length).toBeGreaterThan(0);
  });

  it("contém risco com dimensao_id e nivel", () => {
    const payload = buildAgentPayload(makeInput());
    expect(payload.risco.dimensao_id.length).toBeGreaterThan(0);
    expect(payload.risco.nivel).toBeGreaterThanOrEqual(1);
  });

  it("contém desequilibrio booleano", () => {
    const payload = buildAgentPayload(makeInput());
    expect(typeof payload.desequilibrio).toBe("boolean");
  });

  it("contém consentimento", () => {
    const payload = buildAgentPayload(makeInput());
    expect(payload.consentimento.aceito).toBe(true);
    expect(payload.consentimento.texto.length).toBeGreaterThan(0);
    expect(payload.consentimento.aceito_em).toBe("2026-08-23T12:00:00Z");
  });
});
