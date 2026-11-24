# Metodologia DMBOK2 Validation

**Date**: 2026-11-24
**Spec**: `.specs/features/metodologia-dmbok2/spec.md`
**Diff range**: `01d16e3..25ab060` (spec commit → HEAD, branch `feat/metodologia-dmbok2`). First pass covered `01d16e3..3459616` (MET-01..34); re-verification covered `3459616..47faa0d` (MET-35, T15); second re-verification covered `47faa0d..25ab060` (T16, test only)
**Verifier**: independent sub-agent (author ≠ verifier); read-only on the real tree, all gate and sensor runs in a scratch `git worktree` of HEAD under `/private/tmp/claude-501/`

**Result**: PASS ✅ — 35/35 ACs matched the spec outcome with `file:line` evidence, 3/3 edge cases covered, gate exit 0 on `25ab060`, sensor 35/35 mutants killed on the final code (the S7 survivor of the T15 pass is closed by T16).

---

## Task Completion

| Task | Status | Notes |
| ---- | ------ | ----- |
| T1–T3 (contract, fixed bands, calibration seed) | ✅ Done | All `Done when` boxes ticked; commits `fb109bd`, `cc155e6`, `507acfb` |
| T4 (methodology module) | ✅ Done | `3baca68` |
| T5–T7 (PDF) | ✅ Done | `bdbc773`, `7788f2a`, `66a87c7`; merge `93a905f` |
| T8–T12 (portal) | ✅ Done | `11db814`, `ea16df5`, `1342947`, `75819fd`, `c36b5be`; merge `c11cae5` |
| T13–T14 (AGENTS.md, ADR 011, AD-012) | ✅ Done | `c3f437e`, `b388f7e` |

---

## Spec-Anchored Acceptance Criteria

Each asserted value was compared character by character with the spec string. Contract and PDF strings are compared against the literal in the test, not against the implementation constant.

### P1: Contract (MET-01..06)

| Criterion | Spec-defined outcome | `file:line` + assertion | Result |
| --------- | -------------------- | ----------------------- | ------ |
| MET-01 | `meta.versao` = `"1.2"` | `src/lib/screener/contract.test.ts:87` - `expect(SCREENER_CONTRACT.meta.versao).toBe("1.2")` | ✅ PASS |
| MET-02 | 5 entries `{nivel,rotulo}` Inicial/Repetível/Definido/Gerenciado/Otimizado, Zod-validated | `contract.test.ts:96` - `expect(...escala_niveis).toEqual([...5 literals])`; schema rejections `contract.test.ts:115,126,139` (`safeParse(...).success` `toBe(false)` for 4 items, nivel 6, empty rotulo) | ✅ PASS |
| MET-03 | `nome_indice` = "Índice de Maturidade Rhema"; `referencia` = full sentence | `contract.test.ts:106` - `expect(meta.nome_indice).toBe("Índice de Maturidade Rhema")` and `expect(meta.referencia).toBe("Índice proprietário da Rhema Data, … não é certificação.")` (literal identical to spec); presence required `contract.test.ts:152` | ✅ PASS |
| MET-04 | d02 "Data Governance (Data Strategy)", d09 "Big Data & Data Science", d10 "Data Management Organization & Role Expectations", other 7 unchanged | `contract.test.ts:165` - `expect(areas).toEqual({d01..d10})` (all 10 literals; d01/d03–d08 match the pre-feature JSON, confirmed by `git diff 01d16e3..HEAD -- docs/snapshot-maturidade-dados.json`) | ✅ PASS |
| MET-05 | serialized contract has no "CMMI", "DCAM", "DMM" | `contract.test.ts:264` - `expect(JSON.stringify(SCREENER_CONTRACT)).not.toContain("CMMI"/"DCAM"/"DMM")` | ✅ PASS |
| MET-06 | 4 level-3 texts exact; all other option texts unchanged | `contract.test.ts:183` - `expect(textos).toEqual({d01..d10: [5 literals each]})` (50 texts; JSON diff shows only the 4 level-3 lines changed) | ✅ PASS |

### P1: Régua única (MET-07..12)

