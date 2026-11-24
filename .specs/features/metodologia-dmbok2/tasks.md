# Metodologia DMBOK2 Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, adequacy review, Verifier, discrimination sensor).

**If the skill cannot be activated, STOP and tell the user - do not proceed without it.**

---

**Design**: `.specs/features/metodologia-dmbok2/design.md`
**Status**: Approved

---

## Test Coverage Matrix

> Generated from codebase, project guidelines, and spec. Guidelines found: `AGENTS.md` §7 Testing (unit tests for services, scoring, contract, schemas in `*.test.ts`; component tests in `*.test.tsx` with Vitest + Testing Library; mock Supabase/email), `vitest.config.ts`.

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| ---------- | ------------------ | -------------------- | ---------------- | ----------- |
| Contract / calibration data + Zod schema | unit | Every MET AC on contract/calibration asserted on exact values | `src/lib/screener/*.test.ts` | `npx vitest run src/lib/screener` |
| Scoring (domain) | unit | 1:1 to MET-07..MET-11 + every listed edge case (boundaries 2.6 and 5.0, DB calibration with divergent bands) | `src/lib/screener/scoring.test.ts` | `npx vitest run src/lib/screener` |
| Methodology module | unit | 1:1 to MET-13..MET-19, exact strings | `src/lib/maturity/methodology.test.ts` | `npx vitest run src/lib/maturity` |
| Services (analysis, admin, portal) | unit | Payload/conjunction: assert `pesoPadrao` and `areaDmbok` values, including fallback | `src/lib/service/*.test.ts` | `npx vitest run src/lib/service` |
| PDF generator | unit | Exact rendered strings per MET-20..MET-25; absence assertions for CMMI/DCAM/DMM/SCORE/old legend | `src/lib/report/report-generator.test.ts` | `npx vitest run src/lib/report` |
| Portal components | component | Exact rendered text per MET-28..MET-32, both portal modes for MET-32 | `src/components/portal/*.test.tsx` | `npx vitest run src/components/portal` |
| Docs (AGENTS.md, ADR, STATE.md) | none | build gate only (+ grep evidence in Done when) | - | build gate only |

## Gate Check Commands

> Generated from `package.json` scripts.

| Gate Level | When to Use | Command |
| ---------- | ----------- | ------- |
| Quick | After tasks with unit/component tests only | `npx vitest run <layer path from matrix>` |
| Full | After tasks touching more than one layer | `npm run test` |
| Build | Last task of each phase, and doc-only tasks | `npm run typecheck && npm run lint && npm run test && npm run build` |

Baseline before T1: 66 test files passed, 1 skipped; 708 tests passed, 1 skipped. Test count must never drop.

---

## Execution Plan

Phase 1 runs first. Phases 2 and 3 touch disjoint files and depend only on Phase 1, so the orchestrator runs them in parallel in separate child worktrees and merges them. Phase 4 runs after the merge. Inside each phase, tasks run in order.

**Parallel-batch rule:** workers of Phases 2 and 3 mark only their own tasks in `tasks.md` and do NOT edit the traceability table in `spec.md` (the orchestrator updates it after merge, to avoid merge conflicts).

### Phase 1: Foundation (contract, scoring, methodology)

```
T1 → T2 → T3
T1 → T4
```

### Phase 2: PDF

```
T4 → T5 → T6 → T7
```

### Phase 3: Portal

```
T4 → T8 → T9
T8 → T10
T8 → T11
T8 → T12
```

### Phase 4: Documentation

```
T13 → T14
```

---

## Task Breakdown

### T1: Contract v1.2 with DMBOK2 references

