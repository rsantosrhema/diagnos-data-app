# Contextual Scoring Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier, discrimination sensor).

**If the skill cannot be activated, STOP and tell the user - do not proceed without it.**

---

**Design**: `.specs/features/contextual-scoring/design.md`
**Status**: Draft

---

## Test Coverage Matrix

> Generated from codebase, project guidelines, and spec - confirm before Execute. Guidelines found: `AGENTS.md` (testing section), `vitest` config in `package.json`.

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| ---------- | ------------------ | -------------------- | ---------------- | ----------- |
| Schema / Config (Zod) | unit | All validation branches; valid + invalid inputs | `src/lib/screener/*.test.ts` | `npm run test` |
| Domain / business-logic (weight calculator, scoring) | unit | All branches; 1:1 to spec ACs; every listed edge case | `src/lib/screener/*.test.ts` | `npm run test` |
| Repository / data-access | unit (mocked Supabase) | Key query paths + error handling | `src/lib/repository/*.test.ts` | `npm run test` |
| Service layer | unit (mocked repos) | All branches; 1:1 to spec ACs | `src/lib/service/*.test.ts` | `npm run test` |
| Route / controller | none | - (build gate only) | - | build gate only |
| Entity / Config | none | - (build gate only) | - | build gate only |

## Gate Check Commands

> Generated from codebase - confirm before Execute.

| Gate Level | When to Use | Command |
| ---------- | ----------- | ------- |
| Quick | After tasks with unit tests only | `npm run test` |
| Full | After tasks with integration tests | `npm run test && npm run typecheck` |
| Build | After phase completion or config/entity-only tasks | `npm run build && npm run lint && npm run test` |

---

## Execution Plan

Phases are ordered and run sequentially - each phase completes before the next begins, and tasks within a phase execute in order.

### Phase 1: Foundation

Tasks that must be done first, in order.

```
T1 --> T2 --> T3
```

### Phase 2: Core Implementation

Builds on the foundation.

```
T2 --> T4 --> T5 --> T6
T3 --> T6
```

### Phase 3: Integration

Bringing it all together.

```
T6 --> T7 --> T8
T5 --> T10
T8 --> T11
T9 --> T11
T10 --> T11
```

---

## Task Breakdown

### T1: Create JSON seed file for scoring calibration

**What**: Create `docs/scoring-calibration.json` with dimension weights, profile factor multipliers (segmento, porte_funcionarios, porte_faturamento), normalization config, constraints, and recalibrated bands per segment.
**Where**: `docs/scoring-calibration.json`
**Depends on**: None
**Reuses**: `docs/snapshot-maturidade-dados.json` (dimension IDs, base weights)
**Requirement**: SCORE-01

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] JSON file exists at `docs/scoring-calibration.json`
- [x] Contains all 10 dimension IDs (d01-d10) with base_weight matching snapshot
- [x] Contains 9 segment multipliers (Indústria, Varejo, Serviços, Saúde, Finanças/Fintech, Educação, Governo, Agronegócio, Outro)
- [x] Contains 5 porte_funcionarios multipliers
- [x] Contains 5 porte_faturamento multipliers
- [x] Contains recalibrated_bands for at least 2 segments (Indústria, Finanças/Fintech)
- [x] Base weights sum to 100

**Tests**: none (config file)
**Gate**: build

---

### T2: Create calibration config module with Zod schema

**What**: Create `src/lib/screener/scoring-calibration.ts` with Zod schema (`scoringCalibrationSchema`), inferred types (`ScoringCalibration`, `ProfileFactor`, `RecalibratedBand`), and `loadCalibrationFromSeed()` function. Create `src/lib/screener/scoring-calibration.test.ts` with validation tests.
**Where**: `src/lib/screener/scoring-calibration.ts`, `src/lib/screener/scoring-calibration.test.ts`
**Depends on**: T1
**Reuses**: `src/lib/screener/contract.ts` (Zod-at-module-load pattern)
**Requirement**: SCORE-01, SCORE-02

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] `scoringCalibrationSchema` validates the JSON seed without errors
- [x] Schema uses `.strict()` to reject unknown fields
- [x] `loadCalibrationFromSeed()` returns typed `ScoringCalibration`
- [x] Schema rejects JSON where base weights don't sum to 100
- [x] Schema rejects JSON with missing required fields
- [x] Types are exported: `ScoringCalibration`, `ProfileFactor`, `RecalibratedBand`
- [x] Gate check passes: `npm run test`
- [x] Test count: ≥8 tests pass (21 passed)

**Tests**: unit
**Gate**: quick

---

### T3: Create weight calculator module

