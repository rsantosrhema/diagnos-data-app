# Relatório Sob Demanda Validation

**Date**: 2026-08-31
**Spec**: `.specs/features/relatorio-sob-demanda/spec.md`
**Diff range**: ab204e2
**Verifier**: independent sub-agent (author ≠ verifier)

---

## Task Completion

| Task | Status     | Notes   |
| ---- | ---------- | ------- |
| T1   | ✅ Done    | Disparo fire-and-forget no reprocess; route + 11 testes co-locados (route.ts +25, route.test.ts +66) |

---

## Spec-Anchored Acceptance Criteria

| Criterion (WHEN X THEN Y) | Spec-defined outcome | `file:line` + assertion | Result |
| ------------------------- | -------------------- | ----------------------- | ------ |
| REL-01: WHEN gerente chama `POST /api/admin/analysis/reprocess` com leadId válido/enfileirável THEN enfileira E dispara em background `POST /api/analysis-worker` com `INTERNAL_API_KEY` | `POST` para `${base}/api/analysis-worker` com header `x-internal-api-key` = `INTERNAL_API_KEY`, após `generateReport` enfileirar | `src/app/api/admin/analysis/reprocess/route.test.ts:151` - `expect(url).toBe("http://localhost/api/analysis-worker")`; `:152` - `expect(init?.method).toBe("POST")`; `:154` - `expect(headers["x-internal-api-key"]).toBe(process.env.INTERNAL_API_KEY)` | ✅ PASS |
| REL-02: WHEN disparo em background é bem-sucedido THEN responde `200` com `{ ok: true, queued: true }` imediatamente | status 200; body exatamente `{ ok: true, queued: true }` | `src/app/api/admin/analysis/reprocess/route.test.ts:146` - `expect(res.status).toBe(200)`; `:148` - `expect(body).toEqual({ ok: true, queued: true })` | ✅ PASS |
| REL-03: WHILE job pendente/processando dashboard SHALL continuar mostrando status e auto-refresh reflete progresso | Sem mudança de UI; estado processando refletido pelo auto-refresh existente | Sem teste (fora do diff: nenhum arquivo de UI/admin no commit ab204e2) | ⚠️ Spec-precision gap |
| REL-04: The endpoint SHALL reutilizar `analysis-service.processNext()` existente para o pipeline (sem duplicar lógica dos agentes) | Rota de destino é `POST /api/analysis-worker` (única que chama `processNext`); não duplica lógica; base = `NEXT_PUBLIC_APP_URL` | `src/app/api/admin/analysis/reprocess/route.test.ts:165` - `expect(url).toBe("https://diagnosdata.rhemadata.com/api/analysis-worker")`; `src/app/api/admin/analysis/reprocess/route.ts:24` - `void fetch(url, ...)` dispara a rota worker | ✅ PASS |
| REL-05: WHEN dispara worker em background THEN NÃO aguarda conclusão do pipeline para responder | Resposta 200 não-await; sem await no fetch | `src/app/api/admin/analysis/reprocess/route.test.ts:146` - `expect(res.status).toBe(200)` (retorno sem aguardar pipeline); `src/app/api/admin/analysis/reprocess/route.ts:25` - `void fetch(...)` (fire-and-forget, sem `await`) | ✅ PASS |
| REL-06: IF disparo falha (rede) THEN ainda responde `200 { ok: true, queued: true }` (job fica na fila) | status 200; body `{ ok: true, queued: true }`; fetch chamado; `.catch` engole erro | `src/app/api/admin/analysis/reprocess/route.test.ts:174` - `expect(res.status).toBe(200)`; `:176` - `expect(body).toEqual({ ok: true, queued: true })`; `:177` - `expect(fetchMock).toHaveBeenCalledTimes(1)`; `src/app/api/admin/analysis/reprocess/route.ts:28` - `.catch(() => {})` | ✅ PASS |
| REL-07: IF lead já pendente/processando THEN responde `409 { error: "Relatório já está na fila ou em processamento" }` (dedup) | status 409; error = `"Relatório já está na fila ou em processamento"` | Dedup é coberto por teste existente da service (fora do diff): `src/lib/service/admin-service.test.ts:287` - `rejects.toMatchObject({ name: "AdminServiceError", status: 409 })`; mensagem exata na service: `src/lib/service/admin-service.ts:115`; no route teste, o caminho `AdminServiceError` status é mapeado via teste 400 (`route.test.ts:110-120`) e o mapeamento do erro → status é o mesmo bloco | ⚠️ Spec-precision gap (sem teste do 409 no diff) |

**Status**: ⚠️ Spec-precision gaps flagged (REL-03, REL-07 no-diff coverage) — 5/7 ACs com asserção no diff, 2 cobertos por codebase pré-existente (verificado manualmente)

---

## Discrimination Sensor

| Mutation | File:line | Description | Killed? |
| -------- | --------- | ----------- | ------- |
| 1        | `src/app/api/admin/analysis/reprocess/route.ts:75` | Removeu a chamada `dispatchWorker(req)` (mantendo o corpo do helper) | ✅ Killed — 3 testes falharam (`route.test.ts:141`, `:157`, `:169`) |
| 2        | `src/app/api/admin/analysis/reprocess/route.ts:27` | Renomeou o header `x-internal-api-key` → `x-internal-api-ke` | ✅ Killed — 3 testes falharam (`route.test.ts:141`, `:157`, `:169`) |
| 3        | `src/app/api/admin/analysis/reprocess/route.ts:24` | Trocou a base URL por `http://wrong-host.invalid/api/analysis-worker` | ✅ Killed — 2 testes falharam (`route.test.ts:141`, `:157`) |

