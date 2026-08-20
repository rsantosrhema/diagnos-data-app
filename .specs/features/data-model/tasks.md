# Data Model Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier, discrimination sensor).

**If the skill cannot be activated, STOP and tell the user - do not proceed without it.**

---

**Design**: `.specs/features/data-model/design.md`
**Status**: In Progress

**Task status**: T1 ✅ | T2 ✅ | T3 ✅ | T4 ✅ | T5 ✅ | T6 ✅ | T7 ✅ | T8 ✅

---

## Test Coverage Matrix

> Generated from codebase, project guidelines, and spec - confirm before Execute. Guidelines found: `AGENTS.md` (harness purity, Zod validation, typed errors), `package.json` (vitest). This feature is **SQL schema + docs + SQL validation** — no TS code is touched, so the vitest suite is not the gate. The "tests" for this feature are the **SQL validation script** (`supabase/scripts/validate_data_model.sql`) run against the Supabase database, which asserts the spec's ACs (FKs, unique/check constraints, cascade).

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| ---------- | ------------------ | -------------------- | ---------------- | ----------- |
| DB schema (migrations) | integration (SQL) | Every AC in DM-01/DM-02 asserted: columns/types, FK, unique, check, RLS | `supabase/scripts/validate_data_model.sql` | supabase-mcp execute_sql |
| Seed data | integration (SQL) | Seed inserts a lead + token + session + draft + diagnostic; idempotent | `supabase/migrations/0004_seed_test_data.sql` | supabase-mcp execute_sql |
| Docs | none | - (build gate only) | `docs/data-model.md`, `docs/architecture.md` | - |

## Gate Check Commands

> Generated from codebase - confirm before Execute.

| Gate Level | When to Use | Command |
| ---------- | ----------- | ------- |
| Quick | After tasks with SQL validation only | Run `supabase/scripts/validate_data_model.sql` via supabase-mcp; expect PASS (no exception) |
| Full | After tasks with seed + validation | Run seed then validation script; expect PASS |
| Build | After phase completion or docs-only tasks | `npm run typecheck` + `npm run lint` (no TS changed, but confirms repo still green) |

---

## Execution Plan

Phases are ordered and run sequentially - each phase completes before the next begins, and tasks within a phase execute in order.

### Phase 1: Schema

```
T1 → T2
```

### Phase 2: Documentation

```
T3 → T4
```

### Phase 3: Test Data & Validation

```
T5 → T6 → T7 → T8
```

---

## Task Breakdown

### T1: Create `diagnostics` migration

**What**: Create the SQL migration file that adds the `diagnostics` table with columns, FK, unique, check, and RLS.
**Where**: `supabase/migrations/0003_diagnostics.sql`
**Depends on**: None
**Reuses**: Migration pattern from `0001`/`0002` (RLS, service-role)
**Requirement**: DM-01, DM-02

**Tools**:

- MCP: NONE (file authoring)
- Skill: NONE

**Done when**:

- [ ] File exists with `create table if not exists public.diagnostics` and all columns from DM-01
- [ ] `lead_id` FK to `leads(id)` with `on delete cascade`
- [ ] `unique (lead_id)`, `overall_level` check 0–5, `overall_score` check 0–5
- [ ] `alter table ... enable row level security` with no anon/authenticated policies

**Tests**: integration (SQL) - validated in T8
**Gate**: build

---

### T2: Apply `diagnostics` migration and verify schema

**What**: Apply the migration to the Supabase project via supabase-mcp and verify the resulting schema.
**Where**: Supabase project `utpamkyttlgffziegomp` (via `supabase-mcp_apply_migration`)
**Depends on**: T1
**Reuses**: supabase-mcp
**Requirement**: DM-01, DM-02

**Tools**:

- MCP: `supabase-mcp` (apply_migration, list_tables)
- Skill: NONE

**Done when**:

- [ ] Migration applied successfully (no error)
- [ ] `list_tables` shows `public.diagnostics` with expected columns, FK, unique, check
- [ ] RLS enabled on `diagnostics`

**Tests**: integration (SQL) - schema verified via list_tables
**Gate**: build

