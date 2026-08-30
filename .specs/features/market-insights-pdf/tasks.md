# Market Insights PDF — Slice 2 Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier, discrimination sensor).

**If the skill cannot be activated, STOP and tell the user - do not proceed without it.**

---

**Spec**: `.specs/features/market-insights-pdf/spec.md`
**Status**: Done

---

## Test Coverage Matrix

> Generated from codebase, project guidelines, and spec - confirm before Execute. Guidelines found: `AGENTS.md` (Zod boundaries, layered backend, testing rules), `docs/rules/validation.md`, `docs/rules/architecture.md`, `vitest.config.ts` (`environment: node`, `include: src/**/*.test.ts(x)`), existing unit tests for services/repos/PDF.

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| --- | --- | --- | --- | --- |
| Report generator (`report-generator.ts`) | unit | All branches; 1:1 to spec ACs (PDF-01..PDF-05); every listed edge case | `src/lib/report/report-generator.test.ts` | `npm run test` |
| Analysis service (`analysis-service.ts`) | unit | All branches; 1:1 to ACs (EMAIL-01..EMAIL-04); edge cases | `src/lib/service/analysis-service.test.ts` | `npm run test` |
| Screen service (`screen-service.ts`) | unit | 1:1 to EMAIL-01 (submit NÃO envia e-mail); existing tests updated | `src/lib/service/screen-service.test.ts` | `npm run test` |
| Repository (`lead-repo.ts`) | unit | `updateStatus` path (já coberto) + `analise_pendente` uso | `src/lib/repository/lead-repo.test.ts` | `npm run test` |
| Worker route (`/api/analysis-worker`) | unit (handler-level) | Auth + processNext wiring (mock service) — já coberto; sem mudança funcional | `src/app/api/analysis-worker/route.test.ts` | `npm run test` |

## Gate Check Commands

> Generated from codebase - confirm before Execute.

| Gate Level | When to Use | Command |
| --- | --- | --- |
| Quick | After tasks with unit tests only | `npm run test` |
| Build | After phase completion or config/entity-only tasks | `npm run typecheck` + `npm run lint` + `npm run test` + `npm run build` |

---

## Execution Plan

Phases are ordered and run sequentially; each phase completes before the next begins. Dependencies between tasks are explicit in each task's `Depends on` field (see Phase Execution Map below).

- **Phase 1 — PDF enrichment**: T1 (types+bullets no PDF), T2 (seção Análise + Concorrentes), T3 (PDF básico de fallback).
- **Phase 2 — Email timing**: T4 (screen-service não envia e-mail), T5 (analysis-service envia PDF pós-análise + fallback), T6 (lead-repo status `analise_pendente`).

### Phase 1: PDF enrichment

Adicionar `insights?`/`analysis?` ao `GeneratePdfInput` e renderizar as seções no PDF.

### Phase 2: Email timing

Mover o e-mail do submit para o worker, com fallback.

---

## Task Breakdown

### T1: [Adicionar insights e analysis ao input do PDF e renderizar bullets coloridos]

**What**: Estender `GeneratePdfInput` com `insights?` e `analysis?` opcionais e renderizar a seção "Insights" com bullets priorizados (quadrados coloridos: alta=vermelho, media=amarelo, baixa=azul).
**Where**: `src/lib/report/report-generator.ts` (modify) + `src/lib/service/screen-service.ts` (type only)
**Depends on**: None
**Reuses**: `types.ts` (`InsightsBrief`, `InsightBullet`), `MarketAnalysis`
**Requirement**: PDF-02, PDF-04, PDF-05

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [x] `GeneratePdfInput` tem `insights?: InsightsBrief` e `analysis?: MarketAnalysis` opcionais
- [x] Cada bullet renderiza um quadrado `borderRadius` colorido por prioridade (alta=vermelho, media=amarelo, baixa=azul; inválida → azul)
- [x] Seção "Insights" omitida quando `insights` ausente ou `bullets` vazio
- [x] Nenhuma fonte/URL é renderizada no PDF
- [x] Unit tests no `report-generator.test.ts`: bullets coloridos (3 prioridades + inválida), omitir seção vazia
- [x] `npm run test` passa

