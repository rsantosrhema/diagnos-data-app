# Harness Eval: Correctness (Track A)

> Generated: 2026-08-14T18:31:53.675985+00:00
> Method: deterministic path/command checks (no README)

## What these words mean

| Word | Meaning | You should |
|------|---------|------------|
| **BROKEN** | A cited path or command does not exist (high-precision check) | Fix the cite or restore the file |
| **OK path-cites** | Concrete path cites that resolved | No action |

This track answers: *is the harness factually wrong about paths/commands?* Not redundancy (`07`) or usefulness (`10`).

## Executive summary

- T0: 1 · T1: 4 · T2: 25
- Manifests: (none)
- Findings: **10 broken** · 51 path-cites ok

## Inventory

### T0

- `AGENTS.md`

### T1

- `.opencode/skills/create-adr/SKILL.md`
- `.opencode/skills/frontend-design/SKILL.md`
- `.opencode/skills/harness-eval/SKILL.md`
- `.opencode/skills/tlc-spec-driven/SKILL.md`

### T2

- `.opencode/command/init.md`
- `.opencode/opencode.json`
- `.opencode/skills/frontend-design/references/color-and-contrast.md`
- `.opencode/skills/frontend-design/references/interaction-design.md`
- `.opencode/skills/frontend-design/references/motion-design.md`
- `.opencode/skills/frontend-design/references/responsive-design.md`
- `.opencode/skills/frontend-design/references/spatial-design.md`
- `.opencode/skills/frontend-design/references/typography.md`
- `.opencode/skills/frontend-design/references/ux-writing.md`
- `.opencode/skills/harness-eval/references/GLOSSARY.md`
- `.opencode/skills/harness-eval/references/PROTOCOL.md`
- `.opencode/skills/harness-eval/references/claims.schema.json`
- `.opencode/skills/harness-eval/references/judge-prompts.md`
- `.opencode/skills/tlc-spec-driven/references/code-analysis.md`
- `.opencode/skills/tlc-spec-driven/references/coding-principles.md`
- `.opencode/skills/tlc-spec-driven/references/context-limits.md`
- `.opencode/skills/tlc-spec-driven/references/design.md`
- `.opencode/skills/tlc-spec-driven/references/discuss.md`
- `.opencode/skills/tlc-spec-driven/references/implement.md`
- `.opencode/skills/tlc-spec-driven/references/lessons.md`
- `.opencode/skills/tlc-spec-driven/references/memory.md`
- `.opencode/skills/tlc-spec-driven/references/specify.md`
- `.opencode/skills/tlc-spec-driven/references/sub-agents.md`
- `.opencode/skills/tlc-spec-driven/references/tasks.md`
- `.opencode/skills/tlc-spec-driven/references/validate.md`

## Findings

### [A001] BROKEN

- **Source:** `.opencode/skills/harness-eval/SKILL.md`
- **Claim:** Path cite `.agents/skills`
- **Reality:** File does not exist (case-sensitive check)
- **Evidence:** E:\OneDrive Rafael\OneDrive\Rhema Data\Aplicações\diagnos-data-app\.agents\skills; E:\OneDrive Rafael\OneDrive\Rhema Data\Aplicações\diagnos-data-app\.opencode\skills\harness-eval\.agents\skills

### [A002] BROKEN

- **Source:** `.opencode/skills/harness-eval/SKILL.md`
- **Claim:** Path cite `.cursor/skills`
- **Reality:** File does not exist (case-sensitive check)
- **Evidence:** E:\OneDrive Rafael\OneDrive\Rhema Data\Aplicações\diagnos-data-app\.cursor\skills; E:\OneDrive Rafael\OneDrive\Rhema Data\Aplicações\diagnos-data-app\.opencode\skills\harness-eval\.cursor\skills

### [A003] BROKEN

- **Source:** `.opencode/skills/harness-eval/SKILL.md`
- **Claim:** Path cite `lib/...`
- **Reality:** File does not exist (case-sensitive check)
- **Evidence:** E:\OneDrive Rafael\OneDrive\Rhema Data\Aplicações\diagnos-data-app\lib\...; E:\OneDrive Rafael\OneDrive\Rhema Data\Aplicações\diagnos-data-app\.opencode\skills\harness-eval\lib\...

### [A004] BROKEN

