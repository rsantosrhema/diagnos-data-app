# Localização da Empresa para Busca de Concorrentes Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier, discrimination sensor).

**If the skill cannot be activated, STOP and tell the user - do not proceed without it.**

---

**Design**: `.specs/features/localizacao-concorrentes/design.md`
**Status**: In Progress

---

## Test Coverage Matrix

> Generated from codebase, project guidelines, and spec - confirm before Execute. Guidelines found: `AGENTS.md` §7 (unit tests para services, scoring, contract, schemas; testes de componente `*.test.tsx`; mockar Supabase e e-mail), §12 (Definition of Done), `package.json` scripts. Baseline: 499 testes passando, 1 smoke-e2e pulado.

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| ---------- | ------------------ | -------------------- | ---------------- | ----------- |
| Service (lead, localidades, screen, portal, analysis, admin) | unit | Todos os ramos; 1:1 com os ACs; cada edge case listado tem teste | `src/lib/service/*.test.ts` | `npm run test` |
| Agents (researcher, analyst) | unit | Query e prompt com e sem localização; sanitização | `src/lib/agents/*.test.ts` | `npm run test` |
| Schema / DTO / payload | unit | Aceita válido, rejeita inválido (UF, `<`, tamanho), aceita payload antigo | `src/lib/schemas/*.test.ts`, `src/lib/dto/*.test.ts`, `src/lib/screener/*.test.ts` | `npm run test` |
| Route (internal e proxy) | unit | Happy + 400 + 401 + 502 | `src/app/api/**/route.test.ts` | `npm run test` |
| Repository | unit | Colunas selecionadas, `create` e `updateLocation`, erro propagado | `src/lib/repository/*.test.ts` | `npm run test` |
| Component / page | unit | Estados do formulário (UF → Cidade, limpeza, fallback, erros) e exibição com e sem localização | `src/**/*.test.tsx` | `npm run test` |
| Middleware | unit | Limite da nova rota | `src/middleware.test.ts` | `npm run test` |
| Migration / docs / tipos | none | - (build gate only) | - | build gate |

## Gate Check Commands

> Generated from codebase - confirm before Execute.

| Gate Level | When to Use | Command |
| ---------- | ----------- | ------- |
| Quick | After tasks with unit tests only | `npm run test` |
| Build | After phase completion or config/entity-only tasks | `npm run typecheck && npm run test && npm run build` |

Notes:
- `npm run lint` roda sem prompt neste repo e devolve só warnings antigos de fontes; incluir no gate de fim de fase.
- A migration `0018` é aplicada ao Supabase pelo usuário. Aplicar em produção exige autorização explícita (blast radius). O código lê `city`/`state`, então a migration precisa estar aplicada antes do deploy.

---

## Execution Plan

Phases are ordered and run sequentially - each phase completes before the next begins, and tasks within a phase execute in order.

### Phase 1: Cadastro e persistência

```
T1 → T2 → T3 → T4 → T5 → T6 → T7
```

### Phase 2: API de municípios

```
T8 → T9 → T10 → T11 → T12
```

### Phase 3: Formulário da landing

```
T13 → T14 → T15
```

### Phase 4: Agentes

```
T16 → T17 → T18 → T19 → T20
```

### Phase 5: Exibição no portal e no PDF

```
T21 → T22 → T23 → T24 → T25 → T26 → T27
```

---

## Task Breakdown

### T1: Constante das 27 UFs

**What**: Criar `ESTADOS` (sigla e nome) e a tupla `UF_SIGLAS` para `z.enum`.
**Where**: `src/lib/localidades/estados.ts`
**Depends on**: None
**Reuses**: -
**Requirement**: LOC-01, LOC-05

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Implementado conforme o design
- [x] Testes escritos conforme a matriz, derivados dos ACs citados
- [x] Gate passa: `npm run test`
- [x] Contagem de testes não diminui (sem remoções silenciosas)

**Tests**: unit
**Gate**: quick

**Commit**: `feat(localidades): constante das 27 UFs`

---

### T2: Migration de city e state em leads

**What**: Adicionar `city` e `state` nullable a `leads`, com `check` das 27 UFs em `state`.
**Where**: `supabase/migrations/0018_lead_location.sql`
**Depends on**: T1
**Reuses**: `supabase/migrations/0017_analysis_queue_cancel.sql` (estilo)
**Requirement**: LOC-04

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Implementado conforme o design
- [x] Gate passa: `npm run typecheck && npm run test && npm run build`
- [x] Contagem de testes não diminui (sem remoções silenciosas)