| Criterion | Spec-defined outcome | `file:line` + assertion | Result |
| --------- | -------------------- | ----------------------- | ------ |
| MET-07 | Classification uses `contract.scoring.faixas` for any segment | `src/lib/screener/scoring.test.ts:294` (it.each, Saúde, níveis 1..5 → `result.band.rotulo` `toBe(rotulo)`, `band.min/max` `toBe(contractBand.min/max)`); `scoring.test.ts:317` divergent-calibration object: `expect(result.band.min).toBe(1.8)`, `max` `toBe(2.6)` | ✅ PASS |
| MET-08 | Indústria in [1.8,2.0) → "Emergente" | `scoring.test.ts:270` - score `toBeCloseTo(1.93,10)`; `expect(result.band.rotulo).toBe("Emergente")` (line 279) | ✅ PASS |
| MET-09 | `band.descricao` = segment entry's `descricao` for the classified `rotulo` | `scoring.test.ts:197` (Finanças/Fintech Estruturado text), `scoring.test.ts:270` (Indústria Emergente text), `scoring.test.ts:343` - `toBe("Setorial Emergente")` | ✅ PASS |
| MET-10 | No `recalibrated_bands` entry → contract `descricao` | `scoring.test.ts:213-226` - segment "Outro": `expect(result.band.descricao).toBe("Base técnica existe. O gargalo costuma ser governança e processo, não tecnologia.")` | ✅ PASS |
| MET-11 | `computeAdjustedWeights` output unchanged | `scoring.test.ts:384` - `expect(result.dimensionScores.map(d => d.peso)).toEqual(expected.map(w => w.adjustedWeight))` | ✅ PASS |
| MET-12 | Seed `min`/`max` equal contract band with same `rotulo` | `src/lib/screener/scoring-calibration.test.ts:155` - per segment/band `expect({...min,max}).toEqual({...contractBand.min,max})`; also order test and `descricao` byte-identity test (`scoring-calibration.test.ts:197`, `toEqual` of all 20 texts) | ✅ PASS |

### P1: Linguagem metodológica (MET-13..19)

| Criterion | Spec-defined outcome | `file:line` + assertion | Result |
| --------- | -------------------- | ----------------------- | ------ |
| MET-13 | `INDEX_LABEL` = "Índice de Maturidade Rhema · base DAMA-DMBOK2" | `src/lib/maturity/methodology.test.ts:18` - `toBe("Índice de Maturidade Rhema · base DAMA-DMBOK2")` | ✅ PASS |
| MET-14 | `SCALE_LEGEND` = "Escala de níveis (DAMA-DMBOK2): 1 Inicial · 2 Repetível · 3 Definido · 4 Gerenciado · 5 Otimizado" | `methodology.test.ts:24` - `toBe(<spec literal>)`; derived from `meta.escala_niveis` at `:33` | ✅ PASS |
| MET-15 | `METHOD_NOTE` = `meta.referencia` | `methodology.test.ts:39` - `expect(METHOD_NOTE).toBe(SCREENER_CONTRACT.meta.referencia)` (literal pinned by MET-03) | ✅ PASS |
| MET-16 | `formatWeight(13,10)` = "13% (padrão 10%)"; `(10,10)` = "10% (padrão)" | `methodology.test.ts:46`, `:50` | ✅ PASS |
| MET-17 | `formatScore(2.34)` = "2,3 de 5"; `(5)` = "5,0 de 5" | `methodology.test.ts:56`, `:60` | ✅ PASS |
| MET-18 | `getBaseWeight("d07")` = 10; unknown → null | `methodology.test.ts:66` `toBe(10)`; `:70` `toBeNull()` | ✅ PASS |
| MET-19 | `getAreaDmbok("d09")` = "Big Data & Data Science", unknown → null; `describeDimension("x99",7)` = `{pesoPadrao:7, areaDmbok:""}` | `methodology.test.ts:76`, `:80`, `:93` - `toEqual({ pesoPadrao: 7, areaDmbok: "" })`; known-id case `:86` | ✅ PASS |

### P1: PDF (MET-20..26)

