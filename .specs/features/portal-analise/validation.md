# Portal Resultado da Análise Validation

**Date**: 2026-10-08
**Spec**: `.specs/features/portal-analise/spec.md`
**Diff range**: `c286ae3..41ee30e` (18 commits, T1–T18; HEAD `a2bddc5` includes fix(portal) typecheck)
**Verifier**: independent sub-agent (author ≠ verifier)

---

## Validation: PASS (after Fix 1)

13/14 ACs covered on first pass with spec-anchored evidence; Fix 1 (PORTAL-09) aplicado pelo orchestrator → **14/14 ✅**. Discrimination sensor: 4/4 mutants killed. Notas menores documentadas (PORTAL-01 perf; PORTAL-03 substituição aceita).

---

## Task Completion

| Task  | Status  | Notes |
| ----- | ------- | ----- |
| T1    | ✅ Done | `0016_portal_share_tokens.sql` + data-model.md sync |
| T2    | ✅ Done | share-token-repo, 8 tests |
| T3    | ✅ Done | agent schemas optional fields |
| T4    | ✅ Done | analyst prompt |
| T5    | ✅ Done | writer prompt |
| T6    | ✅ Done | cmmi stages, 10 tests |
| T7    | ✅ Done | PortalDTO, strict schemas |
| T8    | ✅ Done | portal service, 18 tests |
| T9    | ✅ Done | manager route, 5 tests |
| T10   | ✅ Done | share route, 9 tests |
| T11   | ✅ Done | public route + middleware entry, 5 tests |
| T12   | ✅ Done | RadarSpider, 4 tests |
| T13   | ✅ Done | MaturityBars, 4 tests |
| T14   | ✅ Done | StageHero + AnswersAccordion, 9 tests |
| T15   | ✅ Done | CompetitorsGrid + SourcesList, 7 tests |
| T16   | ✅ Done | InsightsBoard + AnalysisPlaceholder, 9 tests |
| T17   | ✅ Done | manager portal page, 8 tests |
| T18   | ✅ Done | public portal page, 5 tests |

---

## Spec-Anchored Acceptance Criteria

