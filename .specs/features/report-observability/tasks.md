# Observabilidade do Pipeline de Relatórios — Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier, discrimination sensor).

**If the skill cannot be activated, STOP and tell the user - do not proceed without it.**

---

**Design**: `.specs/features/report-observability/design.md`
**Status**: Draft

---

## Test Coverage Matrix

> Generated from codebase, project guidelines, and spec - confirm before Execute. Guidelines found: `AGENTS.md` §7 (unit tests for services/scoring/contract/schemas; component tests `*.test.tsx`; mock Supabase/email — never hit real services; run `npm run test`), `AGENTS.md` §12 (Definition of Done). Baseline suite: 303 passing (34 files), 1 smoke-e2e failure (external credentials, pre-existing).

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| ---------- | ------------------ | -------------------- | ---------------- | ----------- |
| Repository (queue/insights/log) | unit | Key query paths + error paths; new RPC argument contracts | `src/lib/repository/*.test.ts` | `npm run test` |
| Service (analysis/admin) | unit | All branches; 1:1 to spec ACs; every listed edge case has a test | `src/lib/service/*.test.ts` | `npm run test` |
| Route (worker/admin reprocess/dashboard) | unit | Happy + error paths (401/409/500); body shape | `src/app/api/**/*.test.ts` | `npm run test` |
| Admin UI (`page.tsx`) | component (existing `page.test.tsx`) | Existing coverage pattern; render smoke for new sections where feasible | `src/app/admin/*.test.tsx` | `npm run test` |
| Migration / schema | none | Build gate only + `validate_data_model.sql` manual run | `supabase/migrations/*.sql` | build gate |

## Gate Check Commands

> Generated from codebase - confirm before Execute.

| Gate Level | When to Use | Command |
| ---------- | ----------- | ------- |
| Quick | After tasks with unit tests only | `npm run test` |
| Build | After phase completion or config/entity-only tasks | `npm run typecheck && npm run test && npm run build` |

Notes:
- `npm run lint` is NOT runnable: `next lint` prompts interactively to initialize ESLint — pre-existing condition (documented in prior feature validations). Use `typecheck` as the static gate.
- Full suite includes the smoke-e2e test that requires `.env.local` external credentials; it fails in this environment without them (pre-existing). Unit gate = `npm run test` with smoke test excluded via vitest CLI (`--exclude` or `--reporter`). Confirmed with user: gate for this feature = `npm run typecheck && npm run test -- --exclude src/lib/service/smoke-e2e-flow.test.ts && npm run build`.

---

## Execution Plan

Phases are ordered and run sequentially - each phase completes before the next begins, and tasks within a phase execute in order.

### Phase 1: Foundation — schema e repositórios

```
T1 → T2 → T3
```

### Phase 2: Serviços e rotas

```
T4 → T5
```

### Phase 3: Admin UI

```
T6 → T7
```

### Phase 4: Documentação

```
T8
```

---

## Task Breakdown

### T1: Migração 0009 — colunas, `analysis_job_logs` e RPCs da fila (read+ack)

**What**: Nova migration `0009_report_observability.sql`: colunas de timestamps/`attempts` em `market_insights`; tabela `analysis_job_logs`; RPCs `analysis_queue_enqueue/read/ack/requeue/stats` (read+ack/archive, VT 600s); `docs/data-model.md` atualizado.
**Where**: `supabase/migrations/0009_report_observability.sql` (novo) + `docs/data-model.md`
**Depends on**: None
**Reuses**: padrão RPC `security definer` da migration 0007; RLS sem policies
**Requirement**: OBS-01, OBS-02, OBS-03, OBS-04, OBS-07, OBS-08

**Tools**:

- MCP: `supabase-mcp` (apply_migration)
- Skill: NONE

**Done when**:

- [ ] Migration contém as 4 colunas novas de `market_insights` + `analysis_job_logs` com FK `on delete cascade` + RLS
- [ ] RPC `analysis_queue_enqueue` cria linha `pendente`+`queued_at`+log `enqueued` e retorna `{ok,queued}` (dedup `pendente/processando` → `queued:false`)
- [ ] RPC `analysis_queue_read` usa `pgmq.read(vt:=600)` e marca `processando`+`processing_started_at`+`attempts+1`+log `started`
- [ ] RPC `analysis_queue_ack` arquiva + finaliza status (`analisado`+`completed_at` / `falha`+`last_error`) + log `completed`/`failed`
- [ ] RPC `analysis_queue_stats` retorna contagens + profundidade da fila
- [ ] `docs/data-model.md` reflete o novo schema (mesmo commit)
- [ ] Gate build passa: `npm run typecheck`