| Criterion | Spec-defined outcome | `file:line` + assertion | Result |
| --------- | -------------------- | ----------------------- | ------ |
| MET-20 | Stage card renders `INDEX_LABEL` | `src/lib/report/report-generator.test.ts:337` - `hasText(children, "Índice de Maturidade Rhema · base DAMA-DMBOK2")` `toBe(true)` (`hasText` is exact string match, `:87-89`) | ✅ PASS |
| MET-21 | Radar reading renders `SCALE_LEGEND`, not "1 Inicial · 2 Emergente" | `report-generator.test.ts:346` (full legend literal) `toBe(true)`; `:349` `hasText(children, "1 Inicial · 2 Emergente")` `toBe(false)` | ✅ PASS |
| MET-22 | Headers DIMENSÃO, NÍVEL, PESO NO SETOR, PESO PADRÃO; no SCORE | `report-generator.test.ts:385` `texts.slice(i, i+4)` `toEqual(["DIMENSÃO","NÍVEL","PESO NO SETOR","PESO PADRÃO"])`; `:391` `expect(texts).not.toContain("SCORE")` | ✅ PASS |
| MET-23 | area under the name, `"<peso>%"` in PESO NO SETOR, `"<pesoPadrao>%"` in PESO PADRÃO | `report-generator.test.ts:411` - `texts.slice(rowIndex, rowIndex+5)` `toEqual(["Segurança e Conformidade","Data Security","3","13%","10%"])` | ✅ PASS |
| MET-24 | Methodology note renders `METHOD_NOTE` | `report-generator.test.ts:358` - `hasText(children, "<referencia literal>")` `toBe(true)`; heading at `:354` "NOTA METODOLÓGICA" | ✅ PASS |
| MET-25 | Rendered text has no CMMI/DCAM/DMM | `report-generator.test.ts:375` - `expect(renderedText).not.toContain("CMMI")` (+ DCAM, DMM), built with analysis and insights populated | ✅ PASS |
| MET-26 | Both `buildPdfInput` carry `pesoPadrao`/`areaDmbok` via `describeDimension` | `src/lib/service/analysis-service.test.ts:393` - `toEqual([{name:"Segurança e Conformidade (LGPD)",nivel:3,peso:13,pesoPadrao:10,areaDmbok:"Data Security"}])`; `:433` unknown id `{peso:7,pesoPadrao:7,areaDmbok:""}`; `src/lib/service/admin-service.test.ts:457` same pair of rows in one `toEqual` | ✅ PASS |

### P1: Portal (MET-27..32)

| Criterion | Spec-defined outcome | `file:line` + assertion | Result |
| --------- | -------------------- | ----------------------- | ------ |
| MET-27 | DTO has `pesoPadrao: number`, `areaDmbok: string`, populated with MET-26 fallback | `src/lib/service/portal-service.test.ts:303` - `dimensions[0].peso` `toBe(13)`, `pesoPadrao` `toBe(10)`, `areaDmbok` `toBe("Data Security")`; `:331` fallback `pesoPadrao` `toBe(12)`, `areaDmbok` `toBe("")`; schema `src/lib/dto/portal.test.ts:198,207` (required fields) | ✅ PASS |
| MET-28 | StageHero renders `INDEX_LABEL`, no "CMMI" | `src/components/portal/StageHero.test.tsx:59` `getByText(INDEX_LABEL)`; `:60` `queryByText(/CMMI/)` `toBeNull()` (`INDEX_LABEL` itself pinned by MET-13) | ✅ PASS |
| MET-29 | Score via `formatScore`, e.g. "2,3 de 5" | `StageHero.test.tsx:54` - `screen.getByText("2,3 de 5")` for valor 2.34 | ✅ PASS |
| MET-30 | AnswersTable renders `formatWeight(peso,pesoPadrao)` + `areaDmbok` | `src/components/portal/AnswersTable.test.tsx:43` `getByText("13% (padrão 10%)")`; `:44` `getAllByText("10% (padrão)").length` `toBe(9)`; `:49` `getByText("Data Security")`; `:50` 9× "Data Governance" | ✅ PASS |
| MET-31 | MaturityBars renders `SCALE_LEGEND` | `src/components/portal/MaturityBars.test.tsx:52` - `getByText(SCALE_LEGEND)` (exact literal pinned by MET-14) | ✅ PASS |
| MET-32 | "Nota metodológica" section with `METHOD_NOTE` in public and manager | `src/components/portal/DiagnosticPortal.test.tsx:361,363` (`mode="public"`: heading by role + `getByText(METHOD_NOTE)`), `:366,368` (`mode="manager"`) | ✅ PASS |

