# Market Insights Agents (Slice 1) Validation

**Date**: 2026-08-29
**Spec**: `.specs/features/market-insights-agents/spec.md`
**Diff range**: `8176a7a..1df9104` (feature commits `8c2d352` through `1df9104`)
**Verifier**: independent sub-agent (author ≠ verifier)

---

## Task Completion

| Task | Status | Notes |
| ---- | ------ | ----- |
| T1  | ✅ Done | `src/lib/agents/types.ts` + 27 tests in `types.test.ts` |
| T2  | ✅ Done | `src/lib/env.ts` + `.env.example` |
| T3  | ✅ Done | `src/lib/agents/llm.ts` (`getLlmModel`) |
| T4  | ✅ Done | `src/lib/agents/segment-skills.ts` + 5 skill files + 9 tests |
| T5  | ✅ Done | `src/lib/agents/researcher.ts` + 6 tests |
| T6  | ✅ Done | `src/lib/agents/analyst.ts` + 5 tests |
| T7  | ✅ Done | `src/lib/agents/writer.ts` + 5 tests |
| T8  | ✅ Done | `src/lib/agents/orchestrator.ts` + 4 tests |
| T9  | ✅ Done | `supabase/migrations/0007_market_insights.sql` + `docs/data-model.md` |
| T10 | ✅ Done | `market-insights-repo.ts` + `analysis-queue-repo.ts` + 11 tests |
| T11 | ✅ Done | `src/lib/service/analysis-service.ts` + 6 tests |
| T12 | ✅ Done | `analysis-worker/route.ts` + screen-service hook + 4 new tests |

All 12 tasks marked done in `tasks.md`. Gate counts match tasks.md notes (239 → 291 tests across 12 commits).

---

## Spec-Anchored Acceptance Criteria