**Tests**: none (schema — build gate)
**Gate**: build

---

### T2: Repositórios — queue (enqueue/read/ack/stats), insights (upsert markStatus/logEvent)

**What**: Reescrita de `analysis-queue-repo.ts` (`enqueue`→`{ok,queued}`, `pop`→`read`, novos `ack`/`requeue`/`stats`) e `market-insights-repo.ts` (`markStatus` com upsert `onConflict:lead_id`, campos novos, `logEvent`).
**Where**: `src/lib/repository/analysis-queue-repo.ts` + `src/lib/repository/market-insights-repo.ts`
**Depends on**: T1
**Reuses**: padrão `createXRepository(supabase)` existente
**Requirement**: OBS-01, OBS-02, OBS-03, OBS-04, OBS-05, OBS-07, OBS-08, OBS-11

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] `enqueue` retorna `{ok:boolean, queued:boolean}` e chama RPC `analysis_queue_enqueue`
- [ ] `read()` chama `analysis_queue_read` e retorna `{msgId, leadId} | null`
- [ ] `ack(msgId, leadId, status, error?, durationMs?)` chama RPC `analysis_queue_ack`
- [ ] `stats()` chama `analysis_queue_stats`
- [ ] `markStatus` usa `.upsert({onConflict:"lead_id"})` (cria linha se ausente)
- [ ] `logEvent(leadId, step, message?, durationMs?)` insere em `analysis_job_logs`
- [ ] `MarketInsightsRow`/`findByLeadId` incluem `queued_at, processing_started_at, completed_at, attempts`
- [ ] Gate quick passa: `npm run test -- --exclude src/lib/service/smoke-e2e-flow.test.ts`
- [ ] Test count: ≥ 24 (repo unit tests)

**Tests**: unit
**Gate**: quick

---

### T3: Serviço analysis — enqueue sem engolir erro + processNext read→pipeline→ack com log por etapa

**What**: `analysis-service.ts` atualizado: `enqueue` retorna `{ok,queued}` e propaga erro; `processNext` usa `read()`→marca processo→pipeline (researcher/analyst/writer com log por etapa + duration)→`ack`; email isolado com log `email`; fallback EMAIL-03 mantido com log `failed`.
**Where**: `src/lib/service/analysis-service.ts`
**Depends on**: T2
**Reuses**: `AgentOutput`/`AgentPayload` types; `escapeHtml`
**Requirement**: OBS-01, OBS-02, OBS-03, OBS-04, OBS-07, OBS-08

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] `enqueue` retorna `{ok,queued}`; erro de RPC propaga (sem catch)
- [ ] `processNext` ordena: `read()` → payload → pipeline → `ack("analisado")`; loga `started`/`researcher`/`analyst`/`writer`/`pdf`/`email`/`completed` com `duration_ms`
- [ ] Payload ausente → `ack("falha", "agent_payload não encontrado")` sem pipeline
- [ ] Falha → `ack("falha", message)` + log `failed`; fallback PDF básico + `analise_pendente` mantido
- [ ] Email falha isolada (EMAIL-04) mantida; log `email` não derruba worker
- [ ] Gate quick passa: `npm run test -- --exclude src/lib/service/smoke-e2e-flow.test.ts`
- [ ] Test count: ≥ 16 (analysis-service)

**Tests**: unit
**Gate**: quick

---

### T4: Serviço admin — dashboard com fila+log, generateReport com dedup 409

**What**: `admin-service.ts`: `getDashboard` inclui `queue` (stats) + `logs` (últimos 50 com nome do lead) + campos por linha (`queuedAt, processingStartedAt, attempts, errorMessage, ageSeconds`) + KPI `relatoriosEmProcessamento`; `generateReport` trata `{ok,queued}` e lança `AdminServiceError(409)` quando `queued=false`.
**Where**: `src/lib/service/admin-service.ts`
**Depends on**: T3
**Reuses**: `ENQUEUEABLE_STATUSES`; `AdminDashboardResponseDTO` (extendido)
**Requirement**: OBS-05, OBS-06, OBS-09, OBS-11, OBS-12, OBS-13

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] `getDashboard` retorna `{kpis, rows, queue, logs}` com os campos novos por linha
- [ ] KPI `relatoriosEmProcessamento` conta `processando`
- [ ] `logs` = 50 últimos eventos com `leadName` (join)
- [ ] `generateReport` retorna `{ok, queued}`; `queued=false` → `AdminServiceError` status 409
- [ ] Gate quick passa: `npm run test -- --exclude src/lib/service/smoke-e2e-flow.test.ts`
- [ ] Test count: ≥ 14 (admin-service)

