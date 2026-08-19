# Harness Eval: Usefulness Agreement (Track C)

> Run dir: `E:\OneDrive Rafael\OneDrive\Rhema Data\Aplicações\diagnos-data-app\.harness-eval\runs\2026-08-19-full`
> Trap gate: PASS (misses=0)
> Fan-in gate: PASS (slim-fanin-blocked=0)
> Judges: J1 model=`deepseek-v4-flash:0731` · J2 model=`deepseek-v4-flash:0731`
> Bands: Slim = dual SLIM/ROUTING + trap PASS + fan-in PASS; Keep-core = dual KEEP-CORE; Mixed = dual MIXED; Hold = disagree / unclear / missing / slim-fanin-blocked
> **Model-sensitive:** re-judge on a second model before large Slim deletes.
> **Fan-in:** another harness surface hard-loads this path as SoT → Hold, not Slim.
> **Mixed apply:** use `11-mixed-apply.md` only — do not re-judge from this table alone.

## What these words mean

| Word | Meaning | You should |
|------|---------|------------|
| **Keep-core** | Most of the file changes agent behavior | Do **not** slim |
| **Mixed** | Real rules + large theory/examples/overlap | Keep rules; cut bulk — follow `11-mixed-apply.md` |
| **Slim** | Mostly theory / repo-demo / overlap, **and** no other harness surface hard-loads it | Compress or delete body |
| **Hold** | Judges disagreed, unclear, or Slim blocked by fan-in | Do nothing yet (or update consumers first) |
| **Trap PASS** | Planted traps scored correctly | Necessary but not sufficient for Slim |
| **Fan-in blocked** | Another harness file mandates loading this path / treats it as SoT | Do **not** stub/delete until consumers are updated |

This track answers: *does deleting this change agent behavior?* Not the same as redundancy (`07-agreement.md`).

## Executive summary

- Real surfaces scored: 28
- Slim: **0**
- Keep-core: **14**
- Mixed: **2** → apply plan: `11-mixed-apply.md`
- Hold: **12** (fan-in blocked: 0)
- Trap misses: none

## Discrimination (plants)

| ID | Expected family | J2 family |
|----|-----------------|-----------|
| S901 | SLIM | SLIM |
| S902 | SLIM | SLIM |
| S903 | KEEP-CORE | KEEP-CORE |

Slim by tier: {}
Keep-core by tier: {'T0': 1, 'T1': 2, 'T2': 11}
Mixed by tier: {'T1': 2}
Hold by tier: {'T2': 12}

## Slim (compress / delete body candidates)

| ID | Tier | Name | Path | J1 | J2 |
|----|------|------|------|----|----|

## Slim fan-in blocked (do not stub/delete)

Dual SLIM/ROUTING-ONLY, but another harness surface hard-loads the path (load/SoT/extract mandate). Update or drop those consumers before Slim apply.

| ID | Path | Citers |
|----|------|--------|
| — | — | none |

## Keep-core

| ID | Tier | Name | Path | J1 | J2 |
|----|------|------|------|----|----|
| S001 | T0 | AGENTS.md | `AGENTS.md` | KEEP-CORE | KEEP-CORE |
| S004 | T1 | harness-eval | `.opencode/skills/harness-eval/SKILL.md` | KEEP-CORE | KEEP-CORE |
| S005 | T1 | tlc-spec-driven | `.opencode/skills/tlc-spec-driven/SKILL.md` | KEEP-CORE | KEEP-CORE |
| S006 | T2 | init.md | `.opencode/command/init.md` | KEEP-CORE | KEEP-CORE |
| S015 | T2 | PROTOCOL.md | `.opencode/skills/harness-eval/references/PROTOCOL.md` | KEEP-CORE | KEEP-CORE |
| S016 | T2 | judge-prompts.md | `.opencode/skills/harness-eval/references/judge-prompts.md` | KEEP-CORE | KEEP-CORE |
| S019 | T2 | context-limits.md | `.opencode/skills/tlc-spec-driven/references/context-limits.md` | KEEP-CORE | KEEP-CORE |
| S022 | T2 | implement.md | `.opencode/skills/tlc-spec-driven/references/implement.md` | KEEP-CORE | KEEP-CORE |
| S023 | T2 | lessons.md | `.opencode/skills/tlc-spec-driven/references/lessons.md` | KEEP-CORE | KEEP-CORE |
| S024 | T2 | memory.md | `.opencode/skills/tlc-spec-driven/references/memory.md` | KEEP-CORE | KEEP-CORE |
| S025 | T2 | specify.md | `.opencode/skills/tlc-spec-driven/references/specify.md` | KEEP-CORE | KEEP-CORE |
| S026 | T2 | sub-agents.md | `.opencode/skills/tlc-spec-driven/references/sub-agents.md` | KEEP-CORE | KEEP-CORE |
| S027 | T2 | tasks.md | `.opencode/skills/tlc-spec-driven/references/tasks.md` | KEEP-CORE | KEEP-CORE |
| S028 | T2 | validate.md | `.opencode/skills/tlc-spec-driven/references/validate.md` | KEEP-CORE | KEEP-CORE |