| Criterion (WHEN X THEN Y) | Spec-defined outcome | `file:line` + assertion | Result |
| ------------------------- | -------------------- | ----------------------- | ------ |
| INS-01 WHEN submitScreener concludes diagnosis persistence THEN enqueue job in `analysis_jobs` with the new lead's `lead_id` | `enqueueAnalysis` called with persisted `lead_id` after diagnostic persist | `src/lib/service/screen-service.test.ts:239-244` - `expect(enqueueAnalysis).toHaveBeenCalledWith("lead-1")`; hook position `src/lib/service/screen-service.ts:184-191` (after `updateStatus`) | ✅ PASS |
| INS-02 THEN respond to visitor with `{ ok: true }` immediately after enqueue, without waiting for agents | `submitScreener` resolves `{ ok: true }` with enqueue mocked, no orchestrator executed in the submit path | `src/lib/service/screen-service.test.ts:105-109` - `expect(result).toEqual({ ok: true })`; enqueue injection in submit path never runs agents (route.ts:87) | ✅ PASS |
| INS-03 IF enqueue fails THEN log and keep returning success, no error to client | submit still resolves `{ ok: true }` when `enqueueAnalysis` rejects | `src/lib/service/screen-service.test.ts:246-252` - `expect(result).toEqual({ ok: true })`; guard `src/lib/service/screen-service.ts:184-191`; service-level `src/lib/service/analysis-service.test.ts:84-90` - `resolves.toBeUndefined()` | ✅ PASS |
| INS-04 SHALL accept multiple jobs per lead (dedup controlled by worker) | multiple enqueues allowed; upsert by `lead_id` makes reprocessing idempotent | `src/lib/repository/market-insights-repo.test.ts:43-68` - `upsert(..., { onConflict: "lead_id" })`; `analysis-service.test.ts:106-136` processes a popped job for `lead-1` | ✅ PASS |
| INS-05 WHEN worker processes a job THEN build 4 Exa queries (segmento, faturamento, porte, concorrentes) from `agent_payload` | 4 queries incl. concorrentes built from payload; concorrentes omitted when no company name | `src/lib/agents/researcher.test.ts:49-87` - `expect(searchMock).toHaveBeenCalledTimes(4)` and section keys `["segmento","faturamento","porte","concorrentes"]`; omission `researcher.test.ts:144-161` - `toHaveBeenCalledTimes(3)` | ✅ PASS |
| INS-06 THEN consolidate results into `MarketResearch` with per-query sections + sources (URLs) | `MarketResearch.sources` = deduped URLs; sections carry query/results; empresa forwarded | `src/lib/agents/researcher.test.ts:69-86` - `research.sections.map(key)` + `expect(research.sources).toContain("https://exemplo.com/a")`; dedupe `researcher.test.ts:105-119` - `toEqual(["https://exemplo.com/dup"])` | ✅ PASS |
| INS-07 WHEN one Exa query fails THEN record section empty with error status, don't abort pipeline | failed query → section `status:"erro"`, `results:[]`, `error` set; others `status:"ok"` | `src/lib/agents/researcher.test.ts:121-142` - `conc.status).toBe("erro")`, `conc.results).toEqual([])`, `conc.error).toContain("timeout da API Exa")`, others ok | ✅ PASS |
| INS-08 WHEN lead segment is one of the 5 skilled segments THEN load that segment skill for the analyst | `loadSegmentSkill` returns curated file content for mapped segment | `src/lib/agents/segment-skills.test.ts:55-65` - `expect(skill).toBe(conteudo)` (real file, not fallback); map coverage `:28-35`; fallback paths `:67-84` | ✅ PASS |
| INS-09 WHEN `MarketResearch` is available THEN send LLM analyst prompt with scores (per dimension, weight, band, risk) + market evidence | prompt contains dimension name, score value, band, research URL | `src/lib/agents/analyst.test.ts:99-106` - `promptText` contains `"Governança"`, `"2.1"`, `"Emergente"`, `"https://exemplo.com/relatorio"`; `schema` is `marketAnalysisSchema` | ✅ PASS |
| INS-10 WHEN prompt sent THEN use segment skill (Markdown file or generic fallback) as prompt context | skill content present in prompt; skillLoader invoked with segmento | `src/lib/agents/analyst.test.ts:98-102` - `expect(skillLoader).toHaveBeenCalledWith("Indústria")`, prompt contains `"Skill de Indústria"`; null-segment fallback `:111-127` | ✅ PASS |
| INS-11 IF LLM returns invalid JSON THEN return typed `AnalystError` (no worker crash) | reject with `AnalystError` instance on generate failure and on schema-parse failure | `src/lib/agents/analyst.test.ts:129-142` - `rejects.toBeInstanceOf(AnalystError)`; `:144-159` schema-rejection also `AnalystError` | ✅ PASS |
| INS-12 SHALL validate analyst output with strict Zod schema before persisting | output `safeParse(marketAnalysisSchema)` success asserted | `src/lib/agents/analyst.test.ts:108` - `expect(marketAnalysisSchema.safeParse(analysis).success).toBe(true)` | ✅ PASS |
| INS-13 WHEN analyst analysis is available THEN format brief with up to 10 bullets in PT-BR | brief length 10; prompt requests PT-BR (`português`) | `src/lib/agents/writer.test.ts:62-77` - `brief.bullets).toHaveLength(10)`; prompt language `:79-96` - `toContain("10")`, `.toContain("português")` | ✅ PASS |
| INS-14 SHALL classify each bullet with priority (alta/media/baixa) based on company pain + market pain | every bullet has priority in enum; prompt instructs priority | `src/lib/agents/writer.test.ts:72-75` - `["alta","media","baixa"]).toContain(bullet.prioridade)`; prompt `:92-93` | ✅ PASS |
| INS-15 IF LLM returns >10 bullets THEN truncate to 10 keeping priority order | 15 → 10, first and last order preserved | `src/lib/agents/writer.test.ts:98-111` - `brief.bullets).toHaveLength(10)`, `bullets[0].texto).toBe("Bullet 0")`, `bullets[9].texto).toBe("Bullet 9")` | ✅ PASS |
| INS-16 WHEN worker completes analysis THEN persist full payload (research, analysis, insights, sources) in `market_insights` row for the `lead_id` | upsert called with `leadId: "lead-1"` + all 4 payload fields | `src/lib/service/analysis-service.test.ts:127-134` - `expect(upsert).toHaveBeenCalledWith({ leadId:"lead-1", research: output.research, analysis: output.analysis, insights: output.insights, sources: output.research.sources, status:"analisado" })` | ✅ PASS |
| INS-17 THEN mark `status` as `analisado` on persist | upsert payload status `"analisado"` | `src/lib/service/analysis-service.test.ts:133` - `status: "analisado"` | ✅ PASS |
| INS-18 IF pipeline fails THEN mark `status` as `falha` and record error | `markStatus(leadId, "falha", <error>)` on orchestrator failure; payload-absent path also `falha` | `src/lib/service/analysis-service.test.ts:161-178` - `markStatus("lead-1","falha", expect.stringContaining("llm down"))`; `:138-159` missing payload → `falha` | ✅ PASS |
| INS-19 IF analysis already exists for `lead_id` THEN update existing row (upsert by `lead_id`) | repo upsert uses `onConflict: "lead_id"` | `src/lib/repository/market-insights-repo.test.ts:56-67` - `upsert(expect.objectContaining({lead_id:"lead-1",...}), { onConflict: "lead_id" })` | ✅ PASS |

