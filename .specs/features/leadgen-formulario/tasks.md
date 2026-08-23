# Lead-gen Formulário — Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier, discrimination sensor).

**If the skill cannot be activated, STOP and tell the user - do not proceed without it.**

---

**Design**: `.specs/features/leadgen-formulario/design.md`
**Status**: Approved

---

## Test Coverage Matrix

> Generated from codebase, project guidelines, and spec - confirm before Execute. Guidelines found: `AGENTS.md` (harness purity, Zod validation, typed errors) + existing vitest suites (7 test files). No formal coverage-threshold config in `vitest.config.ts`.

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| --- | --- | --- | --- | --- |
| Domain / business-logic (ScoringEngine, AgentPayloadBuilder, ScreenService) | unit | All branches; 1:1 to spec ACs; every listed edge case has a test | `src/lib/screener/*.test.ts`, `src/lib/service/*.test.ts` | `npm run test` |
| Route / controller (screener API routes) | e2e | Happy path + each listed edge case + error/failure paths | `src/app/api/screener/*.test.ts` (route-level) | `npm run test` |
| Repository / data-access (assessment-repo) | integration | Key query paths + error handling (mock Supabase client) | `src/lib/repository/*.test.ts` | `npm run test` |
| Entity / config / schema (contract, schemas, report generator, email) | none | Build gate only | - | `npm run build` |
| UI (page `/diagnostico`) | none | Build gate + manual browser check (no component test framework installed) | - | `npm run build` |

## Gate Check Commands

> Generated from codebase - confirm before Execute.

| Gate Level | When to Use | Command |
| --- | --- | --- |
| Quick | After tasks with unit tests only | `npm run test` |
| Full | After tasks with e2e/integration tests | `npm run test` |
| Build | After phase completion or config/entity-only tasks | `npm run build` + `npm run lint` + `npm run test` |

---

## Execution Plan

Phases are ordered and run sequentially - each phase completes before the next begins, and tasks within a phase execute in order.

### Phase 1: Foundation (contrato, scoring, agent_payload, schema)

- T1: contrato tipado a partir do JSON
- T2: ScoringEngine (scoring determinístico)
- T3: AgentPayloadBuilder (JSON para o agente)
- T4: schema de submissão (payload Zod)

### Phase 2: Persistência e Service

- T5: migration (leads + assessment_responses)
- T6: AssessmentRepository
- T7: ScreenService (orquestração)

### Phase 3: PDF + Email

- T8: ReportGenerator (PDF via @react-pdf/renderer)
- T9: EmailService (envio do PDF ao comercial)

### Phase 4: API + Middleware

- T10: rota interna `/api/screener`
- T11: rota pública proxy `/api/public-proxy/screener`
- T12: rate limit no middleware

### Phase 5: Frontend

- T13: página `/diagnostico` (formulário do contrato + anti-abandono)
- T14: cliente API `submitScreener`

---

## Task Breakdown

### T1: Criar módulo de contrato tipado a partir do JSON ✅

**What**: Tipar `docs/snapshot-maturidade-dados.json` e exportar `SCREENER_CONTRACT` com os tipos do contrato.
**Where**: `src/lib/screener/contract.ts`
**Depends on**: None
**Reuses**: zod (já em `package.json`)
**Requirement**: LF-01

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [x] `SCREENER_CONTRACT` importado do JSON com tipos `ScreenerContract`, `ScreenerDimension`, `ScreenerContextQuestion`, `ScreenerCommercialQuestion`, `ScoringConfig`, `ScoreBand`.
- [x] Testes unit validam estrutura do contrato (dimensões com 5 opções de nível 1–5, pesos somando 100, faixas com min/max/rotulo/descricao).
- [x] `npm run test` passa (16/16).

**Tests**: unit
**Gate**: quick

---

### T2: Implementar ScoringEngine (scoring determinístico)

**What**: Função pura `computeScores(contract, answers, context)` que calcula `soma(nivel*peso)/100`, mapeia para faixa, identifica menor dimensão, desequilíbrio > 3 e C-level.
**Where**: `src/lib/screener/scoring.ts`
**Depends on**: T1
**Reuses**: tipos do contrato
**Requirement**: LF-03, LF-04

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [ ] Score calculado como `soma(nivel*peso)/100`.
- [ ] Faixa mapeada de `scoring.faixas` (`[min,max)`, última inclui max); erro tipado se o score não cair em faixa alguma.
- [ ] Menor dimensão = risco; desequilíbrio > 3 sinalizado; C-level marcado.
- [ ] `npm run test` passa (testes do scoring cobrindo os casos do spec).