**Tests**: none
**Gate**: build

**Commit**: `feat(db): colunas city e state em leads`

---

### T3: Documentar colunas no data-model

**What**: Registrar `city` e `state` em `leads` no schema vivo.
**Where**: `docs/data-model.md`
**Depends on**: T2
**Reuses**: -
**Requirement**: LOC-04

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Implementado conforme o design
- [x] Gate passa: `npm run typecheck && npm run test && npm run build`
- [x] Contagem de testes não diminui (sem remoções silenciosas)

**Tests**: none
**Gate**: build

**Commit**: `docs(data-model): city e state em leads`

---

### T4: Estender leadSchema com state e city

**What**: `state: z.enum(UF_SIGLAS)`, `city` de 2 a 80 caracteres sem `<`/`>`, mantendo `.strict()`; mensagens de erro em português.
**Where**: `src/lib/schemas/lead.ts`
**Depends on**: T3
**Reuses**: `src/lib/schemas/lead.ts`
**Requirement**: LOC-03, LOC-05

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Implementado conforme o design
- [x] Testes escritos conforme a matriz, derivados dos ACs citados
- [x] Gate passa: `npm run test`
- [x] Contagem de testes não diminui (sem remoções silenciosas)

**Tests**: unit
**Gate**: quick

**Commit**: `feat(leads): validar estado e cidade no schema`

---

### T5: Persistir e ler localização no lead-repo

**What**: `create` grava `city`/`state`; `findById` e `findByEmail` selecionam as colunas; novo `updateLocation(id, { city, state })`.
**Where**: `src/lib/repository/lead-repo.ts`
**Depends on**: T4
**Reuses**: padrão do repo (supabase mockado)
**Requirement**: LOC-04, LOC-07

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Implementado conforme o design
- [x] Testes escritos conforme a matriz, derivados dos ACs citados
- [x] Gate passa: `npm run test`
- [x] Contagem de testes não diminui (sem remoções silenciosas)

**Tests**: unit
**Gate**: quick

**Commit**: `feat(leads): repositório com cidade e estado`

---

### T6: Lead service com localização

**What**: `createLead` recebe `city`/`state`; no ramo de lead pendente reaproveitado chama `updateLocation` antes de devolver o id; concluído continua 409.
**Where**: `src/lib/service/lead-service.ts`
**Depends on**: T5
**Reuses**: `src/lib/service/lead-service.test.ts`
**Requirement**: LOC-04, LOC-07

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Implementado conforme o design
- [x] Testes escritos conforme a matriz, derivados dos ACs citados
- [x] Gate passa: `npm run test`
- [x] Contagem de testes não diminui (sem remoções silenciosas)

**Tests**: unit
**Gate**: quick

**Commit**: `feat(leads): service grava e atualiza localização`

---

### T7: Rota /api/leads com state e city

**What**: Repassar `city` (via `sanitizeText`) e `state` ao service; 400 com `issues` quando inválidos.
**Where**: `src/app/api/leads/route.ts`
**Depends on**: T6
**Reuses**: `src/app/api/admin/portal/[leadId]/route.test.ts` (estilo de teste de rota)
**Requirement**: LOC-04, LOC-05

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Implementado conforme o design
- [x] Testes escritos conforme a matriz, derivados dos ACs citados
- [x] Gate passa: `npm run test`
- [x] Contagem de testes não diminui (sem remoções silenciosas)

**Tests**: unit
**Gate**: quick

**Commit**: `feat(leads): rota recebe estado e cidade`

---

### T8: Serviço de municípios do IBGE

**What**: `listMunicipios(uf)` com cache de 24 h, timeout de 4 s, validação do payload com Zod e `LocalidadesServiceError(502)` em falha.
**Where**: `src/lib/service/localidades-service.ts`
**Depends on**: None (fase anterior concluída)
**Reuses**: padrão de erro tipado dos services
**Requirement**: LOC-06, LOC-08

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Implementado conforme o design
- [x] Testes escritos conforme a matriz, derivados dos ACs citados
- [x] Gate passa: `npm run test`
- [x] Contagem de testes não diminui (sem remoções silenciosas)

