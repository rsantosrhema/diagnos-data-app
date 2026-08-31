# PDF Radar de Aranha + Admin Reprocessar — Fatia 3 Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier, discrimination sensor).

**If the skill cannot be activated, STOP and tell the user - do not proceed without it.**

---

**Spec**: `.specs/features/pdf-radar-e-reprocessamento/spec.md`
**Design**: `.specs/features/pdf-radar-e-reprocessamento/design.md`
**Status**: Draft

---

## Test Coverage Matrix

> Generated from codebase, project guidelines, and spec - confirm before Execute. Guidelines found: `AGENTS.md` (Zod boundaries, layered backend, typed errors, testing rules), `docs/rules/validation.md`, `docs/rules/architecture.md`, `vitest.config.ts` (`environment: node`, `include: src/**/*.test.ts(x)`), existing unit tests for services/repos/PDF (padrão `*.test.ts` colocado junto ao fonte).

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| --- | --- | --- | --- | --- |
| Radar chart (`radar-chart.ts`) | unit | All branches; 1:1 to RADAR-01..06; clamp edge cases; empty input | `src/lib/report/radar-chart.test.ts` | `npm run test` |
| Report generator (`report-generator.ts`) | unit | Seção "Radar de Maturidade" presente/ausente conforme `dimensionScores` (RADAR-01/05/06); PDF buffer válido com radar | `src/lib/report/report-generator.test.ts` | `npm run test` |
| Admin service (`admin-service.ts`) | unit | 1:1 to REPRO-01..04 (elegibilidade, 400s, enqueue chamado); deps novos mockados | `src/lib/service/admin-service.test.ts` | `npm run test` |
| Schema (`schemas/analysis.ts`) | unit | `reprocessAnalysisSchema` aceita uuid válido; rejeita uuid inválido e campos extras (`.strict()`) | `src/lib/schemas/analysis.test.ts` | `npm run test` |
| Admin route (`/api/admin/analysis/reprocess`) | unit (handler-level) | Auth 401; body inválido 400; lead sem diagnóstico 400; status inelegível 400; sucesso 200 `{ ok: true }`; enqueue falha → 500 | `src/app/api/admin/analysis/reprocess/route.test.ts` | `npm run test` |

## Gate Check Commands

> Generated from codebase - confirm before Execute.

| Gate Level | When to Use | Command |
| --- | --- | --- |
| Quick | After tasks with unit tests only | `npm run test` |
| Build | After phase completion or config/entity-only tasks | `npm run typecheck` + `npm run lint` + `npm run test` + `npm run build` |

---

## Execution Plan

Phases are ordered and run sequentially; each phase completes before the next begins. Dependencies between tasks are explicit in each task's `Depends on` field (see Phase Execution Map below).

- **Phase 1 — Radar no PDF**: T1 (RadarChart + clamp + labels), T2 (seção Radar no `buildReportChildren` + testes PDF).
- **Phase 2 — Admin reprocessar (backend)**: T3 (schema), T4 (admin-service `reprocessAnalysis`), T5 (rota interna), T6 (proxy admin-proxy).
- **Phase 3 — Admin reprocessar (front)**: T7 (client `reprocessAnalysis`), T8 (botão na página admin).

### Phase 1: Radar no PDF

Componente SVG puro + integração no gerador.

### Phase 2: Admin reprocessar (backend)

Serviço + schema + rota interna + proxy.

### Phase 3: Admin reprocessar (front)

Client + UI da página admin.

---

## Task Breakdown

### T1: [Criar componente <RadarChart> com grid, polígono e labels]