**Tests**: unit
**Gate**: quick

---

### T3: Criar AgentPayloadBuilder (documento JSON para o agente)

**What**: Função pura `buildAgentPayload` que monta o documento JSON estruturado (`solicitante {nome,cargo}`, contexto, respostas pontuadas, comercial, score/faixa, risco, desequilíbrio) pronto para envio ao agente de análise.
**Where**: `src/lib/screener/agent-payload.ts`
**Depends on**: T1, T2
**Reuses**: tipos do contrato + resultado do scoring
**Requirement**: LF-11

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [ ] `buildAgentPayload` monta o documento com solicitante (nome/cargo), contexto, respostas pontuadas, comercial, score/faixa, risco e desequilíbrio.
- [ ] Saída validada por `agentPayloadSchema` (Zod).
- [ ] `npm run test` passa (testes do builder).

**Tests**: unit
**Gate**: quick

---

### T4: Criar schemas Zod (contrato + submissão + agent_payload)

**What**: `screenerContractSchema`, `screenerSubmissionSchema` (name, role, email, context, answers, commercialAnswer, consent, company, consentText, honeypot) e `agentPayloadSchema` com validação de que as 10 dimensões estão respondidas.
**Where**: `src/lib/schemas/screener.ts`
**Depends on**: T1
**Reuses**: zod, `sanitizeText` de `lead.ts`
**Requirement**: LF-08

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [ ] Payload validado (name/role com ≥2 chars, email, consent, answers com dimensionId/nivel válidos).
- [ ] Rejeita resposta incompleta (dimensão faltando) e nível fora de 1–5.
- [ ] `npm run test` passa (testes do schema).

**Tests**: unit
**Gate**: quick

---

### T5: Migration — ajustar `leads` + criar `assessment_responses`

**What**: Migration SQL commitada: `leads.company/phone` nullable + `consent`/`consent_at`; tabela `assessment_responses` (jsonb incl. `agent_payload`, 1:1 lead). `docs/data-model.md` atualizado no mesmo commit.
**Where**: `supabase/migrations/0005_screener_responses.sql`
**Depends on**: None
**Reuses**: padrão das migrations 0003/0004 (RLS, service-role)
**Requirement**: LF-05, LF-11

**Tools**:
- MCP: `supabase-mcp` (apply_migration no project `utpamkyttlgffziegomp`)
- Skill: NONE

**Done when**:
- [ ] Migration aplicada via supabase-mcp.
- [ ] `docs/data-model.md` atualizado no mesmo commit (nova tabela + colunas + diagrama) — regra do doc vivo.
- [ ] RLS habilitado sem policies (service-role only) nas novas colunas/tabela.

**Tests**: none
**Gate**: build

---

### T6: AssessmentRepository (persistência de respostas + diagnóstico)

**What**: `createAssessmentRepository` com `createAssessmentResponse` (inclui `agent_payload`) e `createDiagnostic` (inserções em `assessment_responses` e `diagnostics`).
**Where**: `src/lib/repository/assessment-repo.ts`
**Depends on**: T5
**Reuses**: padrão de `lead-repo.ts`/`session-repo.ts`
**Requirement**: LF-05, LF-11

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [ ] Métodos de domínio `createAssessmentResponse` (com `agent_payload`) e `createDiagnostic` (jsonb).
- [ ] Usa `getServiceClient()` injetado.
- [ ] Testes unit com mock do client (key paths + error handling).

**Tests**: integration
**Gate**: full

---

### T7: ScreenService (orquestração: scoring + agent_payload + persistência + PDF + email)

**What**: `createScreenService` que recebe o contrato, valida, calcula, monta `agent_payload`, persiste (lead + responses + diagnostic), gera PDF e envia email; retorna `{ ok: true }`.
**Where**: `src/lib/service/screen-service.ts`
**Depends on**: T2, T3, T4, T6
**Reuses**: `createLeadRepository`, `sanitizeText`
**Requirement**: LF-02, LF-05, LF-06, LF-09, LF-10, LF-11

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [ ] Orquestra: dedup de email pendente (409), consent obrigatório (400), dimensões completas (400), persistência, PDF, email.
- [ ] Cria lead com name/role/email + consent/consent_at; persiste `agent_payload`.
- [ ] Persistência falha → 500 sem email; email falha → 502 com log.
- [ ] Honeypot descartado (não processa).
- [ ] Testes unit com mocks (todas as branches + edge cases do spec).