---

### T3: Create `docs/data-model.md` with Mermaid diagram

**What**: Create the living data model doc with a Mermaid ER diagram of all 5 tables, per-table reference, and a "how to keep updated" section.
**Where**: `docs/data-model.md`
**Depends on**: T2 (schema final)
**Reuses**: `docs/architecture.md` style, ADRs
**Requirement**: DM-03

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Mermaid `erDiagram` with `leads`, `access_tokens`, `sessions`, `session_drafts`, `diagnostics` and their relationships
- [ ] Per-table reference: columns, types, constraints (PK/FK/unique/check), RLS notes
- [ ] "Como manter atualizado" section explaining to update diagram+reference in the same commit as any schema change

**Tests**: none
**Gate**: build

---

### T4: Link `data-model.md` from `architecture.md`

**What**: Add a reference to `docs/data-model.md` in the Modelo de Dados section of `docs/architecture.md`.
**Where**: `docs/architecture.md` (modify)
**Depends on**: T3
**Reuses**: Existing doc structure
**Requirement**: DM-03

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] `architecture.md` Modelo de Dados section links to `docs/data-model.md`
- [ ] `diagnostics` mentioned in the architecture data model list

**Tests**: none
**Gate**: build

---

### T5: Create seed test data migration

**What**: Create an idempotent SQL migration that inserts identifiable test data: a lead + access_token + session + session_draft + diagnostic.
**Where**: `supabase/migrations/0004_seed_test_data.sql`
**Depends on**: T2 (diagnostics exists)
**Reuses**: Migration pattern
**Requirement**: DM-04

**Tools**:

- MCP: NONE (file authoring)
- Skill: NONE

**Done when**:

- [ ] Inserts a lead with email `teste@...` (identifiable)
- [ ] Inserts one `access_token`, one `session`, one `session_draft`, one `diagnostic` for that lead
- [ ] Idempotent (re-runnable without duplicate errors)

**Tests**: integration (SQL) - validated in T8
**Gate**: build

---

### T6: Apply seed migration

**What**: Apply the seed migration to the Supabase project via supabase-mcp.
**Where**: Supabase project `utpamkyttlgffziegomp` (via `supabase-mcp_apply_migration`)
**Depends on**: T5
**Reuses**: supabase-mcp
**Requirement**: DM-04

**Tools**:

- MCP: `supabase-mcp` (apply_migration, execute_sql)
- Skill: NONE

**Done when**:

- [ ] Seed applied successfully
- [ ] Test lead + related rows present (query confirms)

**Tests**: integration (SQL) - seed rows present
**Gate**: full

---

### T7: Create validation SQL script

**What**: Create a re-runnable SQL script that asserts all FKs, unique/check constraints, and cascade behavior, failing with an exception on any violation.
**Where**: `supabase/scripts/validate_data_model.sql`
**Depends on**: T6 (seed present)
**Reuses**: None
**Requirement**: DM-05

**Tools**:

- MCP: NONE (file authoring)
- Skill: NONE

**Done when**:

- [ ] Asserts each FK points to an existing lead (no orphans)
- [ ] Asserts unique constraints: `leads.email`, `access_tokens.token_hash`, `one_active_token`, `session_drafts.lead_id`, `diagnostics.lead_id`
- [ ] Asserts check constraints reject invalid values (status, overall_level, overall_score)
- [ ] Asserts cascade: deleting a lead removes child rows
- [ ] Uses `DO` block with `raise exception` on failure (non-zero exit)
- [ ] Re-runnable (idempotent)

**Tests**: integration (SQL) - this IS the test script
**Gate**: full

---

### T8: Run validation script and confirm PASS

**What**: Execute the validation script against the Supabase project and confirm all assertions pass.
**Where**: Supabase project `utpamkyttlgffziegomp` (via `supabase-mcp_execute_sql`)
**Depends on**: T7
**Reuses**: supabase-mcp
**Requirement**: DM-05

**Tools**:

- MCP: `supabase-mcp` (execute_sql)
- Skill: NONE

**Done when**:

- [ ] Validation script runs without exception (PASS)
- [ ] All FK, unique, check, and cascade assertions confirmed
- [ ] No orphaned rows; cascade verified

**Tests**: integration (SQL) - validation script passes
**Gate**: full

---

## Phase Execution Map

Visual representation of task ordering. Phases run in sequence, and tasks within a phase run in order:

```
Phase 1 → Phase 2 → Phase 3

T1 → T2 → T3 → T4
T2 → T5 → T6 → T7 → T8
```

Execution is strictly sequential - there is no intra-phase parallelism. A single agent (or batch worker) works one task at a time, in order. Phase 1 (T1→T2) completes before Phase 2 (T3→T4), which completes before Phase 3 (T5→T8).

---

## Task Granularity Check

| Task | Scope | Status |
| --- | --- | --- |
| T1: Create diagnostics migration | 1 file | ✅ Granular |
| T2: Apply migration + verify | 1 action | ✅ Granular |
| T3: Create data-model.md | 1 file | ✅ Granular |
| T4: Link from architecture.md | 1 file | ✅ Granular |
| T5: Create seed migration | 1 file | ✅ Granular |
| T6: Apply seed | 1 action | ✅ Granular |
| T7: Create validation script | 1 file | ✅ Granular |
| T8: Run validation | 1 action | ✅ Granular |

**Granularity check**:

- ✅ 1 component / 1 function / 1 endpoint = Good
- ⚠️ 2-3 related things in same file = OK if cohesive
- ❌ Multiple components or files = MUST split

---

## Diagram-Definition Cross-Check

| Task | Depends On (task body) | Diagram Shows | Status |
| --- | --- | --- | --- |
| T1 | None | - | ✅ Match |
| T2 | T1 | T1 → T2 | ✅ Match |
| T3 | T2 | T2 → T3 | ✅ Match |
| T4 | T3 | T3 → T4 | ✅ Match |
| T5 | T2 | T2 → T5 | ✅ Match |
| T6 | T5 | T5 → T6 | ✅ Match |
| T7 | T6 | T6 → T7 | ✅ Match |
| T8 | T7 | T7 → T8 | ✅ Match |

**Rules:**

- Every `Depends on` in a task body must have a corresponding arrow in the diagram.
- Every arrow in the diagram must correspond to a `Depends on` in the target task's body.
- A task must never depend on a task in a later phase - dependencies point backward or within the same phase only.

---

## Test Co-location Validation

| Task | Code Layer Created/Modified | Matrix Requires | Task Says | Status |
| --- | --- | --- | --- | --- |
| T1: Create diagnostics migration | DB schema | integration (SQL) | integration (SQL) - validated in T8 | ✅ OK |
| T2: Apply migration + verify | DB schema | integration (SQL) | integration (SQL) | ✅ OK |
| T3: Create data-model.md | Docs | none | none | ✅ OK |
| T4: Link from architecture.md | Docs | none | none | ✅ OK |
| T5: Create seed migration | Seed data | integration (SQL) | integration (SQL) - validated in T8 | ✅ OK |
| T6: Apply seed | Seed data | integration (SQL) | integration (SQL) | ✅ OK |
| T7: Create validation script | DB schema (test) | integration (SQL) | integration (SQL) | ✅ OK |
| T8: Run validation | DB schema (test) | integration (SQL) | integration (SQL) | ✅ OK |

**Rules:**

- "Tested in another task" is NOT a valid justification for `Tests: none`. That is test deferral - the exact anti-pattern this validation prevents.
- `Tests: none` is only valid when the coverage matrix says "none" for that code layer.
- If a task creates MULTIPLE code layers (e.g., service + controller), use the HIGHEST test type required by any of them.
- Any ❌ VIOLATION → restructure the task to include its required tests before proceeding.

> **Nota de co-locação:** T1 e T5 criam SQL que só pode ser executado/validado contra o banco (T2/T6/T8). Isso não é deferral de teste — o "teste" é o script de validação (T7) que roda contra o schema aplicado. A validação real acontece em T8, que é o gate determinístico da feature. As migrations são DDL/DML idempotentes; o script de validação é o artefato de teste.