**What**: Update the questionnaire contract data and its Zod `metaSchema` to version 1.2 per MET-01..MET-06.
**Where**: `docs/snapshot-maturidade-dados.json` (data) and `src/lib/screener/contract.ts` (`metaSchema` only; schema and data must change together or the module fails to load)
**Depends on**: None
**Reuses**: existing `metaSchema` / `dimensionSchema` in `src/lib/screener/contract.ts`
**Requirement**: MET-01, MET-02, MET-03, MET-04, MET-05, MET-06

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`

**Done when**:

- [x] `meta.versao` = "1.2"; `meta.escala` = "DAMA-DMBOK2 (cap. 15): 1 Inicial · 2 Repetível · 3 Definido · 4 Gerenciado · 5 Otimizado"; `meta.nome_indice`, `meta.referencia`, `meta.escala_niveis` exactly as in spec
- [x] `metaSchema` validates `nome_indice`, `referencia`, `escala_niveis` (length 5, nivel int 1–5, rotulo non-empty)
- [x] d02/d09/d10 `area_dmbok` and the 4 nível-3 option texts exactly as in spec; the other 46 option texts and 7 `area_dmbok` values unchanged
- [x] `src/lib/screener/contract.test.ts` asserts each value above and that `JSON.stringify(SCREENER_CONTRACT)` contains none of "CMMI", "DCAM", "DMM"
- [x] Gate check passes: `npx vitest run src/lib/screener`
- [x] Test count ≥ baseline

**Tests**: unit
**Gate**: quick

**Commit**: `feat(screener): contrato v1.2 com referência única DAMA-DMBOK2`

---

### T2: Fixed bands in contextual scoring

**What**: Make `computeContextualScores` classify with `contract.scoring.faixas` for every segment and take only `descricao` from the segment's recalibrated bands, per MET-07..MET-11.
**Where**: `src/lib/screener/scoring.ts`
**Depends on**: T1
**Reuses**: `computeScores`, `computeAdjustedWeights`, `getRecalibratedBands`
**Requirement**: MET-07, MET-08, MET-09, MET-10, MET-11

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`

**Done when**:

- [x] Indústria score in [1.8, 2.0) → `band.rotulo` "Emergente" and `band.descricao` = Indústria's Emergente text from calibration
- [x] Segment "Outro" (no recalibrated bands) → contract `descricao`
- [x] A calibration object whose `recalibrated_bands` limits differ from the contract (e.g. Inicial up to 2.0) still classifies 1.9 as "Emergente"
- [x] Boundaries: score 2.6 → "Estruturado"; 5.0 → "Otimizado"
- [x] Adjusted weights in `dimensionScores[].peso` unchanged versus `computeAdjustedWeights` for the same profile
- [x] Tests in `src/lib/screener/scoring.test.ts`; any existing assertion that encoded segment-specific limits is updated citing MET-07 (never deleted)
- [x] Gate check passes: `npx vitest run src/lib/screener`
- [x] Test count ≥ previous

**Tests**: unit
**Gate**: quick

**Commit**: `fix(scoring): régua única de estágios para todos os segmentos`

---

### T3: Calibration seed bands aligned to contract limits

**What**: Set every `recalibrated_bands[*][*].min/max` in the seed equal to the contract band with the same `rotulo`, keeping all `descricao` texts, per MET-12.
**Where**: `docs/scoring-calibration.json`
**Depends on**: T2
**Reuses**: contract `scoring.faixas`
**Requirement**: MET-12

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`

**Done when**:

- [ ] For every segment and band, `min`/`max` equal the contract band with the same `rotulo`; `descricao` texts byte-identical to before
- [ ] `src/lib/screener/scoring-calibration.test.ts` asserts the equality for all segments; `weight-calculator.test.ts:196` updated if it encoded old limits (citing MET-12)
- [ ] Gate check passes: `npm run typecheck && npm run lint && npm run test && npm run build` (last task of the T1→T2→T3 chain)
- [ ] Test count ≥ previous

**Tests**: unit
**Gate**: build

**Commit**: `fix(calibration): faixas setoriais com os limites do contrato`

---

### T4: Methodology module

**What**: Create `src/lib/maturity/methodology.ts` exporting `INDEX_LABEL`, `SCALE_LEGEND`, `METHOD_NOTE`, `formatWeight`, `formatScore`, `getBaseWeight`, `getAreaDmbok`, `describeDimension`, per MET-13..MET-19.
**Where**: `src/lib/maturity/methodology.ts`
**Depends on**: T1
**Reuses**: `SCREENER_CONTRACT`, `getDimensionById`, `SCORING_CALIBRATION`
**Requirement**: MET-13, MET-14, MET-15, MET-16, MET-17, MET-18, MET-19

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`