### P2: Documentation (MET-33..34) — grep evidence

| Criterion | Spec-defined outcome | Evidence | Result |
| --------- | -------------------- | -------- | ------ |
| MET-33 | AGENTS.md §5 names DAMA-DMBOK2 as single reference; no "DCAM"/"CMMI-like" | `AGENTS.md:131` heading "## 5. Domain Model (DAMA-DMBOK2)", `AGENTS.md:133` "DAMA-DMBOK2, cap. 15 … is the single methodological reference"; `grep -c "DCAM\|CMMI-like" AGENTS.md` = 0 | ✅ PASS |
| MET-34 | ADR 011 states decision, fixed bands with sector weights, positioning sentence | `docs/decisions/011-dmbok2-base-metodologica.md:56-70` (band table Inicial [1.0,1.8) … Otimizado [4.2,5.0], sector `descricao` kept), `:78` positioning sentence identical to `meta.referencia`; `.specs/STATE.md:20` AD-012 (only that line added) | ✅ PASS |

**Status**: ✅ 34/34 ACs covered with spec-exact assertions.

### P1: MET-35 — adjusted weight in the agent payload (re-verification, commit `47faa0d`)

| Criterion | Spec-defined outcome | `file:line` + assertion | Result |
| --------- | -------------------- | ----------------------- | ------ |
| MET-35 (a) | `agent_payload.respostas[].peso` = `result.dimensionScores[].peso`, not the contract base weight | `src/lib/screener/agent-payload.test.ts:104` - `expect(SCREENER_CONTRACT.dimensoes.find(d => d.id === "d07")?.peso).toBe(10)` (base stays 10) and `:105` - `expect(d07?.peso).toBe(13)` with `result.dimensionScores` d07 set to 13. Implementation `src/lib/screener/agent-payload.ts:64` (map from `result.dimensionScores`) and `:74` (`adjustedWeights.get(dim.id) ?? dim.peso`) | ✅ PASS |
| MET-35 (b) | Dimension missing from the result → contract `peso` | `agent-payload.test.ts:117` - `expect(payload.respostas.find(r => r.dimensao_id === "d07")?.peso).toBe(10)` with d07 filtered out of `dimensionScores` | ✅ PASS |

The submission path hands the contextual result to the builder (`src/lib/service/screen-service.ts:103` `computeContextualScores`, `:116` `buildAgentPayload({ …, result, … })`), so the builder-level assertions above hold for persisted payloads.

**Status**: ✅ 35/35 ACs covered with spec-exact assertions.

### Spec-precision gaps (non-blocking, logged, no fix task)

| # | Observation | Spec ref | Why it does not fail |
| - | ----------- | -------- | -------------------- |
| 1 | The spec does not say how `formatScore` rounds a float tie (e.g. 2.25, 2.35). `toFixed(1)` is used and only 2.34 and 5 are asserted. | MET-17 | Spec examples are asserted exactly; ties are undefined behavior. |
| 2 | MET-07 lists the five band limits but the only boundary values asserted through `computeContextualScores` are 2.6 and 5.0 (the listed edge case). 1.8, 3.4 and 4.2 are covered through the it.each uniform-level cases (1..5) and the contract limits, not as exact-boundary scores. | MET-07, Edge Cases | Boundary rule is one `>=`/`<` comparison already exercised at 2.6, shared by all bands. |
| 3 | MET-08 range [1.8, 2.0): one in-range sample (1.93) asserted. | MET-08 | Spec outcome is a single band; sample is inside the range, and the "before" value (Inicial) is not asserted. |
| 4 | MET-33/MET-34 have no automated test, as the spec states ("Independent Test: grep"). Evidence is grep plus the build gate. | MET-33, MET-34 | Spec-mandated verification method. |
| 5 | ~~MET-35 is worded at submission level, but its tests exercised `buildAgentPayload` only; sensor S7 survived.~~ **Closed by T16 (`25ab060`)**: `src/lib/service/screen-service.test.ts:414` drives `submitScreener` with a resolved `SCORING_CALIBRATION` for Saúde and asserts `expect(d07?.peso).toBe(13)` (`:430`), `expect(d07?.peso).not.toBe(10)` (`:431`) and `expect(resposta.peso).toBe(expectedPesos.get(resposta.dimensao_id))` for every dimension (`:433`). S7 and S8 are now killed. | MET-35, MET-07 | Resolved; no follow-up needed. |

