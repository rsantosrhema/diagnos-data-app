import { describe, it, expect } from "vitest";
import { buildCommercialSignals } from "./commercial-signals";
import type { AgentPayload } from "@/lib/screener/agent-payload";

function makePayload(overrides: Partial<AgentPayload> = {}): AgentPayload {
  return {
    versao: "1.0",
    solicitante: { nome: "João", cargo: "CTO" },
    empresa: {
      nome: "Corp",
      porte: null,
      segmento: "Indústria",
      funcionarios: null,
      faturamento: null,
    },
    contexto: {},
    perfil_empresa: {},
    respostas: [
      { dimensao_id: "d01", dimensao: "Governança", pergunta: "P?", nivel: 2, peso: 10, resposta: "Ad hoc" },
      { dimensao_id: "d02", dimensao: "Patrocínio", pergunta: "P?", nivel: 1, peso: 10, resposta: "Sem patrocínio" },
      { dimensao_id: "d03", dimensao: "Arquitetura", pergunta: "P?", nivel: 1, peso: 10, resposta: "Silos" },
      { dimensao_id: "d04", dimensao: "Qualidade", pergunta: "P?", nivel: 3, peso: 10, resposta: "Definido" },
    ],
    resposta_comercial: { pergunta: "Q?", resposta: "Até R$ 50 mil" },
    score: { valor: 2.1, faixa: "Emergente", descricao: "Início" },
    risco: { dimensao_id: "d02", nivel: 1 },
    desequilibrio: true,
    consentimento: { aceito: true, texto: "ok", aceito_em: "2026-08-23T12:00:00Z" },
    ...overrides,
  };
}

describe("buildCommercialSignals", () => {
  it("devolve todas as dimensões empatadas no menor nível, na ordem do payload", () => {
    const signals = buildCommercialSignals(makePayload());

    expect(signals.menorNivel).toEqual(["d02", "d03"]);
  });

  it("devolve uma única dimensão quando não há empate no menor nível", () => {
    const payload = makePayload();
    payload.respostas[2].nivel = 2;

    const signals = buildCommercialSignals(payload);

    expect(signals.menorNivel).toEqual(["d02"]);
  });

  it("detecta C-level sem diferenciar maiúsculas", () => {
    const cLevel = buildCommercialSignals(
      makePayload({ solicitante: { nome: "Ana", cargo: "C-level (CEO, CTO, CFO, CIO)" } }),
    );
    const lower = buildCommercialSignals(
      makePayload({ solicitante: { nome: "Ana", cargo: "c-LEVEL" } }),
    );

    expect(cLevel.cLevel).toBe(true);
    expect(lower.cLevel).toBe(true);
  });

  it("não marca C-level para cargo operacional ou vazio", () => {
    const analyst = buildCommercialSignals(
      makePayload({ solicitante: { nome: "Ana", cargo: "Analista, engenheiro ou especialista" } }),
    );
    const empty = buildCommercialSignals(
      makePayload({ solicitante: { nome: "Ana", cargo: "" } }),
    );

    expect(analyst.cLevel).toBe(false);
    expect(empty.cLevel).toBe(false);
  });

  it("copia desequilibrio, faixa, score e resposta comercial do payload", () => {
    const signals = buildCommercialSignals(
      makePayload({
        desequilibrio: false,
        score: { valor: 3.7, faixa: "Gerenciado", descricao: "Consolidado" },
        resposta_comercial: { pergunta: "Q?", resposta: "Ainda não definido" },
      }),
    );

    expect(signals.desequilibrio).toBe(false);
    expect(signals.faixa).toBe("Gerenciado");
    expect(signals.scoreValor).toBe(3.7);
    expect(signals.respostaComercial).toBe("Ainda não definido");
  });
});