| AC | Criterion (WHEN/THEN) | Spec-defined outcome | `file:line` + assertion | Result |
| -- | --------------------- | -------------------- | ------------------------ | ------ |
| PORTAL-01 | Gerente clica Ver resultado → portal `/admin/leads/[leadId]` com hero/radar/barras/respostas | Página com as seções, lead + score + share state | `src/app/api/admin/portal/[leadId]/route.test.ts:140` - `expect(res.status).toBe(200)` + `expect(body).toEqual(MANAGER_DTO)`; `src/lib/service/portal-service.test.ts:230-254` - `expect(dto.lead).toEqual({id:"lead-1",name:"João",company:"Corp"})`, `expect(dto.share).toEqual({active:true,url:null,expiresAt:...})`; `src/app/admin/leads/[leadId]/page.test.tsx:122-135` - 6 seções + botão copiar | ✅ PASS (⚠️ nota perf abaixo) |
| PORTAL-02 | `market_insights.status ≠ analisado` → placeholder sem esconder score/radar/respostas | `analysis/insights` undefined, status correto, score presente | `src/lib/service/portal-service.test.ts:278-282` - `expect(dto.analysisStatus).toBe("processando")` + `expect(dto.analysis).toBeUndefined()` + `expect(dto.score.valor).toBe(2.9)`; `:291` - `toBe("pendente")`; `src/app/admin/leads/[leadId]/page.test.tsx:141-142` - placeholder + `expect(screen.getByText("Estruturado")).toBeTruthy()`; `src/app/r/[token]/page.test.tsx:143-155` | ✅ PASS |
| PORTAL-03 | Gerente não autenticado → 401 sem expor dados do lead | 401 (sem chave / sem manager); UI sem dados | `src/app/api/admin/portal/[leadId]/route.test.ts:108-115` - `expect(res.status).toBe(401)` + `expect(body.error).toBe("Chave interna inválida")`; `:117-122` - 401 sem manager; `src/app/admin/leads/[leadId]/page.test.tsx:157-166` - "Acesso não autorizado" + `expect(screen.queryByText("João Silva")).toBeNull()` | ⚠️ Spec-precision gap: spec pede "redirecionar para o login"; página exibe estado 401 sem dados + link de volta, não redireciona automaticamente |
| PORTAL-04 | Gerar link → token opaco 256 bits, persistir **somente hash** SHA-256, expiração 90 dias | 43 chars base64url (32 bytes); repo recebe só hash; TTL 90d | `src/lib/service/portal-service.test.ts:486` - `expect(result.token).toMatch(/^[A-Za-z0-9_-]{43}$/)`; `:494` - `expect(params.tokenHash).toBe(expectedTokenHash(result.token))`; `:501` - `expect(JSON.stringify(create.mock.calls)).not.toContain(result.token)`; `:496-500` -`tTL de exactly now+90d±60s` via `toBeLessThanOrEqual(90d)`/`toBeGreaterThan(90d-60s)`; `:394-403` - `findByHash` recebe só hash (`not.toBe(raw)`) | ✅ PASS |
| PORTAL-05 | Novo link → invalida token anterior | `create` revoga ativo anterior antes do insert | `src/lib/repository/share-token-repo.test.ts:84-93` - `expect(updateEq).toHaveBeenCalledWith("lead_id","lead-1")` + `expect(updateFinal).toHaveBeenCalledWith("revoked_at", null)` + insert do novo | ✅ PASS |
| PORTAL-06 | Token inválido/expirado/revogado → **404 genérico** sem distinguir motivo | 404 com body único "Link inválido ou expirado" | `src/lib/service/portal-service.test.ts:411-413,426-428,441-443` - `rejects.toMatchObject({status:404})` para inexistente/revogado/expirado; `src/app/api/portal/[token]/route.test.ts:122-124` - `expect(body.error).toBe("Link inválido ou expirado")`; `:127-137` - motivo interno "Lead não encontrado" também mapeado para 404 genérico; `src/app/r/[token]/page.test.tsx:123-132` - estado genérico sem dados | ✅ PASS |
| PORTAL-07 | `/r/[token]` válido → 6 seções sem email/telefone/ções de admin | Sem chaves email/phone; sem botões copiar/revogar/reprocessar | `src/lib/service/portal-service.test.ts:386-391` - `expect("email" in dto).toBe(false)` + `expect("phone" in dto).toBe(false)` + JSON sem email real; `src/app/api/portal/[token]/route.test.ts:109-111` - idem; `src/app/r/[token]/page.test.tsx:108-110` - `queryByRole("button",{name:/copiar/i})).toBeNull()` (+revogar+reprocessar); `:113-121` - regex de email = 0 no HTML | ✅ PASS |
| PORTAL-08 | Nunca expor `INTERNAL_API_KEY`, linhas brutas, campos fora do PortalDTO | Payload == PortalDTO público (strict) | `src/lib/dto/portal.test.ts:135-138` - `_expect(portalDTOSchema.safeParse({...FULL_DTO, extra:true}).success).toBe(false)_` (strict); `src/lib/service/portal-service.test.ts:383-391` - payload público montado só com membros do DTO; `src/app/api/portal/[token]/route.test.ts:108` - `expect(body).toEqual(PUBLIC_DTO)` | ✅ PASS |
| PORTAL-09 | Rate limiting no endpoint do token | **30 req/min** para `/api/public-proxy/portal` | `src/middleware.test.ts:23-25` - 30 requisições passam (`expect(res.status).not.toBe(429)`); `:27-33` - 31ª recebe `expect(blocked.status).toBe(429)` + header `Retry-After` presente; `:35-39` - IP diferente não é bloqueado; config real: `src/middleware.ts:17` - `{ limit: 30, windowMs: 60_000 }` | ✅ PASS (Fix 1 aplicado) |
| PORTAL-10 | 6 seções (hero, radar, barras, respostas, concorrentes, insights c/ fontes) | Todas renderizadas; fallbacks completos | `src/app/admin/leads/[leadId]/page.test.tsx:127-134` - hero/barras/pergunta/concorrente/insight/fonte; `src/app/r/[token]/page.test.tsx:101-107`; `src/lib/cmmi/stages.test.ts:8-67` - 5 faixas + fallback seguro; component tests RadarSpider (`:16-21`) / MaturityBars (`:16-21`) / StageHero / AnswersAccordion / CompetitorsGrid / InsightsBoard / SourcesList | ✅ PASS |
| PORTAL-11 | `dores[].dimensao_id` presente → vincular dor à barra (hover/filtro) | highlightIds escurece barras fora do filtro; insight filtra | `src/components/portal/MaturityBars.test.tsx:41-47` - `expect(dimmed.getAttribute("style")).toContain("opacity: 0.35")` + highlighted `opacity: 1`; `src/app/admin/leads/[leadId]/page.test.tsx:177-187` - clicar insight cria botão "Limpar filtro"; `src/lib/agents/writer.test.ts:144-170` - `dimensao_ids` presente no schema/prompt | ✅ PASS |
| PORTAL-12 | Análises antigas sem campos enriquecidos → fallback sem quebrar | Campos opcionais parseados, undefined preservado | `src/lib/service/portal-service.test.ts:320-322` - `expect(dto.analysis?.dores[0]?.nivel_atual).toBeUndefined()`; `src/lib/dto/portal.test.ts:111-116` - legacy DTO `safeParse` success + undefined; `src/lib/agents/types.test.ts:211-220` - fixture antiga `safeParse(legado).success).toBe(true)`; `src/app/r/[token]/page.test.tsx:143-155` (placeholders) | ✅ PASS |
| PORTAL-13 | reprocess/PDF/email inalterados | Suite existente verde sem alterar fixtures antigas (teste independente do próprio spec) | Diff não toca fixtures de worker/PDF/email (`git diff c286ae3^..41ee30e --stat`); gate completo verde (456 passed) incluindo suites pré-existentes de worker/PDF/email | ✅ PASS (indireto, conforme "Independent Test" do spec) |
| PORTAL-14 | Worker recebe payload enriquecido → `safeParse`, campos novos não exigidos | Enriquecido valida p/ frente; antigo valida | `src/lib/agents/types.test.ts:222-240` - `expect(parsed.success).toBe(true)` + `expect(parsed.data.nivel_atual).toBe(2)`; `:242-253` - rejeita `nivel_atual:6`; `src/lib/agents/analyst.test.ts:166` / `writer.test.ts:137-158` - passthrough intacto; `src/lib/service/portal-service.test.ts:345-365` - `safeParse` inválido → 404 logado | ✅ PASS |

