# Relatório Sob Demanda — Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier, discrimination sensor).

**If the skill cannot be activated, STOP and tell the user - do not proceed without it.**

---

**Design**: `.specs/features/relatorio-sob-demanda/design.md`
**Status**: Done

---

## Test Coverage Matrix

> Generated from codebase, project guidelines, and spec - confirm before Execute. Guidelines found: `AGENTS.md` §7 (unit tests for services/scoring/contract/schemas; component tests `*.test.tsx`; mock Supabase/email — never hit real services; run `npm run test`), `AGENTS.md` §12 (Definition of Done). Baseline suite: 303 passing (34 files), 1 smoke-e2e failure (external credentials, pre-existing). Confirmed gate from prior feature (`report-observability/tasks.md`): `npm run typecheck && npm run test -- --exclude src/lib/service/smoke-e2e-flow.test.ts && npm run build`.

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| ---------- | ------------------ | -------------------- | ---------------- | ----------- |
| Route (reprocess) | unit | Happy + error paths: disparo fire-and-forget, 200 `{ok,queued}`, 401, 400, 409, 500 | `src/app/api/admin/analysis/reprocess/route.test.ts` | `npm run test` |

## Gate Check Commands

> Generated from codebase - confirm before Execute.

| Gate Level | When to Use | Command |
| ---------- | ----------- | ------- |
| Quick | After tasks with unit tests only | `npm run test -- --exclude src/lib/service/smoke-e2e-flow.test.ts` |
| Build | After phase completion or config/entity-only tasks | `npm run typecheck && npm run test -- --exclude src/lib/service/smoke-e2e-flow.test.ts && npm run build` |

Notes:
- `npm run lint` is NOT runnable: `next lint` prompts interactively to initialize ESLint — pre-existing condition (documented in prior feature validations). Use `typecheck` as the static gate.
- Full suite includes the smoke-e2e test that requires `.env.local` external credentials; it fails in this environment without them (pre-existing). Unit gate = `npm run test -- --exclude src/lib/service/smoke-e2e-flow.test.ts`.

---

## Execution Plan

Phases are ordered and run sequentially - each phase completes before the next begins, and tasks within a phase execute in order.

### Phase 1: Disparo imediato no reprocess

```
T1
```

---

## Task Breakdown

### T1: Disparo fire-and-forget do worker no endpoint de reprocess

**What**: No `POST /api/admin/analysis/reprocess`, após `adminService.generateReport()` enfileirar com sucesso, disparar em background (fetch não-await) `POST /api/analysis-worker` com `x-internal-api-key`, sem bloquear a resposta.
**Where**: `src/app/api/admin/analysis/reprocess/route.ts`
**Depends on**: None
**Reuses**: `analysis-worker/route.ts` (rota de destino), `process.env.INTERNAL_API_KEY`, `process.env.NEXT_PUBLIC_APP_URL`, padrão `proxyToInternal` para o header
**Requirement**: REL-01, REL-02, REL-04, REL-05, REL-06, REL-07

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Após `generateReport` retornar `{ok:true}`, o route dispara `fetch(<base>/api/analysis-worker, { method:"POST", headers:{ "x-internal-api-key": <key> } })` **sem `await`** (fire-and-forget) e retorna `200 { ok: true, queued: true }` imediatamente (REL-01, REL-02, REL-05)
- [ ] A base URL usa `process.env.NEXT_PUBLIC_APP_URL` (produção) com fallback para a origem da requisição (REL-04)
- [ ] Erros do disparo são engolidos (`.catch(() => {})`): se o fetch rejeitar ou `INTERNAL_API_KEY` ausente, o endpoint ainda responde `200 { ok: true, queued: true }` e o job permanece na fila (REL-06)
- [ ] Dedup e validações existentes preservados: 401 (sem internal key / sem gerente), 400 (leadId inválido / extras), 409 (já na fila), 500 (erro inesperado) (REL-07)
- [ ] Testes de rota atualizados/mantidos cobrindo: happy path dispara fetch com URL/headers corretos, disparo não bloqueia resposta, fetch falha engolida, `INTERNAL_API_KEY` ausente pula disparo, 401/400/409/500 preservados
- [ ] Gate quick passa: `npm run test -- --exclude src/lib/service/smoke-e2e-flow.test.ts`
- [ ] Test count: ≥ 9 no `reprocess/route.test.ts` (8 existentes + pelo menos 1 novo)

**Tests**: unit
**Gate**: quick

**Status**: ✅ Done

---

## Phase Execution Map

Visual representation of task ordering. Phases run in sequence, and tasks within a phase run in order:

```
Phase 1:  T1
```

Execution is strictly sequential - there is no intra-phase parallelism. A single agent works one task at a time, in order.

---

## Task Granularity Check

| Task | Scope | Status |
| --- | --- | --- |
| T1: Disparo fire-and-forget no reprocess | 1 route + testes co-locados | ✅ Granular |

## Diagram-Definition Cross-Check

| Task | Depends On (task body) | Diagram Shows | Status |
| --- | --- | --- | --- |
| T1 | None | — | ✅ Match |

## Test Co-location Validation

| Task | Code Layer Created/Modified | Matrix Requires | Task Says | Status |
| --- | --- | --- | --- | --- |
| T1 | Route | unit | unit | ✅ OK |