**Tests**: unit
**Gate**: quick

**Commit**: `feat(localidades): service de municípios com cache`

---

### T9: Proxy repassa a query string

**What**: `proxyToInternal` anexa `search` do request ao `targetUrl`, sem alterar POSTs.
**Where**: `src/lib/auth/proxy.ts`
**Depends on**: T8
**Reuses**: `src/lib/auth/proxy.test.ts`
**Requirement**: LOC-08

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Implementado conforme o design
- [x] Testes escritos conforme a matriz, derivados dos ACs citados
- [x] Gate passa: `npm run test`
- [x] Contagem de testes não diminui (sem remoções silenciosas)

**Tests**: unit
**Gate**: quick

**Commit**: `fix(proxy): repassar query string à rota interna`

---

### T10: Rota interna /api/localidades

**What**: `GET ?uf=` valida a UF com Zod, exige chave interna, responde `{ municipios }`, 400 e 502.
**Where**: `src/app/api/localidades/route.ts`
**Depends on**: T9
**Reuses**: `verifyInternalApiKey`
**Requirement**: LOC-06, LOC-08

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Implementado conforme o design
- [x] Testes escritos conforme a matriz, derivados dos ACs citados
- [x] Gate passa: `npm run test`
- [x] Contagem de testes não diminui (sem remoções silenciosas)

**Tests**: unit
**Gate**: quick

**Commit**: `feat(localidades): rota interna de municípios`

---

### T11: Proxy público de localidades

**What**: Rota GET que chama `proxyToInternal` com target `localidades`.
**Where**: `src/app/api/public-proxy/localidades/route.ts`
**Depends on**: T10
**Reuses**: `src/app/api/public-proxy/screener/route.ts`
**Requirement**: LOC-08

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Implementado conforme o design
- [x] Testes escritos conforme a matriz, derivados dos ACs citados
- [x] Gate passa: `npm run test`
- [x] Contagem de testes não diminui (sem remoções silenciosas)

**Tests**: unit
**Gate**: quick

**Commit**: `feat(localidades): proxy público de municípios`

---

### T12: Rate limit de localidades

**What**: Incluir `/api/public-proxy/localidades` em `RATE_LIMITED_PATHS` e `RATE_LIMITS` (60 por minuto).
**Where**: `src/middleware.ts`
**Depends on**: T11
**Reuses**: `src/middleware.test.ts`
**Requirement**: LOC-08

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Implementado conforme o design
- [x] Testes escritos conforme a matriz, derivados dos ACs citados
- [x] Gate passa: `npm run test`
- [x] Contagem de testes não diminui (sem remoções silenciosas)

**Tests**: unit
**Gate**: quick

**Commit**: `feat(localidades): rate limit na rota de municípios`

---

### T13: Client: getMunicipios e LeadInput

**What**: Adicionar `city`/`state` a `LeadInput` e `getMunicipios(uf)` via proxy.
**Where**: `src/lib/api/client.ts`
**Depends on**: None (fase anterior concluída)
**Reuses**: `submitLead`
**Requirement**: LOC-02, LOC-06

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Implementado conforme o design
- [x] Testes escritos conforme a matriz, derivados dos ACs citados
- [x] Gate passa: `npm run test`
- [x] Contagem de testes não diminui (sem remoções silenciosas)

**Tests**: unit
**Gate**: quick

**Commit**: `feat(api): client de municípios e localização no lead`

---

### T14: lead-storage com localização

**What**: `StoredLead` ganha `city` e `state` opcionais, lidos com o mesmo parse defensivo.
**Where**: `src/lib/lead-storage.ts`
**Depends on**: T13
**Reuses**: `readStoredLead`
**Requirement**: LOC-01

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Implementado conforme o design
- [x] Testes escritos conforme a matriz, derivados dos ACs citados
- [x] Gate passa: `npm run test`
- [x] Contagem de testes não diminui (sem remoções silenciosas)

**Tests**: unit
**Gate**: quick

**Commit**: `feat(leads): localização no armazenamento da sessão`

---

### T15: Selects de Estado e Cidade na landing

