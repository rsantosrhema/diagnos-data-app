import { readFileSync } from "node:fs";
import { existsSync } from "node:fs";
import path from "node:path";

export const SEGMENT_SKILL_MAP: Record<string, string> = {
  "Indústria": "industria",
  "Varejo": "varejo",
  "Serviços": "servicos",
  "Saúde": "saude",
  "Finanças/Fintech": "financas",
};

const SKILL_DIR = path.resolve(
  process.cwd(),
  "docs",
  "agents",
  "skills",
  "segmentos",
);

export const GENERIC_SEGMENT_SKILL = `Contexto de segmento não informado. Use exclusivamente as evidências de mercado levantadas na pesquisa para correlacionar com os scores do formulário, sem assumir particularidades de segmento.`;

export function loadSegmentSkill(segmento: string): string {
  const slug = SEGMENT_SKILL_MAP[segmento];
  if (!slug) return GENERIC_SEGMENT_SKILL;

  const file = path.join(SKILL_DIR, `${slug}.md`);
  if (!existsSync(file)) return GENERIC_SEGMENT_SKILL;

  try {
    return readFileSync(file, "utf-8");
  } catch {
    return GENERIC_SEGMENT_SKILL;
  }
}