**Tests**: unit
**Gate**: quick

---

### T5: Rotas admin dashboard + reprocess + worker — wiring real e mapeamento de erros

**What**: `dashboard/route.ts` e `reprocess/route.ts` usam `analysisService` real (enqueue/read) no lugar do stub; `reprocess` mapeia 409; `analysis-worker/route.ts` injeta log de etapas (sem mudança estrutural no loop).
**Where**: `src/app/api/admin/dashboard/route.ts` + `src/app/api/admin/analysis/reprocess/route.ts` + `src/app/api/analysis-worker/route.ts`
**Depends on**: T4
**Reuses**: `createAnalysisService`, `verifyInternalApiKey`, `requireManager`
**Requirement**: OBS-01, OBS-06, OBS-09, OBS-11

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] `dashboard` retorna DTO com `queue`/`logs`; usa `analysisService` real
- [ ] `reprocess` retorna `{ok, queued}`; `AdminServiceError` 409 → HTTP 409; outros → 500
- [ ] `analysis-worker` mantém auth (internal key/cron) e loop; sem regressão
- [ ] Gate quick passa: `npm run test -- --exclude src/lib/service/smoke-e2e-flow.test.ts`
- [ ] Test count: ≥ 4 no route worker + ≥ 2 reprocess

**Tests**: unit
**Gate**: quick

---

### T6: DTO + client — espelhar novos shapes

**What**: `dto/admin.ts` e `src/lib/api/client.ts` espelham os novos campos/DTOS (`AdminLeadRow` estendido, `AdminKpis.relatoriosEmProcessamento`, `AdminLogEntry`, `AdminQueueStats`, `AdminDashboardResponse{rows,queue,logs}`; `generateReport` retorna `{ok,queued}`).
**Where**: `src/lib/dto/admin.ts` + `src/lib/api/client.ts`
**Depends on**: T4
**Reuses**: padrão de DTO existente
**Requirement**: OBS-05, OBS-09, OBS-10, OBS-11

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] DTOs e client espelham os novos shapes sem `any`
- [ ] `generateReport` no client retorna `{ok, queued}`
- [ ] Gate quick passa: `npm run typecheck`
- [ ] Test count: n/a (type-level) — typecheck

**Tests**: none
**Gate**: build

---

### T7: Admin UI — seções Fila + Log, auto-refresh, dedup toast, badge processando

**What**: `src/app/admin/page.tsx`: seção "Fila de relatórios" (cards resumo + tabela de jobs com status/tempos/tentativas/erro), seção "Log de processamentos" (timeline com etapa/lead/timestamp/duração), auto-refresh 15s enquanto houver pendente/processando, badge pulse em processando, tooltip de erro em falha, toast de dedup (`queued=false`).
**Where**: `src/app/admin/page.tsx`
**Depends on**: T6
**Reuses**: `KpiCard`, `AnalysisBadge`, `Reveal`, estilos Tailwind existentes
**Requirement**: OBS-05, OBS-06, OBS-10, OBS-11

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Seção "Fila de relatórios" renderiza cards (Em fila, Em processamento, Concluídos, Falhas, Profundidade) + tabela de jobs
- [ ] Seção "Log de processamentos" renderiza eventos (etapa/lead/timestamp/duração/erro)
- [ ] Auto-refresh 15s ativo apenas enquanto há pendente/processando
- [ ] Toast de dedup exibido quando `queued=false`
- [ ] Badge "processando" com animação; erro de falha visível
- [ ] Gate build passa: `npm run typecheck && npm run build`
- [ ] Test count: ≥ 1 (render smoke, padrão `page.test.tsx` existente)

**Tests**: unit
**Gate**: build

---

### T8: ADR-010 — Observabilidade do pipeline de relatórios (create-adr)