**What**: Select de UF, select de Cidade dependente (desabilitado sem UF, limpo ao trocar a UF), fallback de texto livre se o IBGE falhar, validação obrigatória no client.
**Where**: `src/app/page.tsx`
**Depends on**: T14
**Reuses**: `src/app/diagnostico/page.test.tsx` (estilo), `rd-input`
**Requirement**: LOC-01, LOC-02, LOC-03, LOC-06

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Implementado conforme o design
- [x] Testes escritos conforme a matriz, derivados dos ACs citados
- [x] Gate passa: `npm run test`
- [x] Contagem de testes não diminui (sem remoções silenciosas)

**Tests**: unit
**Gate**: quick

**Commit**: `feat(landing): estado e cidade no cadastro`

---

### T16: agentPayloadSchema com localização

**What**: `empresa.cidade` e `empresa.estado` como `z.string().nullable().optional()`.
**Where**: `src/lib/schemas/agent-payload.ts`
**Depends on**: None (fase anterior concluída)
**Reuses**: `src/lib/schemas/agent-payload.test.ts`
**Requirement**: LOC-14

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Implementado conforme o design
- [x] Testes escritos conforme a matriz, derivados dos ACs citados
- [x] Gate passa: `npm run test`
- [x] Contagem de testes não diminui (sem remoções silenciosas)

**Tests**: unit
**Gate**: quick

**Commit**: `feat(agents): schema do payload com cidade e estado`

---

### T17: buildAgentPayload com location

**What**: Parâmetro `location` e campos `empresa.cidade`/`empresa.estado` (nulos sem localização).
**Where**: `src/lib/screener/agent-payload.ts`
**Depends on**: T16
**Reuses**: `src/lib/screener/agent-payload.test.ts`
**Requirement**: LOC-09

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Implementado conforme o design
- [x] Testes escritos conforme a matriz, derivados dos ACs citados
- [x] Gate passa: `npm run test`
- [x] Contagem de testes não diminui (sem remoções silenciosas)

**Tests**: unit
**Gate**: quick

**Commit**: `feat(agents): payload leva cidade e estado do lead`

---

### T18: screen-service injeta a localização

**What**: No ramo com `leadId` passa `{ cidade: lead.city, estado: lead.state }`; no fallback por e-mail passa nulos.
**Where**: `src/lib/service/screen-service.ts`
**Depends on**: T17
**Reuses**: `src/lib/service/screen-service.test.ts`
**Requirement**: LOC-09, LOC-14

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Implementado conforme o design
- [x] Testes escritos conforme a matriz, derivados dos ACs citados
- [x] Gate passa: `npm run test`
- [x] Contagem de testes não diminui (sem remoções silenciosas)

**Tests**: unit
**Gate**: quick

**Commit**: `feat(screener): injetar localização do lead no payload`

---

### T19: Researcher com query de concorrentes regional

**What**: Com nome, cidade e UF, a query de `concorrentes` inclui a região (sanitizada); sem cidade ou UF, permanece a query atual.
**Where**: `src/lib/agents/researcher.ts`
**Depends on**: T18
**Reuses**: `sanitizeUntrusted`, `src/lib/agents/researcher.test.ts`
**Requirement**: LOC-10, LOC-11, LOC-13

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Implementado conforme o design
- [x] Testes escritos conforme a matriz, derivados dos ACs citados
- [x] Gate passa: `npm run test`
- [x] Contagem de testes não diminui (sem remoções silenciosas)

**Tests**: unit
**Gate**: quick

**Commit**: `feat(agents): busca de concorrentes por cidade e estado`

---

### T20: Analyst com regra de relevância regional

**What**: Com localização, o prompt manda priorizar concorrentes da cidade/UF e sinalizar os de outra região; sem localização o prompt não muda; valores sanitizados.
**Where**: `src/lib/agents/analyst.ts`
**Depends on**: T19
**Reuses**: `src/lib/agents/analyst.test.ts`
**Requirement**: LOC-12, LOC-13

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Implementado conforme o design
- [x] Testes escritos conforme a matriz, derivados dos ACs citados
- [x] Gate passa: `npm run test`
- [x] Contagem de testes não diminui (sem remoções silenciosas)

**Tests**: unit
**Gate**: quick

**Commit**: `feat(agents): analyst prioriza concorrentes da região`

---

### T21: GeneratePdfInput com localização

**What**: Campo opcional `location?: { city: string; state: string }` no tipo.
**Where**: `src/lib/service/screen-service.ts`
**Depends on**: None (fase anterior concluída)
**Reuses**: -
**Requirement**: LOC-16

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Implementado conforme o design
- [x] Gate passa: `npm run typecheck && npm run test && npm run build`
- [x] Contagem de testes não diminui (sem remoções silenciosas)