---

## Edge Cases

- [x] Calibration with `recalibrated_bands` limits different from the contract still classifies by the contract: `scoring.test.ts:317-344` (1.9 → "Emergente", min 1.8, max 2.6, descricao "Setorial Emergente"); seed alignment `scoring-calibration.test.ts:155`.
- [x] Boundary 2.6 → "Estruturado" (`scoring.test.ts:346-366`, `toBeCloseTo(2.6,10)` and `rotulo` `toBe("Estruturado")`); 5.0 → "Otimizado" (`scoring.test.ts:369-382`, plus the Indústria Otimizado `descricao`).
- [x] Dimension id absent from calibration/contract: PDF and portal use `peso` for both weights and an empty area without throwing: `analysis-service.test.ts:433` (`processNext` resolves `{ processed: true }`), `admin-service.test.ts:457`, `portal-service.test.ts:331`. The PDF renderer omits the area line when `areaDmbok` is `""` (`report-generator.ts` `dimension.areaDmbok ? … : null`).

---

## Discrimination Sensor

Scratch: `git worktree add --detach /private/tmp/claude-501/verifier-scratch HEAD` (symlinked `node_modules`, copied `.env.local`). Each mutant applied with an exact-string replacement, full `npx vitest run` executed, then `git checkout -- .` in the scratch. Baseline: real-tree `git status --porcelain` empty before the sensor and after `git worktree remove --force` (identical).

| # | File | Description | Killed? (first failing test) |
| - | ---- | ----------- | ---------------------------- |
| M1 | `src/lib/screener/scoring.ts` | Re-enabled segment limits in `computeContextualScores` (scoring faixas = segment `recalibrated_bands`) | ✅ Killed — `scoring.test.ts` "ignora limites setoriais divergentes … (MET-07)" |
| M2 | `scoring.ts` | `if (!segmentBand) return result;` → `return result;` (sector `descricao` never applied) | ✅ Killed — 9 tests (MET-08/09/07 cases) |
| M3 | `scoring.ts` | Segment band matcher `band.rotulo === result.band.rotulo` → `true` (wrong band text) | ✅ Killed — 8 tests |
| M4 | `src/lib/maturity/methodology.ts` | `formatWeight` equal-case branch disabled (`peso === pesoPadrao` → `false`) | ✅ Killed — `methodology.test.ts` + `AnswersTable.test.tsx` |
| M5 | `methodology.ts` | `formatScore` decimal separator removed ("2.3 de 5") | ✅ Killed — `methodology.test.ts` ×2, `StageHero.test.tsx` |
| M6 | `methodology.ts` | `describeDimension` fallback `?? peso` → `?? 0` | ✅ Killed — 6 tests across methodology, admin, analysis, portal |
| M7 | `methodology.ts` | `describeDimension` fallback area `""` → `"N/A"` | ✅ Killed — 6 tests |
| M8 | `methodology.ts` | `getBaseWeight` unknown → `0` instead of `null` | ✅ Killed — 7 tests |
| M9 | `src/lib/report/report-generator.ts` | Table header "PESO PADRÃO" → "PESO" | ✅ Killed — `report-generator.test.ts` MET-22 |
| M10 | `report-generator.ts` | PESO PADRÃO cell renders `peso` instead of `pesoPadrao` | ✅ Killed — MET-23 |
| M11 | `report-generator.ts` | Stage card eyebrow reverted to "ESTÁGIO ATUAL" | ✅ Killed — MET-20 |
| M12 | `report-generator.ts` | Last header restored to "SCORE" | ✅ Killed — MET-22 |
| M13 | `src/components/portal/StageHero.tsx` | Label replaced by "Estágio atual · CMMI" | ✅ Killed — MET-28 |
| M14 | `StageHero.tsx` | Score rendered with raw `toFixed(1)` | ✅ Killed — "mostra o score e a faixa do diagnóstico" |
| M15 | `src/components/portal/DiagnosticPortal.tsx` | `METHOD_NOTE` text only in manager mode (`isManager ? METHOD_NOTE : ""`) | ✅ Killed — MET-32 test |
| M16 | `DiagnosticPortal.tsx` | `METHOD_NOTE` text only in public mode | ✅ Killed — MET-32 test |
| M17 | `src/lib/service/portal-service.ts` | `describeDimension` spread replaced by `pesoPadrao: r.peso, areaDmbok: ""` | ✅ Killed — MET-27 |
| M18 | `src/lib/service/analysis-service.ts` | Same removal in `buildPdfInput` | ✅ Killed — MET-26 + regression test |
| M19 | `src/lib/service/admin-service.ts` | Same removal in `buildPdfInput` | ✅ Killed — MET-26 |
| M20 | `src/components/portal/AnswersTable.tsx` | `formatWeight(dim.peso, dim.peso)` | ✅ Killed — MET-30 |
| M21 | `src/components/portal/MaturityBars.tsx` | `SCALE_LEGEND` removed | ✅ Killed — MET-31 |
| M22 | `docs/snapshot-maturidade-dados.json` | d09 `area_dmbok` reverted to "DCAM — Analytics Management" | ✅ Killed — contract ×2, `getAreaDmbok` |
| M23 | `snapshot-maturidade-dados.json` | d07 level-3 option text reverted | ✅ Killed — MET-06 `toEqual` |
| M24 | `docs/scoring-calibration.json` | Indústria Inicial `max` 1.8 → 2.0 | ✅ Killed — MET-12 |
| M25 | `report-generator.ts` | Method note replaced by the pre-feature text | ✅ Killed — MET-24 |
| M26 | `DiagnosticPortal.tsx` | Heading "Nota metodológica" → "Nota" | ✅ Killed — MET-32 |