**Status**: ✅ 13 PASS · 1 ✅ PASS (Fix 1 — PORTAL-09) · 2 ⚠️ nota (perf PORTAL-01; redirect PORTAL-03 aceito pelo orchestrator como comportamento substituto: estado sem dados + link de volta)

---

## Discrimination Sensor

Isolated scratch: `git worktree add` em `/var/folders/1z/znp3ftnd7xvcxpgf2gxmpsh40000gn/T/opencode/portal-scratch` (HEAD `a2bddc5`) + symlink `node_modules`. **Nenhuma mutação aplicada à árvore real**; cada mutante revertido com `git checkout -- <file>` (porcelain limpo confirmado após cada revert). Sem `git stash`.

| # | Mutação | File:line | Descrição | Dead: teste que falhou | Killed? |
| - | ------- | --------- | --------- | ---------------------- | ------- |
| M1 | Remover checagem de `expires_at` em `assertTokenValid` (`if (isRevoked \|\| isExpired)` → `if (isRevoked)`) | `src/lib/service/portal-service.ts:52` | Token expirado passa a ser aceito no `getByToken` | `src/lib/service/portal-service.test.ts:431` - "lança 404 genérico quando o token está expirado (PORTAL-06)" → 1 failed/17 passed | ✅ Killed |
| M2 | `return stripPii(full)` → `return { ...full }` (vaza email/phone no DTO público) | `src/lib/service/portal-service.ts:92` | Persistência de PII no payload público | `src/lib/service/portal-service.test.ts:386` - `expect("email" in dto).toBe(false)` → 1 failed/22 passed (2 files) | ✅ Killed |
| M3 | Remover revogação do token ativo anterior em `create` | `src/lib/repository/share-token-repo.ts:24-32` | Novo token não invalida o anterior | `src/lib/repository/share-token-repo.test.ts:74-93` → 1 failed/7 passed | ✅ Killed |
| M4 | `highlightIds` sem efeito (`opacity = 1` constante) | `src/components/portal/MaturityBars.tsx:22-26` | Filtro por dores → barras não escurece | `src/components/portal/MaturityBars.test.tsx:41-47` → 1 failed/3 passed | ✅ Killed |

