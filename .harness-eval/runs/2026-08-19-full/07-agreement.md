# Harness Eval: Judge Agreement (Track B)

> Run dir: `.harness-eval\runs\2026-08-19-full`
> Trap gate: FAIL (misses=2)
> Bands: Ship = dual REDUNDANT + J2 cost≤1; Review = dual KEEP; Hold = disagree / missing

## What these words mean

| Word | Meaning | You should |
|------|---------|------------|
| **Ship** | Both judges: text is redundant and cheap to rediscover | Delete / trim |
| **Review** | Both judges: keep (not redundant) | Leave alone |
| **Hold** | Judges disagreed or score missing | Do nothing yet |
| **Trap PASS** | Planted traps scored correctly | Trust Ship |

This track answers: *would an agent rediscover this without the harness?* Not the same as usefulness (`10-usefulness-agreement.md`).

## Executive summary

- Real claims scored: 355
- Ship: **0**
- Review: **320**
- Hold: **35**
- Trap misses: [{'id': 'P003', 'expected': 'REDUNDANT', 'got': 'KEEP'}, {'id': 'P004', 'expected': 'REDUNDANT', 'got': 'KEEP'}]

## Discrimination (plants)

| ID | Expected family | J2 family |
|----|-----------------|-----------|
| P003 | REDUNDANT | KEEP |
| P004 | REDUNDANT | KEEP |
| P005 | KEEP | KEEP |
| P006 | KEEP | KEEP |

Ship by tier: {}
Hold by tier: {'T0': 10, 'T2': 25}

## Ship

| ID | Tier | Source | J1 | J2 cost/class | Quote |
|----|------|--------|----|---------------|-------|

## Hold