**Done when**:

- [ ] All exact values/examples from MET-13..MET-19 asserted in `src/lib/maturity/methodology.test.ts`
- [ ] Module has no `server-only` import and no `process.env` access
- [ ] Gate check passes: `npm run typecheck && npm run lint && npm run test && npm run build` (last task of Phase 1)
- [ ] Test count ≥ previous

**Tests**: unit
**Gate**: build

**Commit**: `feat(maturity): módulo único de textos e formatos metodológicos`

---

### T5: PDF input carries sector and default weights

**What**: Add `pesoPadrao` and `areaDmbok` to `GeneratePdfInput.dimensionScores` and fill them in both `buildPdfInput` functions via `describeDimension`, per MET-26.
**Where**: `src/lib/service/analysis-service.ts` and `src/lib/service/admin-service.ts` (plus the type in `src/lib/service/screen-service.ts`; one cohesive type change)
**Depends on**: T4
**Reuses**: `describeDimension`
**Requirement**: MET-26

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`

**Done when**:

- [ ] `analysis-service.test.ts` and `admin-service.test.ts` assert `pesoPadrao` and `areaDmbok` values for a known id (e.g. d07 → 10 / "Data Security") and the fallback for an unknown id
- [ ] Gate check passes: `npx vitest run src/lib/service`
- [ ] Test count ≥ previous

**Tests**: unit
**Gate**: quick

**Commit**: `feat(report): pesos padrão e área DMBOK2 na entrada do PDF`

---

### T6: PDF texts — index label, scale legend, method note

**What**: Render `INDEX_LABEL` in the stage card, `SCALE_LEGEND` in the radar reading and `METHOD_NOTE` in the methodology note, per MET-20, MET-21, MET-24, MET-25.
**Where**: `src/lib/report/report-generator.ts`
**Depends on**: T5
**Reuses**: `INDEX_LABEL`, `SCALE_LEGEND`, `METHOD_NOTE`
**Requirement**: MET-20, MET-21, MET-24, MET-25

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`

**Done when**:

- [ ] Tests assert the three exact strings are rendered and that "1 Inicial · 2 Emergente", "CMMI", "DCAM", "DMM" are absent from the rendered tree
- [ ] Gate check passes: `npx vitest run src/lib/report`
- [ ] Test count ≥ previous

**Tests**: unit
**Gate**: quick

**Commit**: `feat(report): textos metodológicos DMBOK2 no PDF`

---

### T7: PDF dimension table with sector and default weights

**What**: Replace the SCORE column with PESO NO SETOR / PESO PADRÃO and show `areaDmbok` under each dimension name, per MET-22 and MET-23.
**Where**: `src/lib/report/report-generator.ts`
**Depends on**: T6
**Reuses**: existing `dimensionTable` styles
**Requirement**: MET-22, MET-23

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`

**Done when**:

- [ ] Tests assert headers `DIMENSÃO`, `NÍVEL`, `PESO NO SETOR`, `PESO PADRÃO`, absence of `SCORE`, and for one row the area text plus `"13%"` / `"10%"` cells
- [ ] Gate check passes: `npm run typecheck && npm run lint && npm run test && npm run build` (last task of Phase 2)
- [ ] Test count ≥ previous

**Tests**: unit
**Gate**: build

**Commit**: `feat(report): tabela do PDF com peso no setor e peso padrão`

---

### T8: Portal DTO with default weight and DMBOK2 area

**What**: Add `pesoPadrao` and `areaDmbok` to `portalDTOSchema.dimensions` and fill them in `portal-service` via `describeDimension`, per MET-27.
**Where**: `src/lib/service/portal-service.ts` (plus the schema in `src/lib/dto/portal.ts`; one cohesive type change)
**Depends on**: T4
**Reuses**: `describeDimension`
**Requirement**: MET-27

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`