**Tests**: none
**Gate**: build

**Commit**: `feat(report): tipo de entrada do PDF com localização`

---

### T22: portalDTOSchema com city e state

**What**: `lead.city` e `lead.state` como `nullable().optional()`, mantendo `.strict()`.
**Where**: `src/lib/dto/portal.ts`
**Depends on**: T21
**Reuses**: `src/lib/dto/portal.test.ts`
**Requirement**: LOC-15, LOC-18

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Implementado conforme o design
- [x] Testes escritos conforme a matriz, derivados dos ACs citados
- [x] Gate passa: `npm run test`
- [x] Contagem de testes não diminui (sem remoções silenciosas)

**Tests**: unit
**Gate**: quick

**Commit**: `feat(portal): city e state no DTO`

---

### T23: portal-service preenche a localização

**What**: Preencher `lead.city`/`lead.state` a partir do lead nos DTOs do gerente e público; nenhum outro dado novo no público.
**Where**: `src/lib/service/portal-service.ts`
**Depends on**: T22
**Reuses**: `src/lib/service/portal-service.test.ts`
**Requirement**: LOC-15, LOC-18

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Implementado conforme o design
- [x] Testes escritos conforme a matriz, derivados dos ACs citados
- [x] Gate passa: `npm run test`
- [x] Contagem de testes não diminui (sem remoções silenciosas)

**Tests**: unit
**Gate**: quick

**Commit**: `feat(portal): service expõe cidade e estado do lead`

---

### T24: DiagnosticPortal mostra Cidade/UF

**What**: Linha com `{city}/{state}` junto ao nome do solicitante nos dois modos; omitida sem localização.
**Where**: `src/components/portal/DiagnosticPortal.tsx`
**Depends on**: T23
**Reuses**: `src/components/portal/DiagnosticPortal.test.tsx`
**Requirement**: LOC-15, LOC-17

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Implementado conforme o design
- [x] Testes escritos conforme a matriz, derivados dos ACs citados
- [x] Gate passa: `npm run test`
- [x] Contagem de testes não diminui (sem remoções silenciosas)

**Tests**: unit
**Gate**: quick

**Commit**: `feat(portal): exibir cidade e estado da empresa`

---

### T25: PDF mostra Cidade/UF na capa

**What**: `reportHeader` ganha item `{city}/{state}` quando `input.location` existe; omitido sem localização.
**Where**: `src/lib/report/report-generator.ts`
**Depends on**: T24
**Reuses**: `metaItem`, `src/lib/report/report-generator.test.ts`
**Requirement**: LOC-16, LOC-17

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Implementado conforme o design
- [x] Testes escritos conforme a matriz, derivados dos ACs citados
- [x] Gate passa: `npm run test`
- [x] Contagem de testes não diminui (sem remoções silenciosas)

**Tests**: unit
**Gate**: quick

**Commit**: `feat(report): cidade e estado na capa do PDF`

---

### T26: analysis-service passa a localização ao PDF

**What**: Montar `location` a partir do lead ao chamar o gerador do worker.
**Where**: `src/lib/service/analysis-service.ts`
**Depends on**: T25
**Reuses**: `src/lib/service/analysis-service.test.ts`
**Requirement**: LOC-16

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Implementado conforme o design
- [ ] Testes escritos conforme a matriz, derivados dos ACs citados
- [ ] Gate passa: `npm run test`
- [ ] Contagem de testes não diminui (sem remoções silenciosas)

**Tests**: unit
**Gate**: quick

**Commit**: `feat(analysis): PDF do worker recebe localização`

---

### T27: admin-service passa a localização ao PDF

**What**: Montar `location` a partir do lead em `getReportPdf`.
**Where**: `src/lib/service/admin-service.ts`
**Depends on**: T26
**Reuses**: `src/lib/service/admin-service.test.ts`
**Requirement**: LOC-16

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Implementado conforme o design
- [ ] Testes escritos conforme a matriz, derivados dos ACs citados
- [ ] Gate passa: `npm run test`
- [ ] Contagem de testes não diminui (sem remoções silenciosas)

**Tests**: unit
**Gate**: quick

**Commit**: `feat(admin): PDF exportado recebe localização`

---