**Tests**: unit
**Gate**: quick

---

### T8: ReportGenerator (PDF via @react-pdf/renderer)

**What**: `src/lib/report/report-generator.ts` com gerador que produz PDF com identidade Rhema Data (empresa, respondente, faixa, dimensões, risco, desequilíbrio, comercial).
**Where**: `src/lib/report/report-generator.ts`
**Depends on**: T2
**Reuses**: cores Rhema de `globals.css`; interface `ReportGenerator` (ADR-005)
**Requirement**: LF-06

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [ ] `@react-pdf/renderer` instalado (`npm i @react-pdf/renderer`).
- [ ] Gerador retorna `{ pdf: Buffer, filename }` com conteúdo da identidade Rhema Data.
- [ ] Teste unit (renderToBuffer não-vazio; nome de arquivo sanitizado).

**Tests**: unit
**Gate**: quick

---

### T9: EmailService (envio do PDF ao comercial)

**What**: `src/lib/email/send-report.ts` com `sendReportEmail` enviando o PDF como anexo para `MANAGER_NOTIFICATION_EMAIL`.
**Where**: `src/lib/email/send-report.ts`
**Depends on**: T8
**Reuses**: padrão `getResend()` de `send-token.ts`
**Requirement**: LF-06

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [ ] Envia para `MANAGER_NOTIFICATION_EMAIL` com anexo PDF e subject/HTML do diagnóstico.
- [ ] Falha → lança erro tipado (o service mapeia para 502).
- [ ] Teste unit com mock do Resend.

**Tests**: unit
**Gate**: quick

---

### T10: Rota interna `/api/screener`

**What**: `src/app/api/screener/route.ts` — verifyInternalApiKey → Zod → service → DTO; map de erros tipados.
**Where**: `src/app/api/screener/route.ts`
**Depends on**: T4, T7
**Reuses**: `verifyInternalApiKey`, `getServiceClient`, padrão de `leads/route.ts`
**Requirement**: LF-02, LF-08

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [ ] 401 sem internal key; 400 payload inválido; 409 lead duplicado; 500/502 erros internos.
- [ ] Sem regra de negócio no handler (só valida + delega).
- [ ] Teste e2e com mocks (happy + edge + error).

**Tests**: e2e
**Gate**: full

---

### T11: Rota pública proxy `/api/public-proxy/screener`

**What**: `src/app/api/public-proxy/screener/route.ts` delegando via `proxyToInternal`.
**Where**: `src/app/api/public-proxy/screener/route.ts`
**Depends on**: T10
**Reuses**: `proxyToInternal`
**Requirement**: LF-02

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [ ] Proxy público criado (target `screener`).
- [ ] Teste e2e do proxy (repassa método, status de erro, 502 em fetch falho).

**Tests**: e2e
**Gate**: full

---

### T12: Rate limit no middleware para `/api/public-proxy/screener`

**What**: Adicionar o caminho do screener em `RATE_LIMITED_PATHS` e `RATE_LIMITS` do middleware.
**Where**: `src/middleware.ts`
**Depends on**: T11
**Reuses**: `checkRateLimit`
**Requirement**: LF-02 (rate limit)

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [ ] `/api/public-proxy/screener` coberto com limite dedicado no middleware.
- [ ] Teste do rate limit (429 com Retry-After quando excedido).

**Tests**: e2e
**Gate**: full

---

### T13: Página `/diagnostico` (formulário do contrato + anti-abandono)

**What**: `src/app/diagnostico/page.tsx` (client) renderizando as 12 perguntas do contrato + campos nome/cargo/email, validação client, localStorage de respostas, honeypot, consentimento e envio via `submitScreener`; confirmação simples pós-submit.
**Where**: `src/app/diagnostico/page.tsx`
**Depends on**: T1, T4, T11, T14
**Reuses**: design system Rhema (`globals.css`, `RhemaLogo`, `WaveDivider`)
**Requirement**: LF-01, LF-02, LF-07, LF-09, LF-10

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [ ] 12 perguntas renderizadas do contrato (2 contexto + 10 dimensões + 1 comercial), sem hardcode.
- [ ] Campos nome/cargo/email presentes e validados; consentimento obrigatório.
- [ ] localStorage salva/restaura/limpa respostas (incluindo nome/cargo/email).
- [ ] Honeypot presente; confirmação simples pós-submit.
- [ ] `npm run build` passa (página compila com o contrato importado).