**Status**: ✅ All 19 ACs covered with spec-anchored assertions — 0 spec-precision gaps.

---

## Discrimination Sensor

Method: isolated `git worktree add` at `HEAD` (`1df9104`) in `C:\Users\Rafael\AppData\Local\Temp\opencode\mi-sensor`, `node_modules` junctioned to the real tree, full-suite baseline verified (291 passed), mutations applied to scratch files only, targeted tests run, scratch discarded, real-tree `git status --porcelain` byte-identical to pre-sensor baseline.

| Mutation | File:line (real tree reference) | Description | Killed? |
| -------- | ------------------------------ | ----------- | ------- |
| 1 | `src/lib/agents/analyst.ts:55` | Flipped schema-validation guard `if (!parsed.success)` → `if (parsed.success)` (valid LLM output now rejected) | ✅ Killed (3/5 tests failed) |
| 2 | `src/lib/agents/researcher.ts:82` | Flipped allSettled branch `if (outcome.status === "rejected")` → `"fulfilled"` (fulfilled queries marked erro) | ✅ Killed (5/6 tests failed) |
| 3 | `src/lib/service/analysis-service.ts:68` | Changed upsert `status: "analisado"` → `"pendente"` (INS-17 state corruption) | ✅ Killed (1/6 tests failed) |
| 4 | `src/lib/agents/researcher.ts:70` | Wrapped `run` body in `new Promise(() => { void resolve; ... })` (hang — future/paranoia guard, scratch restored & re-run green) | ✅ Killed (whole test file timed out) |

**Sensor depth**: lightweight (default tier)
**Result**: 4/4 killed — PASS ✅

---

## Interactive UAT Results

Not applicable. Backend/infra-only feature (queue, agents, repos, worker route); no user-facing UI changed. Automated checks sufficient per validate.md §3.

---

## Code Quality

| Principle | Status |
| --------- | ------ |
| Minimum code | ✅ Agents/researcher/service are compact; no speculative abstraction |
| Surgical changes | ✅ Only touched files required; screen-service/route edits are narrow, dependency-injection only |
| No scope creep | ✅ Feature diff is confined to the 12-task surface; no unrelated refactors |
| Matches patterns | ✅ Layered backend (route→service→repo), Zod `.strict()`, `z.infer`, `createXRepository(supabase)`, typed errors (`AnalystError`, `WriterError`, `AnalysisServiceError`) — all match repo conventions |
| Spec-anchored outcome check (asserted values match spec) | ✅ Values asserted: `status:"analisado"`, `status:"erro"`, `onConflict:"lead_id"`, bullet length/order, `AnalystError` instances |
| Per-layer Coverage Expectation met | ✅ Domain (agents/service) 1:1 to ACs INS-01..INS-19; route happy + auth-error (401/200) covered |
| Every test maps to a spec requirement | ✅ All 56 new tests trace to an AC, edge case, or Done-when (no unclaimed tests) |
| Documented guidelines followed | ✅ AGENTS.md §7/§8/§9, `docs/rules/validation.md`, `docs/rules/architecture.md`, existing repo-test patterns |

⚠️ Two minor observations (not blocking):

1. `src/lib/env.ts:23` — `hasEnv()` is exported but unused anywhere (dead export). The worker route calls `getEnv()` unconditionally, so the built route will fail at request time if `LLM_*`/`EXA_API_KEY` are unset. Matches the design's stated serverless worker assumption (`maxDuration` follow-up, fatia 3); no spec AC is violated.
2. `package.json` deps (`ai`, `@ai-sdk/openai-compatible`, `exa-js`) landed only in the uncommitted working-tree `package.json`/`package-lock.json` diff, while `src/lib/agents/llm.ts` (T3) committed before that diff. `npm install` was run locally, so the lockfile is consistent; but if this workspace is ever re-cloned from the 12 commits alone, the agent deps would be missing. Cosmetic commit hygiene, not a testable defect — flagged, not blocking.