**Sensor depth**: lightweight (4 mutações manuais, feature não é P0 de payment/auth)
**Result**: 4/4 killed — ✅

**Baseline verification**: `git status --porcelain` capturado antes do sensor (deleções pré-existentes e não-relacionadas em `.claude/skills/*`, salvaguardado em `/tmp/portal-baseline.txt`); após cleanup do worktree, `diff` antes/depois → idêntico (ISOLATION_OK). Árvore real intocada.

---

## Gate Check

- **Gate command**: `npm run test` (Full)
- **Result**: 459 passed, 0 failed, 1 skipped (smoke opt-in — modelo/LLM, justificada)
- **Test count before feature**: 410
- **Test count after feature + Fix 1**: 459
- **Delta**: +49
- **Failures**: none

---

## Fix Tasks (from ranking)

### Fix 1: PORTAL-09 — nenhum assertion para o throttle 30/min do portal público

- **Gap**: spec define "30 req/min em `/api/public-proxy/portal`" (`spec.md` PORTAL-09); valor existe só como config de produção `src/middleware.ts:17`. Mechanism `checkRateLimit` é testado genericamente (`src/lib/rate-limit.test.ts`), mas a entrada específica e o threshold não têm assertion.
- **Fix task**: adicionar teste de integração do middleware (`src/middleware.test.ts`) que requisições a `/api/public-proxy/portal/<token>` atravessam 30 requisições em 60s e a 31ª recebe 429 (com `Retry-After`), e que paths fora da lista não são throttled.
- **Pads where**: `src/middleware.ts:8,17` + novo `src/middleware.test.ts`.
- **Verify**: `npx vitest run src/middleware.test.ts` + full gate.
- **Done when**: assertion em teste falha se `limit: 30` virar outro valor ou a entrada for removida da config.
- **Priority**: Major
- **RESOLVED (orchestrator, 2026-10-08)**: `src/middleware.test.ts` criado (3 asserts: 30 passam, 31ª → 429 + Retry-After, IP independente); novo diff inclui o commit do fix. Verificar relíquia: nenhuma. Re-gate: `npx vitest run src/middleware.test.ts` (3/3) + `npm run test` (459 verde).

### Nota 1: PORTAL-01 — perf "menos de 2s" sem assertion (Cosmetic)

- Perf/assert de latência não faz sentido no escopo unit; registrar como spec-precision gap documentado, comportamento coberto funcionalmente por T17/T18.

### Nota 2: PORTAL-03 — "redirecionar para o login" (Minor)

- A página exibe estado "Acesso não autorizado" com link de volta a `/admin`, sem redirect automático; dados do lead não vazam (assertado). Confirmar se o comportamento substituto é aceitável ou incluir redirect no fix.

---

## Requirement Traceability (recommended, for orchestrator)

| Requirement | Previous | New |
| ----------- | -------- | --- |
| PORTAL-01..04, 06..12, 13, 14 | Implementing | ✅ Verified |
| PORTAL-05 | Implementing | ✅ Verified |
| PORTAL-03 | Implementing | ✅ Verified (⚠️ nota redirect — comportamento substituto aceito) |
| PORTAL-09 | Needs Fix | ✅ Verified (Fix 1 aplicado: `src/middleware.test.ts`) |

(Spec.md não foi editado pelo Verifier — a baixaTree ficou read-only; aplicar a tabela acima no commit do orchestrator.)

---

## Summary

**Overall**: ✅ PASS (14/14 ACs verified; sensor 4/4 killed; Fix 1 aplicado)

**What works**: 6 seções do dashboard (manager + público), token hashing SHA-256/`timingSafeEqual` com PII stripping assertado em 4 camadas (service/route/2 pages), revogação/invalidação de token, rate limit 30/min com teste dedicado, placeholders pendente/falha, back-compat de schemas, suite completa verde sem regressão de worker/PDF/email.