**Done when**:

- [ ] `portal-service.test.ts` asserts both fields for a known id and the fallback
- [ ] Existing portal component test fixtures updated with the two new fields where the schema requires them
- [ ] Gate check passes: `npm run test`
- [ ] Test count ≥ previous

**Tests**: unit
**Gate**: full

**Commit**: `feat(portal): DTO com peso padrão e área DMBOK2`

---

### T9: StageHero with index label and formatted score

**What**: Replace "Estágio atual · CMMI" with `INDEX_LABEL` and render the score with `formatScore`, per MET-28 and MET-29.
**Where**: `src/components/portal/StageHero.tsx`
**Depends on**: T8
**Reuses**: `INDEX_LABEL`, `formatScore`
**Requirement**: MET-28, MET-29

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`

**Done when**:

- [ ] `StageHero.test.tsx` asserts `INDEX_LABEL` present, "CMMI" absent, and `"2,3 de 5"` for valor 2.34
- [ ] Gate check passes: `npx vitest run src/components/portal`
- [ ] Test count ≥ previous

**Tests**: component
**Gate**: quick

**Commit**: `feat(portal): StageHero com índice DMBOK2 e score de 1 a 5`

---

### T10: AnswersTable with sector weight and DMBOK2 area

**What**: Show `formatWeight(peso, pesoPadrao)` and `areaDmbok` for each dimension, per MET-30.
**Where**: `src/components/portal/AnswersTable.tsx`
**Depends on**: T8
**Reuses**: `formatWeight`
**Requirement**: MET-30

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`

**Done when**:

- [ ] `AnswersTable.test.tsx` asserts `"13% (padrão 10%)"`, `"10% (padrão)"` and an area text for fixture rows
- [ ] Gate check passes: `npx vitest run src/components/portal`
- [ ] Test count ≥ previous

**Tests**: component
**Gate**: quick

**Commit**: `feat(portal): peso no setor e área DMBOK2 na tabela de respostas`

---

### T11: MaturityBars scale legend

**What**: Render `SCALE_LEGEND` in `MaturityBars`, per MET-31.
**Where**: `src/components/portal/MaturityBars.tsx`
**Depends on**: T8
**Reuses**: `SCALE_LEGEND`
**Requirement**: MET-31

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`

**Done when**:

- [ ] `MaturityBars.test.tsx` asserts the exact `SCALE_LEGEND` text
- [ ] Gate check passes: `npx vitest run src/components/portal`
- [ ] Test count ≥ previous

**Tests**: component
**Gate**: quick

**Commit**: `feat(portal): legenda da escala DMBOK2 nas barras de maturidade`

---

### T12: DiagnosticPortal methodology note

**What**: Add a "Nota metodológica" section with `METHOD_NOTE` to `DiagnosticPortal` in both modes, per MET-32.
**Where**: `src/components/portal/DiagnosticPortal.tsx`
**Depends on**: T8
**Reuses**: `METHOD_NOTE`, existing section styles
**Requirement**: MET-32

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`

**Done when**:

- [ ] `DiagnosticPortal.test.tsx` asserts heading "Nota metodológica" and `METHOD_NOTE` text in `mode="public"` and in `mode="manager"`
- [ ] Gate check passes: `npm run typecheck && npm run lint && npm run test && npm run build` (last task of Phase 3)
- [ ] Test count ≥ previous

**Tests**: component
**Gate**: build

**Commit**: `feat(portal): nota metodológica DMBOK2 no portal`

---

### T13: AGENTS.md methodology section