**What**: Criar `src/lib/report/radar-chart.ts` — pure function `RadarChart({ dimensions })` que renderiza `<Svg>` com grid de 5 anéis, eixos por dimensão, polígono do nível (com clamp 1–5) e labels.
**Where**: `src/lib/report/radar-chart.ts` (novo) + `src/lib/report/radar-chart.test.ts` (novo)
**Depends on**: None
**Reuses**: padrão `h = React.createElement` do `report-generator.ts`; `Svg`/`Polygon`/`Line`/`Text` de `@react-pdf/renderer`
**Requirement**: RADAR-02, RADAR-03, RADAR-04, RADAR-05, RADAR-06

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [x] `RadarChart` retorna um elemento `Svg` (`@react-pdf/renderer`) — RADAR-06 (sem lib externa)
- [x] Grid de 5 anéis (1 polígono por nível, `RADAR_LEVELS = [1..5]`) — RADAR-02
- [x] Um eixo (`Line`) por dimensão + polígono fechado (`Polygon`) com `points` dos níveis clampados — RADAR-03
- [x] `clamp(level)` min 1 / max 5 aplicado no cálculo de coordenadas — RADAR-04
- [x] Labels (`Text`) posicionados nos eixos — RADAR-05
- [x] `dimensions` vazio → retorna `null` (sem SVG)
- [x] Unit tests em `radar-chart.test.ts`: 5 anéis, N eixos, polígono com pontos clampados, labels, vazio → null (10 testes)
- [x] `npm run test` passa (308 passed)

**Tests**: unit ✅ (10 testes em `src/lib/report/radar-chart.test.ts`)
**Gate**: quick ✅ (`npm run test` 308 passed)
**Commit**: `feat(report): add radar chart svg with grid polygon and labels`

---

### T2: [Renderizar seção "Radar de Maturidade" no buildReportChildren]

**What**: Inserir no `buildReportChildren` a seção `Radar de Maturidade` com `<RadarChart>` quando `dimensionScores` não vazio; adicionar teste no `report-generator.test.ts`.
**Where**: `src/lib/report/report-generator.ts` (modify) + `src/lib/report/report-generator.test.ts` (modify)
**Depends on**: T1
**Reuses**: `RadarChart` (T1)
**Requirement**: RADAR-01, RADAR-05, RADAR-06

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [x] `dimensionScores.length > 0` → children incluem `Text` "Radar de Maturidade" + `RadarChart`
- [x] `dimensionScores` vazio → seção Radar omitida
- [x] `generateScreenerPdf` com `dimensionScores` produz buffer não-vazio (PDF com radar)
- [x] Unit tests em `report-generator.test.ts`: seção presente, seção ausente, buffer gerado
- [x] `npm run test` passa (310 passed)

**Tests**: unit ✅ (2 novos em `report-generator.test.ts`, total 14)
**Gate**: quick ✅ (`npm run test` 310 passed)
**Commit**: `feat(report): render radar maturity section in pdf`

---

### T3: [Criar schema Zod .strict() para reprocessar análise]

**What**: Criar `src/lib/schemas/analysis.ts` com `reprocessAnalysisSchema` (`.strict()`, `leadId: uuid`) e testes.
**Where**: `src/lib/schemas/analysis.ts` (novo) + `src/lib/schemas/analysis.test.ts` (novo)
**Depends on**: None
**Reuses**: padrão de `schemas/token.ts`
**Requirement**: REPRO-06

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [x] `reprocessAnalysisSchema` aceita `{ leadId: <uuid válido> }`
- [x] Rejeita `leadId` não-uuid e campos extras (`.strict()`)
- [x] Unit tests cobrem os três casos (4 testes)
- [x] `npm run test` passa (314 passed)

**Tests**: unit ✅ (4 testes em `src/lib/schemas/analysis.test.ts`)
**Gate**: quick ✅ (`npm run test` 314 passed)
**Commit**: `feat(admin): add reprocess analysis schema`

---

### T4: [Adicionar reprocessAnalysis ao admin-service]

