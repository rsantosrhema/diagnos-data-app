import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { join, relative, sep } from "node:path";

const ROOT = process.cwd();
const API_DIR = join(ROOT, "src", "app", "api");
const PUBLIC_DIR = join(ROOT, "src", "app", "r");
const ALLOWED_API_FILE = "src/app/api/analysis-worker/route.ts";

function listFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name);
    return entry.isDirectory() ? listFiles(full) : [full];
  });
}

function relativePath(full: string): string {
  return relative(ROOT, full).split(sep).join("/");
}

function filesMentioningArsenal(dir: string): string[] {
  return listFiles(dir)
    .filter((file) => /arsenal/i.test(readFileSync(file, "latin1")))
    .map(relativePath);
}

describe("Arsenal fora da superfície pública (ARS-42)", () => {
  it("não tem arsenal no caminho de nenhum arquivo de src/app/api nem src/app/r", () => {
    const paths = [...listFiles(API_DIR), ...listFiles(PUBLIC_DIR)].map(relativePath);

    expect(paths.filter((path) => /arsenal/i.test(path))).toEqual([]);
  });

  it("não menciona arsenal em nenhum arquivo de src/app/r", () => {
    expect(filesMentioningArsenal(PUBLIC_DIR)).toEqual([]);
  });

  it("só permite menção ao arsenal no worker, fora de qualquer outra rota de src/app/api", () => {
    const allowed = new Set([ALLOWED_API_FILE]);
    const unexpected = filesMentioningArsenal(API_DIR).filter(
      (file) => !allowed.has(file),
    );

    expect(unexpected).toEqual([]);
  });
});
