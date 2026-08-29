# Market Insights Agents — Slice 1 Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier, discrimination sensor).

**If the skill cannot be activated, STOP and tell the user - do not proceed without it.**

---

**Design**: `.specs/features/market-insights-agents/design.md`
**Status**: Draft

---

## Test Coverage Matrix

> Generated from codebase, project guidelines, and spec - confirm before Execute. Guidelines found: `AGENTS.md` (Zod boundaries, layered backend, testing rules), `docs/rules/validation.md`, `docs/rules/architecture.md`, `vitest.config.ts` (`environment: node`, `include: src/**/*.test.ts(x)`), existing unit tests for services/repos.

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| --- | --- | --- | --- | --- |
| Agents (researcher, analyst, writer, orchestrator) | unit | All branches; 1:1 to spec ACs (INS-05..INS-15); every listed edge case | `src/lib/agents/*.test.ts` | `npm run test` |
| Service (`analysis-service`) | unit | All branches; 1:1 to ACs (INS-01..INS-04, INS-16..INS-19); edge cases | `src/lib/service/analysis-service.test.ts` | `npm run test` |
| Repository (`market-insights-repo`, `analysis-queue-repo`) | unit | Key query paths + error handling (mock supabase); infer from existing repo tests | `src/lib/repository/*.test.ts` | `npm run test` |
| Route (`/api/analysis-worker`) | unit (handler-level) | Auth check + processNext wiring (mock service) | `src/app/api/analysis-worker/route.test.ts` | `npm run test` |
| Screen-service integration (enqueue hook) | unit | AC INS-01/INS-02/INS-03 (existing `screen-service.test.ts` extended) | `src/lib/service/screen-service.test.ts` | `npm run test` |
| Env schema (`src/lib/env.ts`) | none | build gate only | - | `npm run build` |
| Migration (`0007`) | none | build gate only (manual apply) | `supabase/migrations/0007_market_insights.sql` | - |

## Gate Check Commands

> Generated from codebase - confirm before Execute.

| Gate Level | When to Use | Command |
| --- | --- | --- |
| Quick | After tasks with unit tests only | `npm run test` |
| Build | After phase completion or config/entity-only tasks | `npm run typecheck` + `npm run lint` + `npm run test` + `npm run build` |

---

## Execution Plan

Phases are ordered and run sequentially; each phase completes before the next begins. Dependencies between tasks are explicit in each task's `Depends on` field (see Phase Execution Map below).

- **Phase 1 — Foundation**: T1 (types/schemas), T2 (env), T3 (llm factory, depends T2), T4 (segment skills).
- **Phase 2 — Agents**: T5 (researcher, depends T1), T6 (analyst, depends T3+T4), T7 (writer, depends T3), T8 (orchestrator, depends T5+T6+T7).
- **Phase 3 — Persistence**: T9 (migration), T10 (repos, depends T9).
- **Phase 4 — Integration**: T11 (service, depends T8+T10), T12 (worker route + screen-service hook, depends T11).

### Phase 1: Foundation

Types + schemas + LLM factory + segment skills + env.

### Phase 2: Agents

Researcher, analyst, writer, orchestrator.

### Phase 3: Persistence

Migration + repos.

### Phase 4: Integration

Service + route + screen-service hook.

---

## Task Breakdown

### T1: [Create agent domain types + Zod schemas]

**What**: Tipos de domínio dos agentes (`MarketResearch`, `MarketAnalysis`, `InsightsBrief`, etc.) e schemas Zod estritos.
**Where**: `src/lib/agents/types.ts`
**Depends on**: None
**Reuses**: `src/lib/schemas/*.ts` patterns (`z.object({...}).strict()`, `z.infer`)

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [x] Schemas definidos com `.strict()` e tipos inferidos com `z.infer`
- [x] Tipos `AgentPayload` importados de `agent-payload.ts`
- [x] Exporta `marketResearchSchema`, `marketAnalysisSchema`, `insightsBriefSchema`
- [x] Nenhum erro de TypeScript

**Tests**: unit ✅ (27 testes em `src/lib/agents/types.test.ts`)
**Gate**: quick ✅ (`npm run test` 239 passed)
**Commit**: `feat(agents): add domain types and zod schemas for market insights` ✅ (8c2d352)

---

### T2: [Add env schema for LLM and Exa providers]

