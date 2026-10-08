import { describe, it, expect } from "vitest";
import { getStageByFaixa, CMMI_BAND_LABELS } from "./stages";

const CABECALHO = "10: band10\n11: band11\n12: band12\n13: band13\n14: band14\n15: band15";

describe("getStageByFaixa", () => {
  const RHEMA_PALETTE = ["#4a2c7d", "#3b2366"];
  it("retorna conteúdo para as 5 faixas do contrato", () => {
    for (const rotulo of ["Inicial", "Emergente", "Estruturado", "Gerenciado", "Otimizado"]) {
      const stage = getStageByFaixa(rotulo);
      expect(stage.rotulo).toBe(rotulo);
      expect(stage.caracteristicas.length).toBeGreaterThan(0);
      expect(stage.sinaisRisco.length).toBeGreaterThan(0);
      expect(stage.comoSubir.length).toBeGreaterThan(0);
      expect(stage.descricaoExecutiva.length).toBeGreaterThan(0);
    }
  });

  it("rótulos cobrem exatamente os do scoring.faixas do contrato", () => {
    expect(CMMI_BAND_LABELS).toEqual([
      "Inicial",
      "Emergente",
      "Estruturado",
      "Gerenciado",
      "Otimizado",
    ]);
  });

  it("Inicial retorna range 1.0–1.8 e cor da paleta Rhema", () => {
    const stage = getStageByFaixa("Inicial");
    expect(stage.range).toEqual({ min: 1.0, max: 1.8 });
    for (const rotulo of CMMI_BAND_LABELS) {
      expect(RHEMA_PALETTE).toContain(getStageByFaixa(rotulo).cor.toLowerCase());
    }
  });

  it("Emergente retorna range 1.8–2.6", () => {
    expect(getStageByFaixa("Emergente").range).toEqual({ min: 1.8, max: 2.6 });
  });

  it("Estruturado retorna range 2.6–3.4", () => {
    expect(getStageByFaixa("Estruturado").range).toEqual({ min: 2.6, max: 3.4 });
  });

  it("Gerenciado retorna range 3.4–4.2", () => {
    expect(getStageByFaixa("Gerenciado").range).toEqual({ min: 3.4, max: 4.2 });
  });

  it("Otimizado retorna range 4.2–5.0", () => {
    expect(getStageByFaixa("Otimizado").range).toEqual({ min: 4.2, max: 5.0 });
  });

  it("descricaoExecutiva é baseada na descrição da faixa do contrato", () => {
    const stage = getStageByFaixa("Inicial");
    expect(stage.descricaoExecutiva.toLowerCase()).toContain("reativa");
  });

  it("rótulo desconhecido retorna fallback seguro sem lançar", () => {
    expect(() => getStageByFaixa("Faixa Inexistente")).not.toThrow();
    const stage = getStageByFaixa("Faixa Inexistente");
    expect(stage.rotulo).toBe("Faixa Inexistente");
    expect(stage.caracteristicas.length).toBeGreaterThan(0);
    expect(stage.sinaisRisco.length).toBeGreaterThan(0);
    expect(stage.comoSubir.length).toBeGreaterThan(0);
  });

  it("rótulo vazio retorna fallback seguro", () => {
    expect(() => getStageByFaixa("")).not.toThrow();
    expect(getStageByFaixa("").caracteristicas.length).toBeGreaterThan(0);
  });
});