**What**: Novo ADR-010 `docs/decisions/010-observabilidade-pipeline-relatorios.md` (formato MADR, PT-BR) documentando a decisão desta feature: fila pgmq com read()+ack/archive (VT 600s), estado por job em `market_insights` com timestamps, log por etapa em `analysis_job_logs`, dedup no enqueue e seções "Fila de relatórios"/"Log de processamentos" no admin. Status Accepted.
**Where**: `docs/decisions/010-observabilidade-pipeline-relatorios.md` (novo)
**Depends on**: None
**Reuses**: formatação dos ADRs existentes (001–009); skill `/create-adr` (MADR, PT-BR)
**Requirement**: OBS-01, OBS-02, OBS-03, OBS-04, OBS-05, OBS-06, OBS-07, OBS-08, OBS-09, OBS-10, OBS-11, OBS-12, OBS-13

**Tools**:

- MCP: NONE
- Skill: `create-adr`

**Done when**:

- [ ] ADR-010 existe em `docs/decisions/010-observabilidade-pipeline-relatorios.md` em PT-BR (formato MADR)
- [ ] Contém Contexto, Decision Drivers, Opções Consideradas, Decisão, Consequências Positivas e Negativas, Links para ADR-009/001
- [ ] Cita as RPCs/tabelas novas (`analysis_job_logs`, `read/ack/archive`, `market_insights` timestamps) e o motivo (pop() perdia jobs)
- [ ] `validate_spec.py` ainda passa (nenhuma regressão nos gates do feature)
- [ ] Gate build passa: `npm run typecheck`

**Tests**: none (docs — build gate)
**Gate**: build

---

## Phase Execution Map

Visual representation of task ordering. Phases run in sequence, and tasks within a phase run in order:

```
Phase 1 → Phase 2 → Phase 3 → Phase 4

Phase 1:  T1 → T2 → T3
Phase 2:  T4 → T5
Phase 3:  T6 → T7
Phase 4:  T8

Cross-phase dependencies:  T3 → T4,  T4 → T6
```

Execution is strictly sequential - there is no intra-phase parallelism. A single agent (or batch worker) works one task at a time, in order.

---

## Task Granularity Check

| Task | Scope | Status |
| --- | --- | --- |
| T1: Migration 0009 (schema + RPCs) | 1 migration + docs | ✅ Granular |
| T2: Repositórios queue+insights | 2 arquivos coesos | ✅ Granular |
| T3: analysis-service | 1 service | ✅ Granular |
| T4: admin-service | 1 service | ✅ Granular |
| T5: rotas admin + worker | 3 rotas finas | ⚠️ 3 rotas — coeso (wiring relacionado) |
| T6: DTO + client | 2 arquivos type-level | ✅ Granular |
| T7: Admin UI | 1 página | ✅ Granular |
| T8: ADR-010 (create-adr) | 1 documento | ✅ Granular |

## Diagram-Definition Cross-Check

| Task | Depends On (task body) | Diagram Shows | Status |
| --- | --- | --- | --- |
| T1 | None | — | ✅ Match |
| T2 | T1 | T1 → T2 | ✅ Match |
| T3 | T2 | T2 → T3 | ✅ Match |
| T4 | T3 | T3 → T4 | ✅ Match |
| T5 | T4 | T4 → T5 | ✅ Match |
| T6 | T4 | T4 → T6 | ✅ Match |
| T7 | T6 | T6 → T7 | ✅ Match |
| T8 | None | — | ✅ Match |

> Note: T5 and T6 both depend on T4; the linear diagram `T4 → T5` then `T6 → T7` reflects phase order (T5 runs before T6), while `Depends on` for T6 points at T4. Diagram parity for cross-phase backward deps is out of scope per validate_tasks.py.

## Test Co-location Validation

| Task | Code Layer Created/Modified | Matrix Requires | Task Says | Status |
| --- | --- | --- | --- | --- |
| T1 | Migration/schema | none | none | ✅ OK |
| T2 | Repository | unit | unit | ✅ OK |
| T3 | Service | unit | unit | ✅ OK |
| T4 | Service | unit | unit | ✅ OK |
| T5 | Route | unit | unit | ✅ OK |
| T6 | DTO/config | none | none | ✅ OK |
| T7 | UI component | unit (existing pattern) | unit | ✅ OK |
| T8 | Documentation | none | none | ✅ OK |