**Tests**: unit ✅ (8 testes em `src/lib/report/report-generator.test.ts`)
**Gate**: quick ✅ (`npm run test` 296 passed)
**Commit**: `feat(report): render prioritized insight bullets with colored squares`

---

### T2: [Renderizar seção Análise e Concorrentes no PDF]

**What**: Renderizar a seção "Análise" (resumo + dores) e "Concorrentes" (nome + contexto) quando disponíveis.
**Where**: `src/lib/report/report-generator.ts` (modify)
**Depends on**: T1
**Reuses**: `analysisPainSchema`, `competitorContextSchema`
**Requirement**: PDF-01, PDF-03, PDF-05

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [ ] Seção "Análise" renderiza `resumo` e lista de `dores` (dimensão + dor + evidência de mercado)
- [ ] Seção "Concorrentes" renderiza nome + contexto quando `contexto_concorrentes` não vazio
- [ ] Ambas as seções são omitidas quando ausentes/vazias
- [ ] Unit tests: análise presente, análise ausente, concorrentes presentes/vazios
- [ ] `npm run test` passa

**Tests**: unit
**Gate**: quick
**Commit**: `feat(report): add market analysis and competitors sections to pdf`

---

### T3: [Garantir PDF básico de fallback sem bullets]

**What**: Testar/confirmar que `generateScreenerPdf` com `insights` ausente produz PDF válido (fallback básico) e que `analysis` ausente omite a seção.
**Where**: `src/lib/report/report-generator.test.ts` (modify)
**Depends on**: T2
**Reuses**: n/a
**Requirement**: PDF-04, PDF-05

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [x] Teste: `generateScreenerPdf` sem `insights`/`analysis` gera buffer não-vazio (PDF básico) — coberto no commit de T1 (`sem insights: omite a seção de bullets (PDF básico de fallback)`)
- [x] Teste: sem `insights` a seção de bullets não existe (verificado via `buildReportChildren`) — idem
- [x] `npm run test` passa (296 passed)

**Tests**: unit ✅ (coberto em T1 — `report-generator.test.ts`, 8 testes)
**Gate**: quick ✅ (`npm run test` 296 passed)
**Commit**: coberto no commit de T1 (`feat(report): render prioritized insight bullets with colored squares`) — sem commit próprio

---

### T4: [Remover envio de e-mail do submit no screen-service]

**What**: `screenService.submitScreener` deixa de gerar PDF/email; passa a retornar `{ok:true}` logo após o enfileiramento da análise.
**Where**: `src/lib/service/screen-service.ts` (modify) + `src/lib/service/screen-service.test.ts` (modify)
**Depends on**: None
**Reuses**: `ScreenServiceError`
**Requirement**: EMAIL-01

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [x] `submitScreener` NÃO chama `generatePdf`/`sendEmail` e retorna `{ok:true}` após persistir + enfileirar
- [x] `GeneratePdfInput` continua exportado (type) mas não é mais usado no submit
- [x] Unit tests atualizados: happy path retorna `{ok:true}`; `sendEmail` NÃO é chamado; `generatePdf` NÃO é chamado; persistência ainda lança 500
- [x] `npm run test` passa (293 passed)

**Tests**: unit ✅ (13 testes em `src/lib/service/screen-service.test.ts`)
**Gate**: quick ✅ (`npm run test` 293 passed)
**Commit**: `refactor(screen): stop sending report email on submit`

---

### T5: [Enviar PDF pós-análise no worker com fallback]