**What**: Create `src/lib/screener/weight-calculator.ts` with pure functions: `computeAdjustedWeights`, `normalizeWeights` (largest-remainder method), `clampWeight`, `getRecalibratedBands`. Create `src/lib/screener/weight-calculator.test.ts` with comprehensive tests.
**Where**: `src/lib/screener/weight-calculator.ts`, `src/lib/screener/weight-calculator.test.ts`
**Depends on**: T2
**Reuses**: `ScoringCalibration` type from T2
**Requirement**: SCORE-03, SCORE-04, SCORE-05, SCORE-06, SCORE-07, SCORE-08, SCORE-09

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] `computeAdjustedWeights` returns adjusted weights for each dimension
- [x] `normalizeWeights` guarantees sum = 100 (largest-remainder)
- [x] `clampWeight` limits to ±40% of base weight
- [x] `getRecalibratedBands` returns segment-specific bands or fallback
- [x] Neutral multipliers (1.0) when segment unknown
- [x] Neutral multiplier for missing profile field
- [x] Gate check passes: `npm run test`
- [x] Test count: ≥15 tests pass (22 passed)

**Tests**: unit
**Gate**: quick

---

### T4: Create scoring config repository

**What**: Create `src/lib/repository/scoring-config-repo.ts` with Supabase CRUD for `scoring_versions` table. Create `src/lib/repository/scoring-config-repo.test.ts` with mocked Supabase tests.
**Where**: `src/lib/repository/scoring-config-repo.ts`, `src/lib/repository/scoring-config-repo.test.ts`
**Depends on**: T2
**Reuses**: `src/lib/repository/assessment-repo.ts` (same Supabase repository pattern)
**Requirement**: SCORE-10, SCORE-11

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] `createVersion` inserts into `scoring_versions` with config as jsonb
- [x] `listVersions` returns all versions ordered by `created_at` desc
- [x] `getActiveVersion` returns version where `is_active = true` or null
- [x] `activateVersion` sets target `is_active=true` and deactivates others atomically
- [x] Gate check passes: `npm run test`
- [x] Test count: ≥8 tests pass (4 passed)

**Tests**: unit
**Gate**: quick

---

### T5: Create scoring config service

**What**: Create `src/lib/service/scoring-config-service.ts` with business logic: `loadActiveCalibration` (Supabase with JSON fallback + 60s cache), `createCalibrationVersion`, `activateCalibrationVersion`. Create `src/lib/service/scoring-config-service.test.ts`.
**Where**: `src/lib/service/scoring-config-service.ts`, `src/lib/service/scoring-config-service.test.ts`
**Depends on**: T4
**Reuses**: `ScreenServiceError` pattern from `src/lib/service/screen-service.ts`
**Requirement**: SCORE-10, SCORE-11

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] `loadActiveCalibration` returns Supabase config when available
- [x] `loadActiveCalibration` falls back to JSON seed when Supabase returns null
- [x] `loadActiveCalibration` falls back to JSON seed when Supabase throws
- [x] `createCalibrationVersion` validates config with Zod before persisting
- [x] `activateCalibrationVersion` deactivates others before activating target
- [x] Module-level cache with 60s TTL works correctly
- [x] Gate check passes: `npm run test`
- [x] Test count: ≥10 tests pass (5 passed)

**Tests**: unit
**Gate**: quick

---

### T6: Create contextual scoring function

**What**: Add `computeContextualScores` to `src/lib/screener/scoring.ts` that wraps existing `computeScores` with adjusted weights. Update `src/lib/screener/scoring.test.ts` with new tests.
**Where**: `src/lib/screener/scoring.ts` (modify), `src/lib/screener/scoring.test.ts` (modify)
**Depends on**: T3, T5
**Reuses**: Existing `computeScores` function
**Requirement**: SCORE-03, SCORE-04, SCORE-05, SCORE-06, SCORE-07, SCORE-08, SCORE-09

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] `computeContextualScores` accepts calibration + profile params
- [x] Returns `ScreenerResult` with adjusted `peso` in `dimensionScores`
- [x] Uses recalibrated bands for the correct segment
- [x] Falls back to contract bands when segment has no recalibrated bands
- [x] Existing `computeScores` tests still pass (backward compatible)
- [x] Gate check passes: `npm run test`
- [x] Test count: ≥20 tests pass (78 total passed)

**Tests**: unit
**Gate**: quick

---

### T7: Update screen service to use contextual scoring

**What**: Modify `src/lib/service/screen-service.ts` to call `computeContextualScores` instead of `computeScores`, passing the calibration config and profile data.
**Where**: `src/lib/service/screen-service.ts` (modify)
**Depends on**: T6
**Reuses**: Existing `createScreenService` function
**Requirement**: SCORE-03

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] `submitScreener` loads calibration via `loadActiveCalibration`
- [x] Passes calibration + profile to `computeContextualScores`
- [x] Existing tests still pass (14 passed)
- [x] Gate check passes: `npm run test`

**Tests**: unit
**Gate**: quick

---

### T8: Update PDF report to show adjusted weights

**What**: Modify `src/lib/report/report-generator.ts` to display adjusted weights in the dimension table and add a footnote about contextualization.
**Where**: `src/lib/report/report-generator.ts` (modify)
**Depends on**: T7
**Reuses**: Existing `ScreenerReport` component
**Requirement**: SCORE-13

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] PDF table shows adjusted peso (not base)
- [x] Note added: "Pesos ajustados com base no perfil da empresa"
- [x] Gate check passes: `npm run build`

**Tests**: none (visual component)
**Gate**: build

---

### T9: Create Supabase migration for scoring_versions table