## Mixed (keep core, slim examples/theory)

Path list only. **Apply instructions:** `11-mixed-apply.md` (KEEP/CUT per ID).

| ID | Tier | Name | Path | J1 | J2 |
|----|------|------|------|----|----|
| S002 | T1 | create-adr | `.opencode/skills/create-adr/SKILL.md` | MIXED | MIXED |
| S003 | T1 | frontend-design | `.opencode/skills/frontend-design/SKILL.md` | MIXED | MIXED |

## Hold

| ID | Tier | Reason | J1 | J2 | Path |
|----|------|--------|----|----|------|
| S007 | T2 | disagree | KEEP-CORE | SLIM | `.opencode/skills/frontend-design/references/color-and-contrast.md` |
| S008 | T2 | disagree | KEEP-CORE | SLIM | `.opencode/skills/frontend-design/references/interaction-design.md` |
| S009 | T2 | disagree | KEEP-CORE | SLIM | `.opencode/skills/frontend-design/references/motion-design.md` |
| S010 | T2 | disagree | KEEP-CORE | SLIM | `.opencode/skills/frontend-design/references/responsive-design.md` |
| S011 | T2 | disagree | KEEP-CORE | SLIM | `.opencode/skills/frontend-design/references/spatial-design.md` |
| S012 | T2 | disagree | KEEP-CORE | SLIM | `.opencode/skills/frontend-design/references/typography.md` |
| S013 | T2 | disagree | KEEP-CORE | SLIM | `.opencode/skills/frontend-design/references/ux-writing.md` |
| S014 | T2 | disagree | KEEP-CORE | MIXED | `.opencode/skills/harness-eval/references/GLOSSARY.md` |
| S017 | T2 | disagree | MIXED | SLIM | `.opencode/skills/tlc-spec-driven/references/code-analysis.md` |
| S018 | T2 | disagree | KEEP-CORE | MIXED | `.opencode/skills/tlc-spec-driven/references/coding-principles.md` |
| S020 | T2 | disagree | KEEP-CORE | MIXED | `.opencode/skills/tlc-spec-driven/references/design.md` |
| S021 | T2 | disagree | KEEP-CORE | MIXED | `.opencode/skills/tlc-spec-driven/references/discuss.md` |

## Action guidance

- **Slim:** compress only after trap PASS **and** fan-in PASS; still human-approve; prefer re-judge on a second model if deleting >30% of a skill.
- **Slim fan-in blocked:** do **not** stub/delete; either keep the checklist body or update every citing harness surface in the same change, then re-merge.
- **Mixed:** open `11-mixed-apply.md` and execute KEEP/CUT per ID only. Do **not** re-judge. Do **not** replace KEEP snippets with `See app/...` or defer KEEP contracts to AGENTS.md. Empty Keep-core/Slim cells → skip that path.
- **Keep-core:** do not slim for usefulness reasons.
- **Hold:** no usefulness trim.
- See `08-usefulness-j1.md` / `09-usefulness-j2.md` for raw score rows.
- Fan-in detail JSON: `slim-fanin.json`.

