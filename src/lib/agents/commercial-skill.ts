import { readFileSync } from "node:fs";
import path from "node:path";

export class CommercialSkillError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "CommercialSkillError";
  }
}

const SPIN_SKILL_PATH = path.resolve(
  process.cwd(),
  "docs",
  "agents",
  "skills",
  "comercial",
  "spin-selling.md",
);

export function loadSpinSkill(
  readFile: (path: string, encoding: "utf-8") => string = (file, encoding) =>
    readFileSync(file, encoding),
): string {
  try {
    return readFile(SPIN_SKILL_PATH, "utf-8");
  } catch (err) {
    throw new CommercialSkillError(
      `Skill SPIN indisponível: ${err instanceof Error ? err.message : "erro desconhecido"}`,
      { cause: err },
    );
  }
}