**What**: Expandir `admin-service.ts` com deps `assessmentRepo` + `analysisService` e método `reprocessAnalysis(leadId)` com regras de elegibilidade (lead existe → tem diagnóstico → status elegível → enqueue) e erro tipado `AdminServiceError`.
**Where**: `src/lib/service/admin-service.ts` (modify) + `src/lib/service/admin-service.test.ts` (modify)
**Depends on**: T3
**Reuses**: `LeadRepository.findById`, `AssessmentRepository.existsForLead`, `analysisService.enqueue`, `reprocessAnalysisSchema` (tipo); padrão `LeadServiceError`/`ScreenServiceError`
**Requirement**: REPRO-01, REPRO-02, REPRO-03, REPRO-04

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [x] `reprocessAnalysis(leadId: string)` valida com `reprocessAnalysisSchema` (reusa T3) e retorna `{ ok: true }` após `enqueue` para status `analisado`/`falha`/`analise_pendente` com diagnóstico
- [x] `AdminServiceError(400)` para lead inexistente e para lead sem diagnóstico
- [x] `AdminServiceError(400)` para status inelegível
- [x] Erro de `enqueue` propaga (não capturado) — REPRO-04
- [x] Mocks de `admin-service.test.ts` atualizados com os novos deps (testes existentes não quebram)
- [x] Unit tests novos: happy path (enqueue chamado), sem diagnóstico 400, status inelegível 400, enqueue rejeitado propaga
- [x] `npm run test` passa (319 passed) + `npm run typecheck` passa

**Tests**: unit ✅ (5 novos em `admin-service.test.ts`, total 7)
**Gate**: quick ✅ (`npm run test` 319 passed + `npm run typecheck` ok)
**Commit**: `feat(admin): add reprocessAnalysis with eligibility to admin service`

---

### T5: [Criar rota interna POST /api/admin/analysis/reprocess]

**What**: Criar `src/app/api/admin/analysis/reprocess/route.ts` com auth (`verifyInternalApiKey` + `requireManager`), validação Zod e mapeamento de `AdminServiceError`.
**Where**: `src/app/api/admin/analysis/reprocess/route.ts` (novo) + `src/app/api/admin/analysis/reprocess/route.test.ts` (novo)
**Depends on**: T4
**Reuses**: padrão de `api/admin/tokens/generate/route.ts`; `reprocessAnalysisSchema` (T3); `AdminServiceError`
**Requirement**: REPRO-01, REPRO-02, REPRO-03, REPRO-04, REPRO-05

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [ ] 401 sem internal key / sem gerente
- [ ] 400 body inválido (`leadId` não-uuid, campos extras)
- [ ] 400 quando `AdminServiceError(400)` (lead sem diagnóstico / status inelegível)
- [ ] 500 quando `enqueue` falha (erro genérico)
- [ ] 200 `{ ok: true }` em sucesso
- [ ] Unit tests de rota cobrem os 5 caminhos (mocks de service/repos)
- [ ] `npm run test` passa

**Tests**: unit
**Gate**: quick

---

### T6: [Criar proxy admin-proxy /analysis/reprocess]

**What**: Criar `src/app/api/admin-proxy/analysis/reprocess/route.ts` que delega a `proxyToInternal(req, { target: "admin/analysis/reprocess" })`.
**Where**: `src/app/api/admin-proxy/analysis/reprocess/route.ts` (novo)
**Depends on**: T5
**Reuses**: `proxyToInternal` (padrão de `admin-proxy/tokens/generate`)
**Requirement**: REPRO-05

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [ ] Rota proxy existe e chama `proxyToInternal` com o target correto
- [ ] Sem teste dedicado (proxy é delegação pura, padrão já coberto pelas rotas existentes) — **confirmed**: testes de proxy existentes cobrem o mesmo padrão
- [ ] `npm run test` passa

**Tests**: none (delegação pura, sem lógica — matriz: rota admin-proxy não lista; padrão já coberto)
**Gate**: quick

---

### T7: [Adicionar client reprocessAnalysis no api/client]