**What**: `src/lib/env.ts` validando `LLM_BASE_URL`, `LLM_API_KEY`, `LLM_MODEL`, `EXA_API_KEY` (e vars existentes) com Zod `.strict()`.
**Where**: `src/lib/env.ts` (novo) — se não existir, criar; se existir, estender.
**Depends on**: None
**Reuses**: padrão de validação de env de `docs/rules/validation.md` §1

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [x] `EnvSchema` com Zod `.strict()` cobre LLM/Exa vars (e mantém vars existentes que já estavam em uso)
- [x] Exporta `getEnv()` que lança erro claro se var obrigatória ausente
- [x] `.env.example` atualizado com `LLM_*` e `EXA_API_KEY`
- [x] `npm run typecheck` passa

**Tests**: none ✅ (build gate)
**Gate**: build ✅ (`npm run typecheck` passou)
**Commit**: `build(env): add zod schema for LLM and Exa provider env vars`

---

### T3: [Create LLM model factory via @ai-sdk/openai-compatible]

**What**: `src/lib/agents/llm.ts` exportando `getLlmModel()` que cria `LanguageModel` com `createOpenAICompatible` apontando para `LLM_BASE_URL`/`LLM_API_KEY`/`LLM_MODEL`.
**Where**: `src/lib/agents/llm.ts` (novo) + `package.json` (adicionar `ai`, `@ai-sdk/openai-compatible`)
**Depends on**: T2
**Reuses**: `src/lib/env.ts` (getEnv)

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [x] `getLlmModel()` retorna modelo apontando para `baseURL`/`apiKey` de env
- [x] Instala `ai` e `@ai-sdk/openai-compatible` como dependências
- [x] `npm run typecheck` passa

**Tests**: none ✅ (build gate)
**Gate**: build ✅ (`npm run typecheck` passou)
**Commit**: `build(agents): add llm factory via @ai-sdk/openai-compatible`

---

### T4: [Create segment skill loader]

**What**: `src/lib/agents/segment-skills.ts` carregando skill Markdown por segmento com fallback genérico.
**Where**: `src/lib/agents/segment-skills.ts` + `docs/agents/skills/segmentos/*.md`
**Depends on**: None
**Reuses**: n/a

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [x] `SEGMENT_SKILL_MAP` cobre `Indústria`, `Varejo`, `Serviços`, `Saúde`, `Finanças/Fintech`
- [x] `loadSegmentSkill(segmento)` retorna conteúdo do arquivo ou fallback genérico
- [x] 5 arquivos de skill Markdown criados com conteúdo curado por segmento
- [x] Unit tests para fallback e mapeamento

**Tests**: unit ✅ (9 testes em `src/lib/agents/segment-skills.test.ts`)
**Gate**: quick ✅ (`npm run test` 248 passed)
**Commit**: `feat(agents): add segment skill loader with fallback`

---

### T5: [Create researcher agent (Exa)]

**What**: `src/lib/agents/researcher.ts` com `createResearcherAgent({ exa })` executando 4 queries em paralelo e consolidando `MarketResearch`.
**Where**: `src/lib/agents/researcher.ts` (novo) + `package.json` (adicionar `exa-js`)
**Depends on**: T1
**Reuses**: `types.ts`

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [x] Monta 4 queries (segmento, faturamento, porte, concorrentes) a partir do `AgentPayload`
- [x] `Promise.allSettled`; query que falha vira `status:"erro"`, não aborta
- [x] Concatena `sources` das URLs únicas
- [x] Unit tests com mock do Exa: feliz + falha isolada + sem nome de empresa (sem seção concorrentes)

**Tests**: unit ✅ (6 testes em `src/lib/agents/researcher.test.ts`)
**Gate**: quick ✅ (`npm run test` 254 passed)
**Commit**: `feat(agents): add exa researcher agent`

---

### T6: [Create analyst agent (LLM)]

**What**: `src/lib/agents/analyst.ts` com `createAnalystAgent({ llm, skillLoader })` gerando `MarketAnalysis` via `generateObject`.
**Where**: `src/lib/agents/analyst.ts` (novo)
**Depends on**: T3, T4
**Reuses**: `types.ts` (`marketAnalysisSchema`), `segment-skills.ts`

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [x] Prompt contém scores + pesquisa + skill de segmento
- [x] `generateObject` com `marketAnalysisSchema`; parse falha → `AnalystError`
- [x] Unit tests: prompt montado (scores + skill), JSON inválido → `AnalystError`