| ID | Tier | Reason | J1 | J2 | Quote |
|----|------|--------|----|----|-------|
| C010 | T0 | disagree | REDUNDANT-CODE | 2/KEEP-COMPRESSED | `DiagnosticInput` — validated questionnaire answers + company context. |
| C011 | T0 | disagree | REDUNDANT-CODE | 2/KEEP-COMPRESSED | `DiagnosticResult` — the full evaluation: per-dimension scores, overall maturity level, narrative an |
| C016 | T0 | disagree | REDUNDANT-CODE | 1/KEEP-POLICY | **Dimensions** (subset of DAMA-DMBOK knowledge areas): Data Governance, Data Architecture, Data Qual |
| C017 | T0 | disagree | REDUNDANT-CODE | 0/KEEP-COMPRESSED | **Maturity levels** (0–5, CMMI-style): |
| C018 | T0 | disagree | REDUNDANT-CODE | 0/KEEP-COMPRESSED | `1` Initial / Ad hoc |
| C019 | T0 | disagree | REDUNDANT-CODE | 1/KEEP-POLICY | **Overall maturity** = weighted aggregate of dimension scores. |
| C020 | T0 | disagree | REDUNDANT-CODE | 2/KEEP-ROUTING | The questionnaire (`harness/config/questionnaire.ts`) maps each question to a dimension and a weight |
| C021 | T0 | disagree | REDUNDANT-CODE | 1/KEEP-ROUTING | Provider client: `harness/providers/ollama/client.ts`. |
| C022 | T0 | disagree | REDUNDANT-CODE | 1/KEEP-CAVEAT | Base URL and model are configured via environment variables (see `.env.example`). |
| C033 | T0 | disagree | KEEP-POLICY | 0/REDUNDANT-GENERAL | The concrete PDF generator (`@react-pdf/renderer`) lives in `src/lib/report/` and is injected into t |
| C331 | T2 | disagree | KEEP-ROUTING | 1/REDUNDANT-GENERAL | Harness-referenced document `.opencode/command/init.md` is an on-demand load target when linked from |
| C332 | T2 | disagree | KEEP-ROUTING | 1/REDUNDANT-GENERAL | Harness-referenced document `.opencode/opencode.json` is an on-demand load target when linked from a |
| C333 | T2 | disagree | KEEP-ROUTING | 1/REDUNDANT-GENERAL | Harness-referenced document `.opencode/skills/frontend-design/references/color-and-contrast.md` is a |
| C334 | T2 | disagree | KEEP-ROUTING | 1/REDUNDANT-GENERAL | Harness-referenced document `.opencode/skills/frontend-design/references/interaction-design.md` is a |
| C335 | T2 | disagree | KEEP-ROUTING | 1/REDUNDANT-GENERAL | Harness-referenced document `.opencode/skills/frontend-design/references/motion-design.md` is an on- |
| C336 | T2 | disagree | KEEP-ROUTING | 1/REDUNDANT-GENERAL | Harness-referenced document `.opencode/skills/frontend-design/references/responsive-design.md` is an |
| C337 | T2 | disagree | KEEP-ROUTING | 1/REDUNDANT-GENERAL | Harness-referenced document `.opencode/skills/frontend-design/references/spatial-design.md` is an on |
| C338 | T2 | disagree | KEEP-ROUTING | 1/REDUNDANT-GENERAL | Harness-referenced document `.opencode/skills/frontend-design/references/typography.md` is an on-dem |
| C339 | T2 | disagree | KEEP-ROUTING | 1/REDUNDANT-GENERAL | Harness-referenced document `.opencode/skills/frontend-design/references/ux-writing.md` is an on-dem |
| C340 | T2 | disagree | KEEP-ROUTING | 1/REDUNDANT-GENERAL | Harness-referenced document `.opencode/skills/harness-eval/references/GLOSSARY.md` is an on-demand l |
| C341 | T2 | disagree | KEEP-ROUTING | 1/REDUNDANT-GENERAL | Harness-referenced document `.opencode/skills/harness-eval/references/PROTOCOL.md` is an on-demand l |
| C342 | T2 | disagree | KEEP-ROUTING | 1/REDUNDANT-GENERAL | Harness-referenced document `.opencode/skills/harness-eval/references/claims.schema.json` is an on-d |
| C343 | T2 | disagree | KEEP-ROUTING | 1/REDUNDANT-GENERAL | Harness-referenced document `.opencode/skills/harness-eval/references/judge-prompts.md` is an on-dem |
| C344 | T2 | disagree | KEEP-ROUTING | 1/REDUNDANT-GENERAL | Harness-referenced document `.opencode/skills/tlc-spec-driven/references/code-analysis.md` is an on- |
| C345 | T2 | disagree | KEEP-ROUTING | 1/REDUNDANT-GENERAL | Harness-referenced document `.opencode/skills/tlc-spec-driven/references/coding-principles.md` is an |
| C346 | T2 | disagree | KEEP-ROUTING | 1/REDUNDANT-GENERAL | Harness-referenced document `.opencode/skills/tlc-spec-driven/references/context-limits.md` is an on |
| C347 | T2 | disagree | KEEP-ROUTING | 1/REDUNDANT-GENERAL | Harness-referenced document `.opencode/skills/tlc-spec-driven/references/design.md` is an on-demand  |
| C348 | T2 | disagree | KEEP-ROUTING | 1/REDUNDANT-GENERAL | Harness-referenced document `.opencode/skills/tlc-spec-driven/references/discuss.md` is an on-demand |
| C349 | T2 | disagree | KEEP-ROUTING | 1/REDUNDANT-GENERAL | Harness-referenced document `.opencode/skills/tlc-spec-driven/references/implement.md` is an on-dema |
| C350 | T2 | disagree | KEEP-ROUTING | 1/REDUNDANT-GENERAL | Harness-referenced document `.opencode/skills/tlc-spec-driven/references/lessons.md` is an on-demand |
| C351 | T2 | disagree | KEEP-ROUTING | 1/REDUNDANT-GENERAL | Harness-referenced document `.opencode/skills/tlc-spec-driven/references/memory.md` is an on-demand  |
| C352 | T2 | disagree | KEEP-ROUTING | 1/REDUNDANT-GENERAL | Harness-referenced document `.opencode/skills/tlc-spec-driven/references/specify.md` is an on-demand |
| C353 | T2 | disagree | KEEP-ROUTING | 1/REDUNDANT-GENERAL | Harness-referenced document `.opencode/skills/tlc-spec-driven/references/sub-agents.md` is an on-dem |
| C354 | T2 | disagree | KEEP-ROUTING | 1/REDUNDANT-GENERAL | Harness-referenced document `.opencode/skills/tlc-spec-driven/references/tasks.md` is an on-demand l |
| C355 | T2 | disagree | KEEP-ROUTING | 1/REDUNDANT-GENERAL | Harness-referenced document `.opencode/skills/tlc-spec-driven/references/validate.md` is an on-deman |

## Review (KEEP family)

320 claims. See J1/J2 score tables for detail.

## Action guidance

- **T0 Ship:** edit always-on rules now.
- **T1 Ship:** skill cleanup backlog.
- **T2 Ship:** routing/pointer hygiene.
- **Hold:** do not trim.