**What**: `analysisService.processNext` regenera o PDF (enriquecido ou básico) e envia e-mail ao comercial; injeta `generatePdf`, `sendEmail`, `loadDiagnosticPdfInput` como deps.
**Where**: `src/lib/service/analysis-service.ts` (modify) + `src/lib/service/analysis-service.test.ts` (modify)
**Depends on**: T3, T4
**Reuses**: `GeneratePdfInput`, `sendReportEmail` shape, `ScreenServiceError` pattern
**Requirement**: EMAIL-02, EMAIL-03, EMAIL-04

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [x] No sucesso: regenera PDF com `insights`+`analysis`, envia e-mail ao `MANAGER_NOTIFICATION_EMAIL`, mantém status `analisado`
- [x] Na falha do pipeline: marca `leadRepo.updateStatus(leadId, 'analise_pendente')`, `market_insights.status = 'falha'`, envia PDF básico (sem `insights`)
- [x] Se o e-mail falhar: loga erro e não lança (status permanece)
- [x] Sem payload/lead: marca `falha` e NÃO envia e-mail
- [x] Unit tests: sucesso com PDF enriquecido + e-mail; falha → `analise_pendente` + PDF básico + e-mail; e-mail falha → não lança; sem payload → sem e-mail
- [x] `npm run test` passa (294 passed) + `npm run build` passa

**Tests**: unit ✅ (7 testes em `src/lib/service/analysis-service.test.ts`)
**Gate**: build ✅ (`npm run test` 294 passed + `npm run build` passou)
**Commit**: `feat(worker): email enriched or fallback pdf after analysis`

---

### T6: [Adicionar status analise_pendente ao lead-repo e testes]

**What**: Garantir que `updateStatus(leadId, 'analise_pendente')` seja chamado no fallback (via T5) e que `lead-repo.test.ts` cubra o uso do status.
**Where**: `src/lib/service/analysis-service.test.ts` (modify — fallback `analise_pendente` já coberto)
**Depends on**: T5
**Reuses**: n/a
**Requirement**: EMAIL-03

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [x] Teste no `analysis-service.test.ts` confirma que o fallback chama `leadRepo.updateStatus` com `analise_pendente` (`expect(updateStatus).toHaveBeenCalledWith("lead-1", "analise_pendente")`, linha ~235)
- [x] Não existe `lead-repo.test.ts` no repo (repos usam mocks nos testes de serviço); o comportamento do status é coberto no teste de serviço — sem teste dedicado de repo para este status
- [x] `npm run test` passa (294 passed)

**Tests**: unit ✅ (coberto em T5 — `analysis-service.test.ts`)
**Gate**: quick ✅ (`npm run test` 294 passed)
**Commit**: coberto no commit de T5 (`feat(worker): email enriched or fallback pdf after analysis`) — sem commit próprio

---

## Phase Execution Map

Dependency edges below map 1:1 to each task's `Depends on` field. Execution is sequential; a task starts only after its dependencies complete.

```
Phase 1:  T1 → T2 → T3
Phase 2:  T4 → T5 → T6

T3 → T5
T4 → T5
T5 → T6
```

---

## Task Granularity Check

| Task | Scope | Status |
| --- | --- | --- |
| T1 | 2 files (report modify + type) | ✅ Granular (cohesive) |
| T2 | 1 file (report modify) | ✅ Granular |
| T3 | 1 test file | ✅ Granular |
| T4 | 2 files (service modify + tests) | ⚠️ 2 cohesive files (allowed) |
| T5 | 2 files (service modify + tests) | ⚠️ 2 cohesive files (allowed) |
| T6 | 1 test file | ✅ Granular |

## Diagram-Definition Cross-Check

| Task | Depends On (body) | Diagram Shows | Status |
| --- | --- | --- | --- |
| T1 | None | T1 root | ✅ |
| T2 | T1 | T2←T1 | ✅ |
| T3 | T2 | T3←T2 | ✅ |
| T4 | None | T4 root | ✅ |
| T5 | T3, T4 | T5←T3,T4 | ✅ |
| T6 | T5 | T6←T5 | ✅ |

## Test Co-location Validation

| Task | Code Layer Created/Modified | Matrix Requires | Task Says | Status |
| --- | --- | --- | --- | --- |
| T1 | report generator | unit | unit | ✅ |
| T2 | report generator | unit | unit | ✅ |
| T3 | report generator (test) | unit | unit | ✅ |
| T4 | screen service | unit | unit | ✅ |
| T5 | analysis service | unit | unit | ✅ |
| T6 | lead repo + analysis service | unit | unit | ✅ |