**Sensor depth**: lightweight (1-3 mutations, high-risk new code)
**Result**: 3/3 killed - ✅ PASS
**Isolation**: sensor executado em `git worktree add` temporária (HEAD=ab204e2) com node_modules via junction e config mjs próprio; worktree removido após o sensor; `git status --porcelain` do real tree idêntico à baseline (vazio)

---

## Interactive UAT Results (if performed)

Não aplicável — feature backend-only (sem mudança de UI).

---

## Code Quality

| Principle        | Status |
| ---------------- | ------ |
| Minimum code     | ✅     |
| Surgical changes | ✅     |
| No scope creep   | ✅     |
| Matches patterns | ✅     |
| Spec-anchored outcome check (asserted values match spec) | ✅ (exceções: REL-03 e REL-07 flagged como spec-precision gap — sem asserção no diff) |
| Per-layer Coverage Expectation met (domain 1:1 ACs; routes happy+edge+error) | ✅ (route cobre happy, 401, 400 x2, 500, 200, fire-and-forget, base URL, fetch reject, sem key) |
| Every test maps to a spec requirement - no unclaimed tests | ✅ (todos os 11 testes mapeados; REPRO-x para testes pré-existentes, REL-x para novos) |
| Documented guidelines followed: `AGENTS.md` §7/§12 + `docs/rules/validation.md` | ✅ |

---

## Edge Cases

- [x] `leadId` não existe / sem diagnóstico → `400` (comportamento atual preservado; `src/lib/service/admin-service.ts:98-110` + route mapeia `AdminServiceError` → status)
- [x] `INTERNAL_API_KEY` ausente → fire-and-forget pulado, resposta segue `200` (`route.test.ts:180-189` + `route.ts:22-23`)
- [x] Dedup: worker processando mesmo lead → não duplica (`analysis_queue_enqueue` deduplica; `processNext` não re-lê job em VT — design.md; teste service 409)
- [x] Erro inesperado no reprocess → `500 { error: "Erro interno" }` (`route.test.ts:122-129`)

---

## Gate Check

- **Gate command**: reprocess route em isolamento + `npm run typecheck` (build pré-existente quebrado por webpack/WasmHash neste ambiente; lint não executável — documentado em tasks.md/AGENTS.md)
- **Result**: 2 passed, 0 failed
- **Reprocess route (isolado)**: `npx vitest run src/app/api/admin/analysis/reprocess/route.test.ts` → **11 passed (11)**
- **Typecheck**: `npm run typecheck` → **passou limpo (exit 0)**
- **Test count before feature**: 8 testes no `route.test.ts` (baseline do commit anterior)
- **Test count after feature**: 11 testes no `route.test.ts`
- **Delta**: +3 novos testes (nenhum removido/enfraquecido)
- **Skipped tests**: nenhum no arquivo alvo
- **Failures**: nenhum (no arquivo alvo; o full-suite 330 tem flaky conhecido em `analysis-worker/route.test.ts` "retorna 401 sem internal key" quando roda no full suite — passa isolado, pré-existente, fora do diff)

---

## Fix Plans (if issues found)

Nenhum — sem gaps funcionais; apenas 2 spec-precision gaps de cobertura fora do diff (REL-03 dashboard, REL-07 dedup 409), mitigados por codebase pré-existente verificado manualmente.

---

## Requirement Traceability Update

| Requirement | Previous Status | New Status   |
| ----------- | --------------- | ------------ |
| REL-01      | Pending         | ✅ Verified  |
| REL-02      | Pending         | ✅ Verified  |
| REL-03      | Pending         | ✅ Verified* |
| REL-04      | Pending         | ✅ Verified  |
| REL-05      | Pending         | ✅ Verified  |
| REL-06      | Pending         | ✅ Verified  |
| REL-07      | Pending         | ✅ Verified* |

\* Verificado por inspeção da codebase pré-existente (dashboard/admin auto-refresh e admin-service dedup 409), não por teste no diff do feature.

---

## Summary

**Overall**: ✅ Ready

**Spec-anchored check**: 5/7 ACs com asserção no diff (5 matched spec outcome) | 2 spec-precision gaps (REL-03, REL-07) cobertos fora do diff
**Sensor**: 3/3 mutations killed
**Gate**: 2 passed (11/11 reprocess route + typecheck limpo)

**What works**:
- Fire-and-forget correto: `dispatchWorker` dispara `fetch` sem `await` após `generateReport` (route.ts:75 → :25), `.catch(() => {})` engole erro (route.ts:28)
- Header exato `x-internal-api-key` com `INTERNAL_API_KEY` (route.ts:27); base = `NEXT_PUBLIC_APP_URL` (trailing slash removido) com fallback origin da request (route.ts:13-19)
- `INTERNAL_API_KEY` ausente → pula disparo mantendo 200 (route.ts:22-23)
- Sem regressão: 401/400/500 pré-existentes preservados; resposta `{ ok: true, queued: true }`
- Gate limpo: 11/11 no arquivo, typecheck exit 0

**Issues found**: Nenhum funcional. 2 spec-precision gaps:
1. REL-03 (dashboard status/auto-refresh) — nenhum teste no diff; comportamento pré-existente verificado manualmente (admin UI fora do diff)
2. REL-07 (409 dedup) — teste do 409 vive na service (`admin-service.test.ts:287`), não no route diff; mensagem exata na service (`admin-service.ts:115`)

**Next steps**: Nenhum — feature pronta. (Nota: full-suite flaky pré-existente no `analysis-worker/route.test.ts` documentado, não relacionado.)