**Tests**: unit ✅ (5 testes em `src/lib/agents/analyst.test.ts`)
**Gate**: quick ✅ (`npm run test` 259 passed)
**Commit**: `feat(agents): add analyst agent with segment skill`

---

### T7: [Create writer agent (LLM)]

**What**: `src/lib/agents/writer.ts` com `createWriterAgent({ llm })` gerando `InsightsBrief` (até 10 bullets com prioridade) via `generateObject`.
**Where**: `src/lib/agents/writer.ts` (novo)
**Depends on**: T3
**Reuses**: `types.ts` (`insightsBriefSchema`)

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [x] Prompt pede até 10 bullets em PT-BR com prioridade `alta|media|baixa`
- [x] Trunca resultado para 10 bullets mantendo ordem
- [x] Parse falha → `WriterError`
- [x] Unit tests: até 10 bullets, prioridade presente, truncamento

**Tests**: unit ✅ (5 testes em `src/lib/agents/writer.test.ts`)
**Gate**: quick ✅ (`npm run test` 264 passed)
**Commit**: `feat(agents): add writer agent for insights brief`

---

### T8: [Create agent orchestrator]

**What**: `src/lib/agents/orchestrator.ts` com `createAgentOrchestrator({ researcher, analyst, writer })` executando em sequência e retornando `AgentOutput`.
**Where**: `src/lib/agents/orchestrator.ts` (novo)
**Depends on**: T5, T6, T7
**Reuses**: `types.ts`

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [x] Ordena researcher → analyst → writer; passa saída de um como entrada do próximo
- [x] Propaga erro de qualquer etapa
- [x] Unit tests com mocks dos 3 agentes

**Tests**: unit ✅ (4 testes em `src/lib/agents/orchestrator.test.ts`)
**Gate**: quick ✅ (`npm run test` 268 passed)
**Commit**: `feat(agents): add agent orchestrator`

---

### T9: [Create market_insights migration + queue wrappers]

**What**: Migration `supabase/migrations/0007_market_insights.sql` criando `market_insights`, `pgmq` + `analysis_jobs`, e funções `analysis_queue_enqueue`/`analysis_queue_pop`.
**Where**: `supabase/migrations/0007_market_insights.sql`
**Depends on**: None
**Reuses**: padrão das migrations 0003/0005 (RLS, indexes)

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [ ] Tabela `market_insights` com colunas conforme design (status check, unique lead_id)
- [ ] `create extension pgmq` + `select pgmq.create('analysis_jobs')`
- [ ] Wrappers `analysis_queue_enqueue(uuid)` / `analysis_queue_pop()` (security definer)
- [ ] `alter table ... enable row level security`
- [ ] `docs/data-model.md` atualizado no mesmo commit

**Tests**: none
**Gate**: build
**Commit**: `feat(db): add market_insights table and analysis queue wrappers`

---

### T10: [Create market-insights and queue repositories]

**What**: `src/lib/repository/market-insights-repo.ts` e `src/lib/repository/analysis-queue-repo.ts`.
**Where**: `src/lib/repository/market-insights-repo.ts`, `src/lib/repository/analysis-queue-repo.ts`
**Depends on**: T9
**Reuses**: padrão dos repos existentes (supabase client, seleção explícita)

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [ ] `market-insights-repo`: `upsert`, `findByLeadId`, `markStatus`
- [ ] `analysis-queue-repo`: `enqueue(leadId)`, `pop()`
- [ ] Unit tests com supabase mock: upsert/status, pop null e pop com job, enqueue

**Tests**: unit
**Gate**: quick
**Commit**: `feat(repo): add market insights and analysis queue repositories`

---

### T11: [Create analysis service (enqueue + processNext)]

**What**: `src/lib/service/analysis-service.ts` com `createAnalysisService({ queueRepo, insightsRepo, orchestrator, payloadLoader })`: `enqueue(leadId)` (não lança) e `processNext()` (orquestra e faz upsert com status).
**Where**: `src/lib/service/analysis-service.ts` (novo)
**Depends on**: T8, T10
**Reuses**: `ScreenServiceError` pattern, `AgentPayload` type

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [ ] `enqueue` captura erro e não lança (AC INS-03)
- [ ] `processNext` popula payload, roda orchestrator, upsert `analisado`; falha → upsert `falha` com erro
- [ ] `processNext` com fila vazia retorna `{ processed: false }`
- [ ] Unit tests: enqueue não lança, processNext feliz/falha/fila vazia