---

## Edge Cases

- [x] `profile` vazio (P1): `profile ?? {}` in screen-service; researcher handles null empresa fields — `researcher.test.ts:163-184` all-null empresa → 3 ok sections.
- [x] `company` ausente → concorrentes query omitted with null name — `researcher.test.ts:144-161` (`toHaveBeenCalledTimes(3)`).
- [x] Exa zero results → empty sections, no abort — `researcher.test.ts:163-184`; analyst treats absence via schema (empty lists accepted — `types.test.ts:179-183`).
- [x] Exa query error → section `status:"erro"`, pipeline continues — `researcher.test.ts:121-142`.
- [x] LLM exceeds context / invalid JSON → typed error; worker marks `falha` — `analyst.test.ts:129-142`, `writer.test.ts:113-135`, `analysis-service.test.ts:161-178`.
- [x] Duplicate job (same `lead_id`) → reprocess + upsert by `lead_id`, no duplicate row — `market-insights-repo.test.ts:43-68`, `analysis-service.test.ts:106-136`.
- [x] `market_insights` table missing → worker marks `falha` (no schema assumption) — `analysis-service.test.ts:161-178` (markStatus failure caught, `{processed:true}` returned).

---

## Gate Check

- **Gate command**: `npm run typecheck` + `npm run test` + `npm run build`
- **Result**: typecheck passed; test 291 passed / 0 failed / 0 skipped; build passed
- **Test count before feature**: 239 (from tasks.md T1 gate note)
- **Test count after feature**: 291
- **Delta**: +52 new tests
- **Skipped tests**: none
- **Failures**: none

Notes:
- `npm run lint` is NOT runnable: no ESLint is configured in this repo (`next lint` prompts interactively to initialize ESLint — pre-existing condition, unrelated to this feature). Skipped with justification.
- Baseline at `8176a7a` had 239 tests (per tasks.md commit gates: 239 → 248 → 254 → 259 → 264 → 268 → 281 → 287 → 291).

---

## Fix Plans (if issues found)

### Fix 1 (Minor): `hasEnv()` dead export

- **Root cause**: `src/lib/env.ts:23` exports a helper nothing imports.
- **Fix task**: Remove the unused export (or wire the worker route to use it to short-circuit when LLM/Exa env is absent).
- **Priority**: Minor (no test impact; not required for slice-1 ACs).

### Fix 2 (Minor): commit hygiene — agent deps only in working-tree diff

- **Root cause**: T3 `feat(agents): add llm factory` (8bc038e) did not include `package.json`/`package-lock.json`; deps are only in the uncommitted diff, so the committed range alone lacks the dependency declarations.
- **Fix task**: Commit `package.json` + `package-lock.json` together with the agent deps, or amend 8bc038e.
- **Priority**: Minor (repo currently builds/tests green because the lockfile is present in the working tree).

---

## Requirement Traceability Update

| Requirement | Previous Status | New Status |
| ----------- | --------------- | ---------- |
| INS-01..INS-19 | Pending | ✅ Verified |

**Coverage**: 19/19 ACs verified, 0 mapped-to-task gaps.

---

## Summary

**Overall**: ✅ Ready

**Spec-anchored check**: 19/19 ACs matched spec outcome, 0 spec-precision gaps
**Sensor**: 4/4 mutations killed
**Gate**: typecheck ✅, test ✅ (291 passed), build ✅; lint not runnable (pre-existing, no ESLint config)

**What works**: The 3-agent pipeline (researcher → analyst → writer) is fully unit-covered 1:1 to ACs; enqueue is non-blocking with failure isolation (INS-03); persistence is a true upsert by `lead_id` with `analisado`/`falha` status; the worker route is auth-gated; Exa `allSettled` failure isolation is test-verified; segment skills load with file/fallback paths covered.

**Issues found**: Two minors only — unused `hasEnv()` export, and agent deps not included in the committed feature range (present only in the working-tree diff).

**Next steps**: Route Fix 1/Fix 2 to the orchestrator (both Minor). No re-verification iteration needed for the AC surface.