### Re-verification sensor (T15, scratch `verifier-scratch2` at `47faa0d`)

| # | File | Description | Killed? (first failing test) |
| - | ---- | ----------- | ---------------------------- |
| S1 | `src/lib/screener/agent-payload.ts:74` | Mapping reverted to the contract base weight (`dim.peso`) | ✅ Killed — `agent-payload.test.ts` "grava o peso de result.dimensionScores…" |
| S2 | `agent-payload.ts:74` | Fallback `?? dim.peso` → `?? 0` | ✅ Killed — "cai para o peso do contrato quando a dimensão não está no resultado" |
| S3 | `agent-payload.ts:74` | Fallback `?? dim.peso` → `?? 99` | ✅ Killed — same fallback test |
| S4 | `agent-payload.ts:74` | Lookup key never matches (always fallback) | ✅ Killed — adjusted-weight test |
| S5 | `agent-payload.ts:64` | Map stores `nivel` instead of `peso` | ✅ Killed — adjusted-weight test |
| S6 | `agent-payload.ts:74` | Adjusted weight floored to multiples of 10 | ✅ Killed — 4 tests (`agent-payload.test.ts` ×3, `screener.test.ts` schema) |
| S7 | `src/lib/service/screen-service.ts:103` | `computeContextualScores` bypassed (`computeScores` only) | ✅ Killed after T16 (`25ab060`) — `screen-service.test.ts` "agent_payload persistido grava o peso ajustado ao setor de Saúde (MET-35)". On the `47faa0d` pass it survived; that gap is closed. |
| S8 | `screen-service.ts:103-110` | `computeContextualScores` receives an empty profile (`profile: {}`), so no sector weights apply | ✅ Killed — same T16 test |

**Re-verification result**: S1–S6 killed on the T15 code at `47faa0d`; S7 survived there and was killed after T16 along with S8 (8/8 killed on `25ab060`).

**Sensor depth**: expanded (≥5 behavior-level mutations; 26 injected in the first pass, covering all 5 phases and every suggested target).
**Result**: 26/26 killed on the first pass — PASS ✅