- **Source:** `.opencode/skills/harness-eval/SKILL.md`
- **Claim:** Path cite `test/...`
- **Reality:** File does not exist (case-sensitive check)
- **Evidence:** E:\OneDrive Rafael\OneDrive\Rhema Data\Aplicações\diagnos-data-app\test\...; E:\OneDrive Rafael\OneDrive\Rhema Data\Aplicações\diagnos-data-app\.opencode\skills\harness-eval\test\...

### [A005] BROKEN

- **Source:** `.opencode/skills/harness-eval/SKILL.md`
- **Claim:** Path cite `.agents/...`
- **Reality:** File does not exist (case-sensitive check)
- **Evidence:** E:\OneDrive Rafael\OneDrive\Rhema Data\Aplicações\diagnos-data-app\.agents\...; E:\OneDrive Rafael\OneDrive\Rhema Data\Aplicações\diagnos-data-app\.opencode\skills\harness-eval\.agents\...

### [A007] BROKEN

- **Source:** `.opencode/skills/harness-eval/SKILL.md`
- **Claim:** Path cite `.agents/…`
- **Reality:** File does not exist (case-sensitive check)
- **Evidence:** E:\OneDrive Rafael\OneDrive\Rhema Data\Aplicações\diagnos-data-app\.agents\…; E:\OneDrive Rafael\OneDrive\Rhema Data\Aplicações\diagnos-data-app\.opencode\skills\harness-eval\.agents\…

### [A008] BROKEN

- **Source:** `.opencode/skills/harness-eval/references/PROTOCOL.md`
- **Claim:** Path cite `.agents/skills`
- **Reality:** File does not exist (case-sensitive check)
- **Evidence:** E:\OneDrive Rafael\OneDrive\Rhema Data\Aplicações\diagnos-data-app\.agents\skills; E:\OneDrive Rafael\OneDrive\Rhema Data\Aplicações\diagnos-data-app\.opencode\skills\harness-eval\references\.agents\skills; E:\OneDrive Rafael\OneDrive\Rhema Data\Aplicações\diagnos-data-app\.opencode\skills\harness-eval\.agents\skills

### [A009] BROKEN

- **Source:** `.opencode/skills/harness-eval/references/PROTOCOL.md`
- **Claim:** Path cite `.cursor/skills`
- **Reality:** File does not exist (case-sensitive check)
- **Evidence:** E:\OneDrive Rafael\OneDrive\Rhema Data\Aplicações\diagnos-data-app\.cursor\skills; E:\OneDrive Rafael\OneDrive\Rhema Data\Aplicações\diagnos-data-app\.opencode\skills\harness-eval\references\.cursor\skills; E:\OneDrive Rafael\OneDrive\Rhema Data\Aplicações\diagnos-data-app\.opencode\skills\harness-eval\.cursor\skills

### [A010] BROKEN

- **Source:** `.opencode/skills/harness-eval/references/PROTOCOL.md`
- **Claim:** Path cite `bin/console`
- **Reality:** File does not exist (case-sensitive check)
- **Evidence:** E:\OneDrive Rafael\OneDrive\Rhema Data\Aplicações\diagnos-data-app\bin\console; E:\OneDrive Rafael\OneDrive\Rhema Data\Aplicações\diagnos-data-app\.opencode\skills\harness-eval\references\bin\console; E:\OneDrive Rafael\OneDrive\Rhema Data\Aplicações\diagnos-data-app\.opencode\skills\harness-eval\bin\console

### [A011] BROKEN

- **Source:** `.opencode/skills/harness-eval/references/PROTOCOL.md`
- **Claim:** Path cite `references/view.md`
- **Reality:** File does not exist (case-sensitive check)
- **Evidence:** E:\OneDrive Rafael\OneDrive\Rhema Data\Aplicações\diagnos-data-app\references\view.md; E:\OneDrive Rafael\OneDrive\Rhema Data\Aplicações\diagnos-data-app\.opencode\skills\harness-eval\references\references\view.md; E:\OneDrive Rafael\OneDrive\Rhema Data\Aplicações\diagnos-data-app\.opencode\skills\harness-eval\references\view.md; E:\OneDrive Rafael\OneDrive\Rhema Data\Aplicações\diagnos-data-app\.agents\skills\harness-eval\references\view.md

## Notes

- Path normalization preserves `.agents` (never `str.lstrip('./')`).
- Placeholders and bare example filenames are skipped.
- Fenced code blocks are not scanned for path cites.
- `references/` may resolve under a skill named in the same surface (e.g. load `dev`).
- Missing `app/`/`lib/`/`test/` cites are BROKEN only when mandate language is nearby.