**What**: Rewrite AGENTS.md §5 to name DAMA-DMBOK2 (cap. 15) as the single reference, describe fixed bands + sector weights, and remove "DCAM" and "CMMI-like", per MET-33.
**Where**: `AGENTS.md`
**Depends on**: None
**Reuses**: spec positioning sentence (MET-03)
**Requirement**: MET-33

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`

**Done when**:

- [ ] `grep -c "DCAM\|CMMI-like" AGENTS.md` returns 0 and §5 contains "DAMA-DMBOK2"
- [ ] Gate check passes: `npm run typecheck && npm run lint && npm run test && npm run build`

**Tests**: none
**Gate**: build

**Commit**: `docs(agents): DAMA-DMBOK2 como referência metodológica única`

---

### T14: ADR 011 and STATE decision

**What**: Write `docs/decisions/011-dmbok2-base-metodologica.md` (context, decision, fixed bands with sector weights, positioning sentence, consequences) and append AD-012 to `.specs/STATE.md` Decisions, per MET-34.
**Where**: `docs/decisions/011-dmbok2-base-metodologica.md`
**Depends on**: T13
**Reuses**: format of `docs/decisions/009-pipeline-agentes-insights-de-mercado.md`
**Requirement**: MET-34

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`

**Done when**:

- [ ] ADR file exists with the decision and the positioning sentence; STATE.md has AD-012 and its Decisions section is otherwise unchanged
- [ ] Gate check passes: `npm run typecheck && npm run lint && npm run test && npm run build`

**Tests**: none
**Gate**: build

**Commit**: `docs(decisions): ADR 011 base metodológica DAMA-DMBOK2`

---

## Phase Execution Map

```
Phase 1 → (Phase 2 ‖ Phase 3) → merge → Phase 4

Phase 1:  T1 → T2 → T3
Phase 1:  T1 → T4
Phase 2:  T4 → T5 → T6 → T7
Phase 3:  T4 → T8 → T9
Phase 3:  T8 → T10
Phase 3:  T8 → T11
Phase 3:  T8 → T12
Phase 4:  T13 → T14
```

## Task Granularity Check

| Task | Scope | Status |
| ---- | ----- | ------ |
| T1 | contract data + its meta schema | ⚠️ 2 files, cohesive (load fails if split) |
| T2 | 1 function | ✅ |
| T3 | 1 data file | ✅ |
| T4 | 1 module | ✅ |
| T5 | 1 type + 2 builders | ⚠️ cohesive type change |
| T6 | 3 text spots, 1 file | ✅ |
| T7 | 1 table, 1 file | ✅ |
| T8 | 1 schema + 1 mapper | ⚠️ cohesive type change |
| T9–T12 | 1 component each | ✅ |
| T13, T14 | 1 doc each | ✅ |

## Diagram-Definition Cross-Check

| Task | Depends On (body) | Diagram Shows | Status |
| ---- | ----------------- | ------------- | ------ |
| T1 | None | none | ✅ |
| T2 | T1 | T1 → T2 | ✅ |
| T3 | T2 | T2 → T3 | ✅ |
| T4 | T1 | T1 → T4 | ✅ |
| T5 | T4 (Phase 1) | cross-phase | ✅ |
| T6 | T5 | T5 → T6 | ✅ |
| T7 | T6 | T6 → T7 | ✅ |
| T8 | T4 (Phase 1) | cross-phase | ✅ |
| T9–T12 | T8 | T8 → T9..T12 | ✅ |
| T13 | None | none | ✅ |
| T14 | T13 | T13 → T14 | ✅ |

## Test Co-location Validation

| Task | Code Layer | Matrix Requires | Task Says | Status |
| ---- | ---------- | --------------- | --------- | ------ |
| T1 | Contract | unit | unit | ✅ |
| T2 | Scoring | unit | unit | ✅ |
| T3 | Calibration | unit | unit | ✅ |
| T4 | Methodology | unit | unit | ✅ |
| T5 | Services | unit | unit | ✅ |
| T6, T7 | PDF | unit | unit | ✅ |
| T8 | Services + DTO | unit | unit | ✅ |
| T9–T12 | Portal components | component | component | ✅ |
| T13, T14 | Docs | none | none | ✅ |
