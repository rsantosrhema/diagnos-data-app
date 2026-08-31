# Observabilidade do Pipeline de Relatórios Validation

**Date**: 2026-08-31
**Spec**: `.specs/features/report-observability/spec.md`
**Diff range**: `6b9de6d..HEAD` (base `6b9de6d` = token-flow removal baseline, excluded; feature commits `aca1ed8`, `d0cffff`, `1331a50`, `ecc2b7d`, `388c122`, `08f3311`)
**Verifier**: independent sub-agent (author ≠ verifier)

---

## Task Completion

| Task | Status | Notes |
| ---- | ------ | ----- |
| T1 | ✅ Done | Migration `0009_report_observability.sql` (`aca1ed8`) |
| T2 | ✅ Done | Repos queue + insights (`d0cffff`) |
| T3 | ✅ Done | `analysis-service` read→pipeline→ack + per-step logs |
| T4 | ✅ Done | `admin-service` dashboard + dedup 409 |
| T5 | ✅ Done | Routes dashboard/reprocess wired to real service |
| T6 | ✅ Done | DTO + client mirror new shapes |
| T7 | ✅ Done | Admin UI queue + log sections (render smoke is task-claimed, see gate) |
| T8 | ✅ Done | ADR-010 (`08f3311`) |

All 8 tasks marked `✅ Done` in tasks.md with commit SHAs.

---

## Spec-Anchored Acceptance Criteria

**Spec**: `spec.md` line refs below.