**What**: Adicionar `reprocessAnalysis(leadId, authToken): Promise<{ ok: true }>` em `src/lib/api/client.ts` via `apiFetch`.
**Where**: `src/lib/api/client.ts` (modify)
**Depends on**: T6
**Reuses**: `apiFetch` (padrão de `generateToken`)
**Requirement**: REPRO-01

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [ ] Função exportada `reprocessAnalysis(leadId, authToken)` chamando `apiFetch("/admin-proxy/analysis/reprocess", { method: "POST", body: { leadId }, token: authToken })`
- [ ] Sem teste dedicado (wrapper de `apiFetch`, padrão já coberto) — **confirmed**: demais clients não têm teste próprio
- [ ] `npm run typecheck` passa

**Tests**: none (wrapper de fetch; matriz não exige teste de client)
**Gate**: build (typecheck)

---

### T8: [Adicionar botão Reprocessar na página admin]

**What**: Adicionar handler `onReprocess` e item "Reprocessar análise" no menu de ações da página admin (visível quando `leadStatus` ∈ `analisado`/`falha`/`analise_pendente`), com toast e refresh.
**Where**: `src/app/admin/page.tsx` (modify)
**Depends on**: T7
**Reuses**: padrão de `onGenerate`/`onSend` (toast + `loadData`)
**Requirement**: REPRO-01

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [ ] Handler `handleReprocess(leadId)` chama `reprocessAnalysis(leadId, token)`, toast de sucesso/erro, `loadData()`
- [ ] `RowActionMenu` exibe "Reprocessar análise" quando `row.leadStatus` elegível (com loading)
- [ ] Sem teste de componente dedicado (página admin sem teste existente; feature de ação admin) — **confirmed**: `page.tsx` não tem teste atual
- [ ] `npm run build` passa

**Tests**: none (UI admin sem suíte atual)
**Gate**: build

---

## Phase Execution Map

```
Phase 1:  T1 → T2
Phase 2:  T3 → T4 → T5 → T6
Phase 3:  T7 → T8

T6 → T7
```

---

## Task Granularity Check

| Task | Scope | Status |
| --- | --- | --- |
| T1 | 1 novo arquivo + 1 novo teste | ✅ Granular |
| T2 | 1 arquivo (modify) + teste | ✅ Granular |
| T3 | 1 novo arquivo + teste | ✅ Granular |
| T4 | 1 arquivo (modify) + teste | ⚠️ 2 arquivos coesos (service + teste) |
| T5 | 1 novo arquivo + teste | ✅ Granular |
| T6 | 1 novo arquivo (proxy) | ✅ Granular |
| T7 | 1 arquivo (modify, client) | ✅ Granular |
| T8 | 1 arquivo (modify, página admin) | ⚠️ 1 página com botão + handler (coeso) |

## Diagram-Definition Cross-Check

| Task | Depends On (body) | Diagram Shows | Status |
| --- | --- | --- | --- |
| T1 | None | T1 root | ✅ |
| T2 | T1 | T2←T1 | ✅ |
| T3 | None | T3 root | ✅ |
| T4 | T3 | T4←T3 | ✅ |
| T5 | T4 | T5←T4 | ✅ |
| T6 | T5 | T6←T5 | ✅ |
| T7 | T6 | T7←T6 | ✅ |
| T8 | T7 | T8←T7 | ✅ |

## Test Co-location Validation

| Task | Code Layer Created/Modified | Matrix Requires | Task Says | Status |
| --- | --- | --- | --- | --- |
| T1 | radar chart (new) | unit | unit | ✅ |
| T2 | report generator (modify) | unit | unit | ✅ |
| T3 | schema (new) | unit | unit | ✅ |
| T4 | admin service (modify) | unit | unit | ✅ |
| T5 | admin route (new) | unit | unit | ✅ |
| T6 | admin-proxy route (new) | none (não listada na matriz) | none | ✅ |
| T7 | api client (modify) | none (não listada na matriz) | none | ✅ |
| T8 | admin page (modify) | none (não listada na matriz) | none | ✅ |