Method note: a first attempt at M15/M16 wrapped the JSX in a regex-built conditional that crashed the suite (748 tests collected instead of 766). That "kill" came from a compile error, not an assertion, so it was discarded and M15/M16 were redone as valid text-level mutations above.

---

## Code Quality

| Principle | Status |
| --------- | ------ |
| Minimum code | ✅ one new module (`methodology.ts`, 38 lines), call sites use `describeDimension` |
| Surgical changes | ✅ `src/lib/cmmi/` and `cmmiStageSchema` untouched (spec Out of Scope); no new routes/migrations |
| No scope creep | ✅ only the 4 level-3 option texts and 3 `area_dmbok` values changed in the contract; weights/multipliers/stage names unchanged |
| Matches patterns | ✅ named exports, `import type`, no `process.env`/`server-only` in the shared module (asserted in `methodology.test.ts:98`) |
| Spec-anchored outcome check (asserted values match spec) | ✅ see per-AC tables |
| Per-layer Coverage Expectation (domain 1:1 ACs; services assert `pesoPadrao`/`areaDmbok` values incl. fallback) | ✅ |
| Every test maps to a spec requirement | ✅ new tests carry MET ids or listed edge cases; modified legacy assertions cite MET-07/09/26/29 and none was deleted |
| Documented guidelines followed | `AGENTS.md` §7 Testing (Vitest, mock externals) and §9 Zod boundary (`portalDTOSchema` extended) |
| Lint warnings | 3 pre-existing `@next/next/no-page-custom-font` warnings in `src/app/layout.tsx` (file not in diff) |

---

## Gate Check

**Re-run on `25ab060` (scratch worktree `verifier-scratch3`, final state)**: `npm run typecheck && npm run lint && npm run test && npm run build` → chain exit 0; 768 passed, 0 failed, 1 skipped (769 tests); 67 files passed, 1 skipped; build `✓ Compiled successfully`. Delta vs the `47faa0d` run: +1 test (the T16 end-to-end case). The `47faa0d` run had 767 passed; baseline before the feature remains 708 passed.

**First pass on `3459616`:**

- **Gate command** (run in the scratch worktree): `npm run typecheck && npm run lint && npm run test && npm run build`
- **Exit codes**: typecheck 0, lint 0 (warnings only, pre-existing), test 0, build 0; chain exit 0
- **Result**: 765 passed, 0 failed, 1 skipped (766 tests); 67 test files passed, 1 skipped (68)
- **Test count before feature** (baseline in `tasks.md`): 708 passed, 1 skipped (66 files passed, 1 skipped)
- **Test count after feature**: 765 passed, 1 skipped (67 files passed, 1 skipped)
- **Delta**: +57 tests, +1 file (`src/lib/maturity/methodology.test.ts`); count never dropped
- **Skipped tests**: 1, the same skip present in the baseline (unrelated to this feature)
- **Failures**: none
- Build output: `✓ Compiled successfully`, static and dynamic routes generated.

---

## Requirement Traceability Update

`spec.md` traceability moved from "Implementing" to "✅ Verified" for MET-01..MET-35 after the re-verification.

| Requirement | Previous Status | New Status |
| ----------- | --------------- | ---------- |
| MET-01..MET-35 | Implementing | ✅ Verified |

---

## Summary

**Overall**: ✅ Ready

**Spec-anchored check**: 35/35 ACs matched spec outcome | 4 non-blocking spec-precision notes (note 5 closed by T16)
**Sensor**: 35/35 mutations killed on the final code (26 first pass + S1–S6 on T15 + S7, S8 after T16); the S7 survivor at `47faa0d` is closed
**Gate**: 768 passed, 0 failed, 1 skipped on `25ab060`; typecheck/lint/test/build all exit 0

**What works**: Contract v1.2 with the exact spec strings; one stage ruler for every segment with the sector text kept as `descricao`; a single methodology module feeding PDF and portal; PDF table with sector and default weights; portal with index label, formatted score, weights, legend and the note in both modes; AGENTS.md and ADR 011 aligned.

**Issues found**: none blocking.

**Next steps**: re-run the smoke of the 3 leads and the `/admin` login as listed in the spec Success Criteria; no push or PR was performed.