| Criterion (WHEN X THEN Y) | Spec-defined outcome | `file:line` + assertion | Result |
| ------------------------- | -------------------- | ----------------------- | ------ |
| OBS-01 — WHEN gerente gera relatório com sucesso THEN `{ok:true,queued:true}` + linha `market_insights` `pendente`+`queued_at` (spec.md:54) | `{ok:true,queued:true}`; enqueue sets `pendente`+`queued_at` | `admin-service.test.ts:302` — `expect(...).resolves.toEqual({ ok: true, queued: true })`; RPC side: `0009_report_observability.sql:73-84` (upsert `'pendente'`,`queued_at`=now()) | ✅ PASS |
| OBS-02 — WHEN worker dá `read()` THEN status `processando` + `processing_started_at` + `attempts`+1 (spec.md:55) | `processando`, `processing_started_at=now()`, `attempts`+1 | RPC: `0009_report_observability.sql:119-127` — upsert sets `status='processando'`, `processing_started_at=now()`, `attempts = market_insights.attempts + 1` | ✅ PASS (SQL-level; behavior asserted via repo tests for RPC arg contract) |
| OBS-03 — WHEN pipeline conclui com sucesso THEN `analisado` + `completed_at` + ack (spec.md:56) | `analisado`, `completed_at=now()`, `pgmq.archive` | `analysis-service.test.ts:160-173` — `upsert` `status:"analisado"`; `queueRepo.ack` `("42","lead-1","analisado",undefined,...)`; RPC: `0009_report_observability.sql:146-154,167-169` | ✅ PASS |
| OBS-04 — WHEN pipeline falha THEN `falha` + `last_error` + ack (spec.md:57) | `falha`, error registered, ack archives | `analysis-service.test.ts:247-248` — `logEvent("lead-1","failed",expect.stringContaining("llm down"),...)`; `ack("42","lead-1","falha",expect.stringContaining("llm down"),...)`; RPC: `0009_report_observability.sql:155-162,167-169` (`error = coalesce(p_error,...)`) | ✅ PASS |
| OBS-05 — dashboard expõe por lead `analysisStatus`,`queuedAt`,`processingStartedAt`,`attempts`,`errorMessage`,`ageSeconds` (spec.md:58) | 6 fields exposed | `admin-service.test.ts:218-227` — `toMatchObject({analysisStatus:"processando", attempts:2, ageSeconds:expect.any(Number), processingStartedAt:null})`; `admin-service.ts:65-71` maps all 6 fields; `dto/admin.ts:1-15` | ✅ PASS |
| OBS-06 — dashboard expõe profundidade da fila pgmq (spec.md:59) | `queue_length` from `pgmq.metrics` | `admin-service.test.ts:157-164` — `queue` `toEqual({queueLength:2, oldestAgeSec:45, pendente:1, processando:1, analisado:3, falha:0})`; `analysis-queue-repo.test.ts:98-123` — `stats` `queueLength:3`; RPC: `0009_report_observability.sql:189-204` (`pgmq.metrics`) | ✅ PASS |
| OBS-07 — evento em `analysis_job_logs` por etapa (`enqueued`,`started`,`researcher`,`analyst`,`writer`,`pdf`,`email`,`completed`,`failed`) + timestamp + `duration_ms` (spec.md:73) | 9 steps logged, timestamp + duration | `analysis-service.test.ts:168-172` — `logEvent("lead-1","researcher",undefined,expect.any(Number))`, `"analyst"`, `"writer"`, `"pdf"`, `"email"`; `market-insights-repo.test.ts:177-194` — insert `{lead_id,step,message,duration_ms}`/`{lead_id,step}`; SQL check constraint + `duration_ms` column: `0009_report_observability.sql:31-37`; `completed`/`failed`/`enqueued`/`started` emitted in SQL RPCs: lines 86-87, 129-130, 153-154, 161-162 | ✅ PASS |
| OBS-08 — WHEN pipeline falha THEN evento `failed` com erro em `message` (spec.md:74) | `failed` event carries error message | `analysis-service.test.ts:247` — `logEvent("lead-1","failed",expect.stringContaining("llm down"),expect.any(Number))`; RPC: `0009_report_observability.sql:161-162` (`message` = `coalesce(p_error,...)`) | ✅ PASS |
| OBS-09 — dashboard retorna últimos 50 eventos com nome do lead (spec.md:75) | `limit(50)` + lead name join | `dashboard/route.ts:31-35` — `.limit(limit)` with `logLoader(50)` (route.ts:48); `admin-service.ts:48` — `logLoader(50)`; lead name join: `dashboard/route.ts:39-45` (`findNameAndEmail` → `names` map); DTO shape: `dto/admin.ts:34-41` (`leadName`) | ✅ PASS (50 is enforced via the 50 constant + limit; the route test file does not assert the literal 50 — see gap note) |
| OBS-10 — admin exibe eventos em ordem cronológica decrescente com etapa/lead/timestamp/erro (spec.md:76) | descending order; UI renders step/lead/time/error | `dashboard/route.ts:34` — `.order("created_at",{ascending:false})`; UI renders lead/step/timestamp/duration/error: `admin/page.tsx:534-553`, `admin/page.tsx:458` (table headers Cliente/Status/Na fila desde/Tempo na fila/Tentativas/Erro) | ✅ PASS |
| OBS-11 — WHEN já existe job `pendente`/`processando` THEN `{ok:true,queued:false}` sem re-enfileirar + UI "Relatório já está na fila/em processamento" (spec.md:90) | `{ok:true,queued:false}`; UI toast message | `admin-service.test.ts:285-288` — `rejects.toMatchObject({name:"AdminServiceError",status:409})` (dedup path); `analysis-queue-repo.test.ts:31` — `toEqual({ok:true,queued:false})`; RPC dedup: `0009_report_observability.sql:67-69`; UI message: `admin/page.tsx:131` — `pushToast("success","Relatório já está na fila ou em processamento")` | ✅ PASS |
| OBS-12 — WHEN job `analisado`/`falha`/inexistente THEN novo enqueue `queued:true` (spec.md:91) | requeue allowed → `queued:true` | `admin-service.test.ts:302` — regenerated `analisado` lead resolves `{ok:true,queued:true}`; RPC: `0009_report_observability.sql:67-69` only blocks `pendente`/`processando` | ✅ PASS |
| OBS-13 — `analise_pendente`/`concluido` elegíveis para reenfileirar (spec.md:92) | lead status set includes both | `admin-service.ts:24-29` — `ENQUEUEABLE_STATUSES = {concluido, analisado, falha, analise_pendente}`; `admin-service.test.ts:255-272` — `concluido` enqueues; `admin-service.test.ts:291-304` — `analisado`/`falha` regenerate | ✅ PASS |

**Status**: ✅ All ACs covered (13/13); 2 minor spec-precision notes below (no functional gap).