**Tests**: none
**Gate**: build

---

### T14: Cliente API `submitScreener`

**What**: `src/lib/api/client.ts` — adicionar `submitScreener` (POST `/api/public-proxy/screener`).
**Where**: `src/lib/api/client.ts` (modify)
**Depends on**: T11
**Reuses**: `apiFetch`
**Requirement**: LF-02, LF-10

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [ ] `submitScreener` posta para `/api/public-proxy/screener` e lança `ApiError` em falha.
- [ ] `npm run test` passa.

**Tests**: unit
**Gate**: quick

---

## Phase Execution Map

```
T1 -> T2
T1 -> T4
T1 -> T3
T2 -> T3
T3 -> T7
T5 -> T6
T6 -> T7
T2 -> T7
T4 -> T7
T2 -> T8
T8 -> T9
T4 -> T10
T7 -> T10
T10 -> T11
T11 -> T12
T11 -> T14
T14 -> T13
T1 -> T13
T4 -> T13
T11 -> T13
```

Execution is strictly sequential - there is no intra-phase parallelism. A single agent (or batch worker) works one task at a time, in order.

At Execute, the agent counts total tasks (14) and packs phases into task-budgeted batches (~7 tasks per worker, whole phases). When packing yields more than one batch (> ~8 tasks), the agent offers to dispatch batch sub-agents before starting.

---

## Task Granularity Check

| Task | Scope | Status |
| --- | --- | --- |
| T1: contrato tipado | 1 módulo | ✅ Granular |
| T2: scoring | 1 função pura | ✅ Granular |
| T3: agent payload builder | 1 função pura | ✅ Granular |
| T4: schemas | 1 arquivo de schema | ✅ Granular |
| T5: migration | 1 migration + doc no commit | ✅ Granular |
| T6: assessment-repo | 1 repositório | ✅ Granular |
| T7: screen-service | 1 serviço | ✅ Granular |
| T8: report-generator | 1 gerador PDF | ✅ Granular |
| T9: send-report | 1 módulo email | ✅ Granular |
| T10: rota screener | 1 endpoint | ✅ Granular |
| T11: proxy screener | 1 endpoint | ✅ Granular |
| T12: rate limit | 1 arquivo middleware | ✅ Granular |
| T13: página /diagnostico | 1 página | ✅ Granular |
| T14: submitScreener | 1 função client | ✅ Granular |

## Diagram-Definition Cross-Check

| Task | Depends On (task body) | Diagram Shows | Status |
| --- | --- | --- | --- |
| T2 | T1 | T1→T2 | ✅ Match |
| T3 | T1,T2 | T1→T3, T2→T3 | ✅ Match |
| T4 | T1 | T1→T4 | ✅ Match |
| T6 | T5 | T5→T6 | ✅ Match |
| T7 | T2,T3,T4,T6 | T3→T7, T6→T7, T2→T7, T4→T7 | ✅ Match |
| T8 | T2 | T2→T8 | ✅ Match |
| T9 | T8 | T8→T9 | ✅ Match |
| T10 | T4,T7 | T4→T10, T7→T10 | ✅ Match |
| T11 | T10 | T10→T11 | ✅ Match |
| T12 | T11 | T11→T12 | ✅ Match |
| T13 | T1,T4,T11,T14 | T14→T13, T1→T13, T4→T13, T11→T13 | ✅ Match |
| T14 | T11 | T11→T14 | ✅ Match |

## Test Co-location Validation

| Task | Code Layer Created/Modified | Matrix Requires | Task Says | Status |
| --- | --- | --- | --- | --- |
| T1 | Entity/config (contract) | none | unit | ✅ OK |
| T2 | Domain logic (scoring) | unit | unit | ✅ OK |
| T3 | Domain logic (agent payload) | unit | unit | ✅ OK |
| T4 | Schema | none | unit | ✅ OK |
| T5 | Migration (entity) | none | none | ✅ OK |
| T6 | Repository | integration | integration | ✅ OK |
| T7 | Service (domain) | unit | unit | ✅ OK |
| T8 | Entity/config (report) | none | unit | ✅ OK |
| T9 | Service (email) | none (build gate) | unit | ✅ OK |
| T10 | Route/controller | e2e | e2e | ✅ OK |
| T11 | Route/controller (proxy) | e2e | e2e | ✅ OK |
| T12 | Middleware | e2e | e2e | ✅ OK |
| T13 | UI (page) | none | none | ✅ OK |
| T14 | Client function | unit | unit | ✅ OK |
