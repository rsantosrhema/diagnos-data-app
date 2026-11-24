import { describe, it, expect } from "vitest";
import { CommercialSkillError, loadSpinSkill } from "./commercial-skill";

const HEADINGS = [
  "# Skill: SPIN Selling para o Arsenal Comercial",
  "## Situação",
  "## Problema",
  "## Implicação",
  "## Necessidade de solução",
  "## Como usar o diagnóstico",
  "## Objeções",
  "## O que nunca fazer",
];

describe("loadSpinSkill", () => {
  it("devolve o texto da skill com todas as seções obrigatórias", () => {
    const skill = loadSpinSkill();

    for (const heading of HEADINGS) {
      expect(skill).toContain(heading);
    }
  });

  it("lança CommercialSkillError quando a leitura falha", () => {
    const readFile = () => {
      throw new Error("ENOENT");
    };

    let error: unknown;
    try {
      loadSpinSkill(readFile);
    } catch (err) {
      error = err;
    }

    expect(error).toBeInstanceOf(CommercialSkillError);
    expect((error as Error).message.startsWith("Skill SPIN indisponível")).toBe(true);
  });

  it("mantém a skill curta e sem preço, prazo concreto, cliente ou percentual", () => {
    const skill = loadSpinSkill();
    const lines = skill.split("\n");

    expect(lines.length).toBeLessThanOrEqual(120);
    expect(skill).not.toContain("R$");
    expect(skill).not.toContain("%");
    expect(skill).not.toMatch(/\b\d+\s*(dias?|semanas?|meses?|anos?)\b/i);
    expect(skill).not.toMatch(/https?:\/\//);
  });
});