**Spec-precision notes**:
1. OBS-02 and the SQL RPCs (`analysis_queue_read`) have no unit test that asserts the *state-transition SQL* itself (status/attempts increment are asserted at the SQL level, not in a JS assertion). Behavior is covered via the repo RPC-argument contract tests + service-level `markStatus`/`upsert` mocks + migration review. This is a repository-layer testing gap for the RPC body, flagged for the next implementer.
2. OBS-09 asserts `limit(50)` via the `logLoader(50)` constant and the `.limit(limit)` wiring in the dashboard route, but no route test asserts the literal `50`; the route tests for dashboard were not extended in the diff. The `50` is enforced in code (route.ts:48).

---

## Discrimination Sensor

**Sensor depth**: lightweight (targeted highest-risk new code)

| Mutation | File:line | Description | Killed? |
| -------- | --------- | ----------- | ------- |
| 1 | `src/lib/service/analysis-service.ts:130` | Flipped ack status `"analisado"` → `"falha"` in happy path | ✅ Killed (2 tests failed: happy-path `ack(... "analisado" ...)` and email-isolation `ack(... "analisado" ...)` assertions) |
| 2 | `src/lib/service/admin-service.ts:113` | Dedup 409 condition `if (!enqueued.queued)` → `if (false)` (never throws; returns `{ok:true,queued:true}`) | ✅ Killed (1 test failed: "rejeita com 409 quando já existe job pendente/processando") |
| 3 | `src/lib/repository/analysis-queue-repo.ts:79` | `stats()` `queue_length` → forced `0` | ✅ Killed (1 test failed: `stats` `toEqual({queueLength:3, ...})`) |

**Sensor depth**: lightweight
**Result**: 3/3 killed — PASS ✅
**Isolation**: scratch worktree at `C:\Users\Rafael\AppData\Local\Temp\opencode\ro-sensor\scratch` (HEAD `08f3311`), `node_modules` installed, mutations applied via `edit`, targeted tests run, scratch removed, worktree registration pruned. Real-tree `git status --porcelain` before = after = ` M .specs/STATE.md` (identical; no real tree touched).

---

## Interactive UAT Results (if performed)

Not performed — backend/infrastructure feature (admin panel is internal to the commercial team; validation criteria are automated).

---

## Code Quality

| Principle | Status |
| --------- | ------ |
| Minimum code | ✅ |
| Surgical changes | ✅ |
| No scope creep | ✅ |
| Matches patterns | ✅ |
| Spec-anchored outcome check (asserted values match spec) | ✅ |
| Per-layer Coverage Expectation met (domain 1:1 ACs; routes happy+edge+error) | ⚠️ Dashboard route tests (dashboard/route.ts) were not added; dashboard behavior is asserted at the service/repo layer. Reprocess route covers 401/400/409/500 (happy+error). Worker route tests cover 401/200 (cron/internal key) with mocks. The route test files for dashboard and worker were not extended in the diff (they remain at pre-feature state). |
| Every test maps to a spec requirement - no unclaimed tests | ✅ |
| Documented guidelines followed: `AGENTS.md` §7/§12, `validate.md` (tlc-spec-driven), `docs/rules/*` | ✅ |

---

## Edge Cases