**Tests**: unit
**Gate**: quick
**Commit**: `feat(service): add analysis service with enqueue and processNext`

---

### T12: [Wire analysis worker route + screen-service enqueue hook]

**What**: `src/app/api/analysis-worker/route.ts` (POST protegida por INTERNAL_API_KEY que drena até N jobs) + injeção de `enqueueAnalysis` em `screen-service.ts` e no `submitScreener`.
**Where**: `src/app/api/analysis-worker/route.ts` (novo), `src/lib/service/screen-service.ts` (modify), `src/app/api/screener/route.ts` (modify), `src/lib/service/screen-service.test.ts` (modify)
**Depends on**: T11
**Reuses**: `verifyInternalApiKey`, `createAnalysisService`, `createScreenService`

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [ ] Worker route verifica `verifyInternalApiKey` e chama `processNext()` × N
- [ ] `screen-service` chama `enqueueAnalysis(leadId)` após persistir diagnóstico; falha não quebra submit (AC INS-03)
- [ ] `screener/route.ts` injeta `enqueueAnalysis` no `createScreenService`
- [ ] Testes existentes de `screen-service` atualizados para o novo dep (mock `enqueueAnalysis`)
- [ ] Testes da rota: sem chave → 401; com chave → processa

**Tests**: unit
**Gate**: build
**Commit**: `feat(worker): wire analysis worker route and screen-service enqueue hook`

---

## Phase Execution Map

Dependency edges below map 1:1 to each task's `Depends on` field. Execution is sequential; a task starts only after its dependencies complete.

```
T2 → T3
T1 → T5
T3 → T6
T4 → T6
T3 → T7
T5 → T8
T6 → T8
T7 → T8
T9 → T10
T8 → T11
T10 → T11
T11 → T12
```

---

## Task Granularity Check

| Task | Scope | Status |
| --- | --- | --- |
| T1 | 1 file (types) | ✅ Granular |
| T2 | 1 file (env) | ✅ Granular |
| T3 | 1 file (llm factory) + deps | ✅ Granular |
| T4 | 1 file + 5 skill files | ✅ Granular (cohesive) |
| T5 | 1 file (researcher) | ✅ Granular |
| T6 | 1 file (analyst) | ✅ Granular |
| T7 | 1 file (writer) | ✅ Granular |
| T8 | 1 file (orchestrator) | ✅ Granular |
| T9 | 1 migration + doc | ✅ Granular |
| T10 | 2 files (repos) | ⚠️ 2 cohesive files (allowed) |
| T11 | 1 file (service) | ✅ Granular |
| T12 | 1 route + 2 modify + tests | ⚠️ cohesive wiring (allowed) |

## Diagram-Definition Cross-Check

| Task | Depends On (body) | Diagram Shows | Status |
| --- | --- | --- | --- |
| T1 | None | T1 root | ✅ |
| T2 | None | T2 root | ✅ |
| T3 | T2 | T3←T2 | ✅ |
| T4 | None | T4 root | ✅ |
| T5 | T1 | T5←T1 | ✅ |
| T6 | T3, T4 | T6←T3,T4 | ✅ |
| T7 | T3 | T7←T3 | ✅ |
| T8 | T5,T6,T7 | T8←T5,T6,T7 | ✅ |
| T9 | None | T9 root | ✅ |
| T10 | T9 | T10←T9 | ✅ |
| T11 | T8,T10 | T11←T8,T10 | ✅ |
| T12 | T11 | T12←T11 | ✅ |

## Test Co-location Validation

| Task | Code Layer Created/Modified | Matrix Requires | Task Says | Status |
| --- | --- | --- | --- | --- |
| T1 | agents (types) | unit | unit | ✅ |
| T2 | env | none | none | ✅ |
| T3 | agents (llm factory) | none (config) | none | ✅ |
| T4 | agents (skill loader) | unit | unit | ✅ |
| T5 | agents (researcher) | unit | unit | ✅ |
| T6 | agents (analyst) | unit | unit | ✅ |
| T7 | agents (writer) | unit | unit | ✅ |
| T8 | agents (orchestrator) | unit | unit | ✅ |
| T9 | migration | none | none | ✅ |
| T10 | repository | unit | unit | ✅ |
| T11 | service | unit | unit | ✅ |
| T12 | route + screen-service | unit | unit | ✅ |
