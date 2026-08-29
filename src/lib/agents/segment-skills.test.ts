import { describe, it, expect, vi, beforeEach } from "vitest";
import { readFileSync } from "node:fs";
import { existsSync } from "node:fs";
import { SEGMENT_SKILL_MAP, loadSegmentSkill } from "./segment-skills";
import path from "node:path";

vi.mock("node:fs", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:fs")>();
  return {
    ...actual,
    readFileSync: vi.fn(actual.readFileSync),
  };
});

const SKILL_DIR = path.resolve(
  process.cwd(),
  "docs",
  "agents",
  "skills",
  "segmentos",
);

beforeEach(() => {
  vi.clearAllMocks();
});

describe("SEGMENT_SKILL_MAP", () => {
  it("cobre os 5 segmentos do contrato", () => {
    expect(Object.keys(SEGMENT_SKILL_MAP).sort()).toEqual([
      "Finanças/Fintech",
      "Indústria",
      "Saúde",
      "Serviços",
      "Varejo",
    ]);
  });

  it("mapeia segmentos para os slugs esperados", () => {
    expect(SEGMENT_SKILL_MAP["Indústria"]).toBe("industria");
    expect(SEGMENT_SKILL_MAP["Varejo"]).toBe("varejo");
    expect(SEGMENT_SKILL_MAP["Serviços"]).toBe("servicos");
    expect(SEGMENT_SKILL_MAP["Saúde"]).toBe("saude");
    expect(SEGMENT_SKILL_MAP["Finanças/Fintech"]).toBe("financas");
  });

  it("cada arquivo da skill existe em docs/agents/skills/segmentos", () => {
    for (const slug of Object.values(SEGMENT_SKILL_MAP)) {
      const file = path.join(SKILL_DIR, `${slug}.md`);
      expect(existsSync(file)).toBe(true);
    }
  });
});

describe("loadSegmentSkill", () => {
  it("retorna o conteúdo do arquivo para segmento mapeado", () => {
    const skill = loadSegmentSkill("Indústria");
    expect(skill.length).toBeGreaterThan(0);
    expect(skill.toLowerCase()).toContain("indústria");
  });

  it("retorna o conteúdo real do arquivo (não o fallback)", () => {
    const skill = loadSegmentSkill("Varejo");
    const conteudo = readFileSync(path.join(SKILL_DIR, "varejo.md"), "utf-8");
    expect(skill).toBe(conteudo);
  });

  it("retorna fallback genérico para segmento desconhecido", () => {
    const skill = loadSegmentSkill("Tecnologia");
    expect(skill.toLowerCase()).toContain("segmento");
  });

  it("retorna fallback genérico para segmento nulo", () => {
    const skill = loadSegmentSkill(null as unknown as string);
    expect(skill.length).toBeGreaterThan(0);
  });

  it("retorna fallback quando o arquivo da skill existe mas a leitura falha", () => {
    vi.mocked(readFileSync).mockImplementationOnce(() => {
      throw new Error("ENOENT: leitura falhou");
    });
    const skill = loadSegmentSkill("Indústria");
    expect(skill.length).toBeGreaterThan(0);
    expect(skill).toContain("Contexto de segmento não informado");
  });

  it("não retorna string vazia em nenhum caminho", () => {
    for (const segmento of Object.keys(SEGMENT_SKILL_MAP)) {
      expect(loadSegmentSkill(segmento).length).toBeGreaterThan(0);
    }
    expect(loadSegmentSkill("Desconhecido").length).toBeGreaterThan(0);
  });
});