- [x] IF fila pgmq indisponível no enqueue THEN erro 5xx ao gerente (não sucesso falso): `admin-service.test.ts:347-358` — enqueue rejects propagate (`rejects.toThrow("queue down")`); `reprocess/route.ts:51-55` maps non-`AdminServiceError` to 500; `reprocess/route.test.ts:111-118` asserts 500 `{error:"Erro interno"}`; `analysis-service.test.ts:111-117` enqueue propagates.
- [x] IF worker cai no meio THEN mensagem volta após visibility timeout e reprocessa com novo `attempts`: `0009_report_observability.sql:109` `pgmq.read('analysis_jobs',600,1)` (VT 600s), `read` increments `attempts` (line 126), ack archives (line 168). ADR-010 documents the retry contract. No JS unit test targets the VT itself (SQL-level).
- [x] IF `market_insights` sem linha para lead na fila THEN cria linha no `read()` (upsert por `lead_id`): `0009_report_observability.sql:118-127` insert-on-conflict in `analysis_queue_read`; `market-insights-repo.ts:44-56` `upsert` uses `onConflict:"lead_id"`; `market-insights-repo.test.ts:64-74` asserts `{onConflict:"lead_id"}`.
- [x] IF pipeline falha mas payload existe THEN envia PDF básico (EMAIL-03) e registra `failed` antes: `analysis-service.test.ts:246-256` — `failed` logged (line 247), `generatePdf` called WITHOUT `insights`/`analysis` (line 252-254), `updateStatus("lead-1","analise_pendente")` (line 251), `sendEmail` once (line 255); `analysis-service.ts:149-168` order: log `failed` → ack → `analise_pendente` → `sendAnalysisEmail`.
- [x] IF não há jobs na fila THEN dashboard mostra profundidade 0 + estado vazio: `admin-service.test.ts:230-240` — rows `[]`, `kpis.leadsTotal 0`; `analysis-service.test.ts:121-131` — empty queue returns `{processed:false}`, no upsert/markStatus; `admin/page.tsx:450-453` empty-state text, `admin/page.tsx:527-530` empty log; `stats` defaults to 0 (`analysis-queue-repo.ts:78-84`).

---

## Gate Check

- **Gate command**: `npm run typecheck && npm run test -- --exclude src/lib/service/smoke-e2e-flow.test.ts && npm run build`
- **Result**: typecheck ✅, tests 312/312 passed, build ✅ — 0 failed
- **Test count before feature**: 34 test files / 303 passing (documented baseline in tasks.md) + 1 excluded smoke-e2e
- **Test count after feature**: 34 test files / 312 passing (excluded smoke-e2e)
- **Delta**: +9 tests
- **Skipped**: 1 (smoke-e2e-flow.test.ts — requires `.env.local` external credentials; pre-existing, excluded per tasks.md gate)
- **Failures**: none

---

## Fix Plans (if issues found)

None (no FAIL gaps; spec-precision notes only).

---

## Requirement Traceability Update

Spec.md requirement statuses updated (not committed — orchestrator will commit):

| Requirement | Previous Status | New Status |
| ----------- | --------------- | ---------- |
| OBS-01 | Pending | ✅ Verified |
| OBS-02 | Pending | ✅ Verified |
| OBS-03 | Pending | ✅ Verified |
| OBS-04 | Pending | ✅ Verified |
| OBS-05 | Pending | ✅ Verified |
| OBS-06 | Pending | ✅ Verified |
| OBS-07 | Pending | ✅ Verified |
| OBS-08 | Pending | ✅ Verified |
| OBS-09 | Pending | ✅ Verified |
| OBS-10 | Pending | ✅ Verified |
| OBS-11 | Pending | ✅ Verified |
| OBS-12 | Pending | ✅ Verified |
| OBS-13 | Pending | ✅ Verified |

---

## Summary

**Overall**: ✅ Ready

**Spec-anchored check**: 13/13 ACs matched spec outcome | 0 spec-precision gaps (2 minor precision notes, no functional gap)
**Sensor**: 3/3 mutations killed
**Gate**: typecheck + 312/312 tests + build — all passed

**What works**:
- read+ack/archive queue semantics with VT 600s (ADR-010) — no more silent job loss
- per-job state on `market_insights` with timestamps + attempts; per-step log on `analysis_job_logs` (9 steps with CHECK constraint)
- dedup `{ok,queued}` with HTTP 409 on reprocess; enqueue errors propagate (no false success)
- dashboard queue + log sections, 50-limit, lead-name join, descending order, auto-refresh 15s while active, dedup toast, `processando` badge pulse

**Issues found**: none blocking. 2 minor precision notes for the next implementer:
1. `analysis_queue_read` state-transition SQL (status/attempts) has no JS unit test — covered by migration review + repo arg-contract tests.
2. OBS-09's literal `50` limit is enforced in code (route.ts:48) but not asserted by a route test; dashboard route tests were not extended.

**Next steps**: orchestrator commits `.specs/features/report-observability/validation.md` + spec.md traceability (OBS-01..OBS-13 → Verified).