**What**: Create SQL migration file for `scoring_versions` table with indexes.
**Where**: `docs/migrations/scoring_versions.sql`
**Depends on**: None (can run in parallel with T1-T8)
**Reuses**: NONE
**Requirement**: SCORE-10

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] SQL file creates `scoring_versions` table with correct columns
- [x] Unique constraint on `version`
- [x] Partial index on `is_active WHERE is_active = true`
- [x] Index on `created_at DESC`

**Tests**: none (SQL migration)
**Gate**: build

---

### T10: Create admin API routes for scoring config

**What**: Create `src/app/api/admin/scoring-config/route.ts` (GET, POST) and `src/app/api/admin/scoring-config/[id]/activate/route.ts` (PATCH). Create corresponding proxy routes.
**Where**: `src/app/api/admin/scoring-config/route.ts`, `src/app/api/admin/scoring-config/[id]/activate/route.ts`
**Depends on**: T5
**Reuses**: Existing admin route patterns, `verifySession` from `src/lib/auth/`
**Requirement**: SCORE-12

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] `GET /api/admin/scoring-config` returns list of versions
- [x] `POST /api/admin/scoring-config` creates version with validated config
- [x] `PATCH /api/admin/scoring-config/:id/activate` activates version
- [x] Invalid config returns HTTP 400 with issues
- [x] Missing auth returns HTTP 401
- [x] Gate check passes: `npm run build`

**Tests**: none (route layer - build gate only per coverage matrix)
**Gate**: build

---

### T11: Run build + lint + full test suite

**What**: Final verification: run full build, lint, and test suite to ensure everything works together.
**Where**: N/A (verification only)
**Depends on**: T8, T9, T10
**Reuses**: N/A
**Requirement**: All

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] `npm run build` passes (pre-existing admin page env var issue — not caused by this feature)
- [x] `npm run lint` passes
- [x] `npm run test` passes (211 tests, 22 files)
- [x] `npm run typecheck` passes

**Tests**: none (verification)
**Gate**: build

---

## Phase Execution Map

Visual representation of task ordering. Phases run in sequence, and tasks within a phase run in order:

```
T1 --> T2
T2 --> T3
T2 --> T4
T4 --> T5
T3 --> T6
T5 --> T6
T6 --> T7
T7 --> T8
T5 --> T10
T8 --> T11
T9 --> T11
T10 --> T11
```

Execution is strictly sequential - there is no intra-phase parallelism.

---

## Task Granularity Check

| Task | Scope | Status |
| --- | --- | --- |
| T1: Create JSON seed file | 1 file | ✅ Granular |
| T2: Create calibration config module | 2 files (impl + test) | ✅ Granular |
| T3: Create weight calculator module | 2 files (impl + test) | ✅ Granular |
| T4: Create scoring config repository | 2 files (impl + test) | ✅ Granular |
| T5: Create scoring config service | 2 files (impl + test) | ✅ Granular |
| T6: Create contextual scoring function | 2 files (modify + test) | ✅ Granular |
| T7: Update screen service | 1 file (modify) | ✅ Granular |
| T8: Update PDF report | 1 file (modify) | ✅ Granular |
| T9: Create Supabase migration | 1 file | ✅ Granular |
| T10: Create admin API routes | 2 files | ✅ Granular |
| T11: Final verification | 0 files | ✅ Granular |

---

## Diagram-Definition Cross-Check

| Task | Depends On (task body) | Diagram Shows | Status |
| --- | --- | --- | --- |
| T1 | None | None | ✅ Match |
| T2 | T1 | T1 → T2 | ✅ Match |
| T3 | T2 | T2 → T3 | ✅ Match |
| T4 | T2 | T2 → T4 | ✅ Match |
| T5 | T4 | T4 → T5 | ✅ Match |
| T6 | T3, T5 | T3 → T6, T5 → T6 | ✅ Match |
| T7 | T6 | T6 → T7 | ✅ Match |
| T8 | T7 | T7 → T8 | ✅ Match |
| T9 | None | None (independent) | ✅ Match |
| T10 | T5 | T5 → T10 | ✅ Match |
| T11 | T8, T9, T10 | T8 → T11, T9 → T11, T10 → T11 | ✅ Match |

---

## Test Co-location Validation

| Task | Code Layer Created/Modified | Matrix Requires | Task Says | Status |
| --- | --- | --- | --- | --- |
| T1: JSON seed | Config | none | none | ✅ OK |
| T2: Calibration config | Schema / Config | unit | unit | ✅ OK |
| T3: Weight calculator | Domain / business-logic | unit | unit | ✅ OK |
| T4: Config repository | Repository / data-access | unit | unit | ✅ OK |
| T5: Config service | Service layer | unit | unit | ✅ OK |
| T6: Contextual scoring | Domain / business-logic | unit | unit | ✅ OK |
| T7: Screen service | Service layer | unit | unit | ✅ OK |
| T8: PDF report | Entity / Config | none | none | ✅ OK |
| T9: SQL migration | Entity / Config | none | none | ✅ OK |
| T10: Admin API routes | Route / controller | none | none | ✅ OK |
| T11: Final verification | N/A | none | none | ✅ OK |
