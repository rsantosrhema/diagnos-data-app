# Arsenal Comercial Validation

**Date**: 2026-11-24
**Spec**: `.specs/features/arsenal-comercial/spec.md`
**Diff range**: `origin/dev..HEAD` (38 commits, 53 files, HEAD `599c214` ao iniciar a verificação)
**Verifier**: independent sub-agent (author ≠ verifier)
**Verdict**: ❌ **FAIL** (ver Ranked gaps: 1 defeito de spec ARS-27/ARS-37 e 2 mutantes sobreviventes). Nenhum gate quebrado; 44 de 46 ACs com evidência e resultado conforme a spec, 2 com falha no limite do schema.

---

## Task Completion

| Task | Status | Notes |
| ---- | ------ | ----- |
| T1–T27 | ✅ Done | Todos `[x]` em `tasks.md`; commits atômicos em `git log origin/dev..HEAD` |
| F1 (chips SPIN) | ✅ Done | `2b7f368`, coberto por `arsenal-pages.test.tsx:340` |
| Test-report | ✅ Done | `test-report.md` (re-conferido abaixo, não confiado às cegas) |

---

## Gate Check

- **Comandos rodados por mim**: `npm run lint`, `npm run typecheck`, `npm run test`
- **lint**: exit 0 (3 warnings pré-existentes `@next/next/no-page-custom-font` em `src/app/layout.tsx:24,28,32`)
- **typecheck**: exit 0
- **test**: exit 0; **77 arquivos passed, 3 skipped (80); 884 testes passed, 5 skipped (889)**
- **Test count before feature**: 768 passed / 1 skipped (baseline do `spec.md`, Success Criteria); **after**: 884 passed / 5 skipped; **Delta**: +116 testes
- **Skipped (5)**, todos smokes gated por env, justificados: `arsenal-sample.smoke.test.ts` (2, `RUN_ARSENAL_SAMPLE`), `arsenal-smoke-flow.test.ts` (2, `RUN_ARSENAL_E2E`), `smoke-e2e-flow.test.ts` (1, `RUN_SMOKE_E2E`)
- **Failures**: none
- `npm run build` não foi repetido por mim (o test-report registra exit 0; typecheck+lint+test repetidos e verdes)

---

## Spec-Anchored Acceptance Criteria

Âncora `file:line` aponta o `it(...)`; a expressão é a asserção que li no arquivo.

### P1: Catálogo e grupos de objeção

| Criterion | Spec-defined outcome | `file:line` + assertion | Result |
| --- | --- | --- | --- |
| ARS-01 carrega `servicos.json` com Zod estrito | `id` `^[a-z0-9-]+$`, `nome`, `resumo`, `dimensoes` não vazio em `DIMENSION_IDS`, `quando_indicar` | `src/lib/comercial/catalog.test.ts:113` rejeita serviço sem campo e com `dimensoes: []`; `:87` rejeita chave desconhecida | ✅ PASS |
| ARS-02 id duplicado / dimensão fora | issue nomeando o valor | `catalog.test.ts:59` `id duplicado: governanca`; `:66` `dimensão desconhecida: d99` | ✅ PASS (M16 morto) |
| ARS-03 `objecoes.json` | `id`, `nome`, `descricao`; duplicado rejeitado | `catalog.test.ts:80` `id duplicado: preco`; `:132` sem `nome`/`descricao` | ✅ PASS |
| ARS-04 seed | `status` `rascunho`, 7 e 6 ids na ordem | `catalog.test.ts:45` `expect(SERVICE_IDS).toEqual(EXPECTED_SERVICE_IDS)`; `:49` idem grupos; `:53` `expect(COMMERCIAL_CATALOG.status).toBe("rascunho")` | ✅ PASS |
| ARS-05 `SERVICE_IDS`, `getService`, `getObjectionGroup` | entrada ou `undefined` | `catalog.test.ts:150` | ✅ PASS |

### P1: Agente comercial

| Criterion | Spec-defined outcome | `file:line` + assertion | Result |
| --- | --- | --- | --- |
| ARS-06 pontos-chave 3 a 5, limites 70/300, `dimensao_ids` | 2 e 6 rejeitam; 3 e 5 aceitam | `src/lib/agents/commercial-types.test.ts:25,35,50,60` | ✅ PASS |
| ARS-07 objeções 3 a 6, 1 por grupo | grupo repetido rejeita | `commercial-types.test.ts:72,82,101,116`; `:129` `grupo repetido: preco` | ✅ PASS |
| ARS-08 serviço recomendado | `servico_id` do catálogo; ≤2 complementares distintos ≠ principal | `commercial-types.test.ts:145` (M1 morto), `:152,163,174` | ✅ PASS |
| ARS-09 exatamente 10 perguntas | 9 e 11 rejeitam; enums | `commercial-types.test.ts:190,202` | ✅ PASS |
| ARS-10 mix | issue com a regra e a contagem | `:221` `"mínimo de 4 perguntas abertas (recebido 3)"`; `:231` fechadas `(recebido 2)`; `:241` `"no máximo 1 pergunta de 'situacao' (recebido 2)"`; `:253` problema `(recebido 1)`; `:264` implicação; `:277` necessidade (M2, M3, M24 mortos) | ✅ PASS |
| ARS-11 truncar na última palavra com "…" | ≤ limite e termina em `…` | `commercial-types.test.ts:303,330` tabela de 8 campos (M22 morto) | ✅ PASS |
| ARS-12 `buildCommercialSignals` | `menorNivel` com empates, `cLevel` case-insensitive, `cLevel` falso com cargo vazio | `commercial-signals.test.ts:34` `expect(signals.menorNivel).toEqual(["d02","d03"])`; `:49` (M10 morto); `:61`; `:73` | ✅ PASS |
| ARS-13 prompt com skill, catálogo, sinais, respostas, análise, insights | ids, nomes, resumos, dimensões | `src/lib/agents/commercial.test.ts:108,135` | ✅ PASS |
| ARS-14 blocos de dados, `sanitizeUntrusted`, guardrail | 4 sentenças do system prompt; sanitização | `commercial.test.ts:186` (M23 morto), `:157` (M12 morto) | ✅ PASS |
| ARS-15 instruções C-level/desequilíbrio só com sinal | presentes só ativo | `commercial.test.ts:214` (M11 e M18 mortos) | ✅ PASS |
| ARS-16 devolve `CommercialArsenal` | objeto igual | `commercial.test.ts:95` | ✅ PASS |
| ARS-17 3 tentativas, `CommercialAgentError`, issues no retry | 3 chamadas, feedback `ATENÇÃO` na 2ª | `commercial.test.ts:246,262` | ✅ PASS |
| ARS-18 skill ilegível sem LLM | `CommercialAgentError`, 0 chamadas | `commercial.test.ts:273`; `commercial-skill.test.ts:24` | ✅ PASS |

### P1: Pipeline, persistência, falha isolada

| Criterion | Spec-defined outcome | `file:line` + assertion | Result |
| --- | --- | --- | --- |
| ARS-19 chama o agente e loga `arsenal` com ms | `commercial({payload, analysis, insights})`; log entre writer e pdf | `src/lib/service/analysis-service.test.ts:691` `expect(commercial).toHaveBeenCalledWith({ payload, analysis, insights })`, `expect(logEvent).toHaveBeenCalledWith("lead-1","arsenal",undefined,expect.any(Number))` | ⚠️ Spec-precision gap: a duração só é checada como `any(Number)`, não como ms medidos |
| ARS-20 mesmo `upsert` e PDF | `upsert` exato com `arsenal`, `status: "analisado"` | `analysis-service.test.ts:714` `toHaveBeenCalledWith({leadId,research,analysis,insights,sources,status:"analisado",arsenal})` (M5b morto) | ✅ PASS |
| ARS-21 falha isolada | `arsenal_failed` com mensagem, `arsenal: null`, `analisado`, PDF sem Arsenal, e-mail, ack sem requeue | `analysis-service.test.ts:747` (M4 e M14 mortos) | ✅ PASS |
| ARS-22 reprocesso sempre grava a chave | valor, `null`, novo valor | `analysis-service.test.ts:799,860`; `src/lib/repository/market-insights-repo.test.ts:51` (M5 morto) | ✅ PASS |
| ARS-23 pipeline falho não chama o agente | `commercial` 0 chamadas; fallback sem Arsenal | `analysis-service.test.ts:830` | ✅ PASS |
| ARS-24 migration re-executável | coluna `arsenal jsonb`, steps novos | `supabase/migrations/0019_market_insights_arsenal.sql:1-16` (`add column if not exists`, `drop constraint if exists`); **conferi o banco local**: `data_type=jsonb` e constraint com `'arsenal','arsenal_failed'` | ✅ PASS |
| ARS-25 repo | select, upsert, tipo | `market-insights-repo.test.ts:79,137,232` | ✅ PASS |
| ARS-26 rótulos do admin | `Arsenal comercial (LLM)`, `Falha no Arsenal comercial` tom de erro | `src/app/admin/components.test.tsx:8,16` (M17 morto) | ✅ PASS |

### P1: Arsenal no PDF

| Criterion | Spec-defined outcome | `file:line` + assertion | Result |
| --- | --- | --- | --- |
| ARS-27 diagnóstico intacto + exatamente 3 páginas | `[...base, arsenal-1..3]` | `src/lib/report/report-generator.test.ts:496` `expect(withArsenal).toHaveLength(5)` + chaves e textos do prefixo iguais (M7 e M21 mortos) | ❌ GAP no limite do schema: com conteúdo no máximo permitido pelo schema o PDF renderiza 5 páginas de Arsenal (ver gap 1) |
| ARS-28 sem Arsenal igual ao atual | 2 páginas, 3 com analysis ou insights | `report-generator.test.ts:484` `toHaveLength(2)` / `toHaveLength(3)`; `build-pdf-input.test.ts:48` sem chave (M13 morto) | ✅ PASS |
| ARS-29 running head e rodapé | texto confidencial + rodapé nas 3 páginas | `src/lib/report/arsenal-pages.test.tsx:388` | ✅ PASS |
| ARS-30 seções 01 a 04 em ordem | ordem no PDF inteiro | `arsenal-pages.test.tsx:401` | ✅ PASS |
| ARS-31 pontos com título, texto e dimensões | nomes curtos | `arsenal-pages.test.tsx:130,155` | ✅ PASS |
| ARS-32 serviço | nome do catálogo, justificativa, dimensões, complementares | `arsenal-pages.test.tsx:130,181` | ✅ PASS |
| ARS-33 objeções por grupo | nome do grupo, 3 rótulos | `arsenal-pages.test.tsx:205,223,233,247` | ✅ PASS |
| ARS-34 perguntas | 01 a 10, chips, etapa, objetivo | `arsenal-pages.test.tsx:268,301,314,324,340` | ✅ PASS |
| ARS-35 nota de catálogo | presente em `rascunho`, ausente em `aprovado` | `arsenal-pages.test.tsx:164,170` (M8 morto) | ⚠️ Spec-precision gap: o status do catálogo composto (dois arquivos) não está definido na spec e o caso misto não é testado (M15 sobreviveu, gap 2) |
| ARS-36 só tokens `COLORS` e Inter/Poppins | nenhuma cor/fonte fora | `arsenal-pages.test.tsx:195,258,336`; `report-primitives.test.ts:5` | ✅ PASS |
| ARS-37 `%PDF`, páginas = diagnóstico + 3 | contagem | `report-generator.test.ts:541` `expect(countPdfPages(withArsenal.pdf)).toBe(basePages + 3)`; `:551` | ❌ GAP no limite do schema (mesmo defeito do ARS-27; `/tmp/arsenal-fix/worst.pdf` tem 9 páginas = 4 + 5, reproduzido por mim com `npm run pdf:png`) |

### P1: Download e confidencialidade

| Criterion | Spec-defined outcome | `file:line` + assertion | Result |
| --- | --- | --- | --- |
| ARS-38 download passa o Arsenal válido | `generatePdf` recebe o Arsenal | `src/lib/service/admin-service.test.ts:632` (M9 morto) | ✅ PASS |
| ARS-39 `null`/inválido sem Arsenal, sem erro | PDF sem a chave, resolve | `admin-service.test.ts:652,672,691` (M19 morto) | ✅ PASS |
| ARS-40 input igual no worker e no download | mesmo builder | `src/lib/report/build-pdf-input.test.ts:48,76,93,104`; `admin-service.test.ts:718` | ✅ PASS |
| ARS-41 DTO sem `arsenal` nem texto | chave e textos ausentes, gerente e público | `src/lib/service/portal-service.test.ts:719,734,752` `expect(Object.keys(dto)).not.toContain("arsenal")` + `JSON.stringify` sem justificativa/contorno/pergunta (M6 morto) | ✅ PASS |
| ARS-42 sem rota nova | nenhum arquivo/menção fora do worker | `src/lib/comercial/no-public-arsenal.test.ts:28,34,38`; rota existente do PDF mantém 401 sem chave (`src/app/api/admin/portal/[leadId]/report-pdf/route.test.ts`) | ✅ PASS |

### P2: Verificação local

| Criterion | Spec-defined outcome | Evidência | Result |
| --- | --- | --- | --- |
| ARS-43 migration 2× exit 0, coluna, insert `arsenal_failed` | | Conferi o estado do banco local (coluna `jsonb`, constraint com os 2 steps); as 2 aplicações e o insert estão no `test-report.md` seção 1.4 | ✅ PASS (re-aplicação não repetida por mim para não alterar o banco; o SQL é idempotente por inspeção, `0019_...sql:5-16`) |
| ARS-44 `pdf:arsenal-sample` e `pdf:png` | | `package.json` scripts; `npm run pdf:png -- <pdf>` rodado por mim: `pages=7` | ✅ PASS |
| ARS-45 agente real ≤2 execuções, schema válido, PDF com Arsenal | | `/tmp/arsenal-evidence/real-arsenal.json` existe: 5 pontos, 6 objeções, 10 perguntas (6 abertas/4 fechadas; 1 situação/3 problema/3 implicação/3 necessidade), serviço `qualidade-mestres`, respeita as regras do schema; PNGs `evidence/real-page-05..07.png` | ✅ PASS (não rodei o LLM) |
| ARS-46 download pelo admin tem as páginas do Arsenal | | `/tmp/arsenal-postfix/admin-headers.txt`: `200`, `content-type: application/pdf`, `attachment`; `admin-download.pdf` começa com `%PDF-` e `pages=7` (rodei o conversor) | ✅ PASS |

**Edge cases**: ver seção abaixo.

**Status**: ⚠️ 44/46 ACs com resultado conforme a spec; ARS-27 e ARS-37 ❌ no limite do schema; 2 spec-precision gaps (ARS-19, ARS-35).

---

## Edge Cases

- [x] `servico_id` fora do catálogo rejeitado e retry com issue: `commercial-types.test.ts:145`, `commercial.test.ts:246`
- [x] Arsenal persistido com serviço removido do catálogo gera PDF sem Arsenal: `admin-service.test.ts:691`
- [~] `insights.bullets` vazio: o agente roda e imprime "(sem insights)" (`commercial.test.ts:290`), mas **nenhum teste no pipeline** garante que `processNext` ainda chama o agente (M20 sobreviveu, gap 3)
- [x] Sem `empresa.nome` usa "não informada": `src/lib/agents/commercial.ts:318`
- [x] `cargo` vazio, `cLevel` falso: `commercial-signals.test.ts:61`, `commercial.test.ts:315`

---

## Discrimination Sensor

Scratch: `git worktree add --detach <scratchpad>/mut HEAD` com `node_modules` por symlink; mutação aplicada, testes alvo rodados, arquivo restaurado a cada passo; worktree removido com `git worktree remove --force` + `prune`. **Baseline** `git status --porcelain` da árvore real: vazio antes e depois (`ISOLATION_OK`). Nenhum `git stash`.

| # | File:line | Mutation | Tests run | Killed? |
| - | --------- | -------- | --------- | ------- |
| M1 | `src/lib/agents/commercial-types.ts:51` | `z.enum(SERVICE_IDS)` → `z.string()` (enum do catálogo) | commercial-types | ✅ Killed (`rejeita serviço fora do catálogo`) |
| M2 | `commercial-types.ts:16` | `minAbertas: 4` → `3` | commercial-types | ✅ Killed |
| M3 | `commercial-types.ts` (regra problema) | `if (problema < min)` → `if (false)` | commercial-types | ✅ Killed |
| M4 | `src/lib/service/analysis-service.ts:146` | falha do agente relança (`throw err`) em vez de `return null` | analysis-service | ✅ Killed (2 testes) |
| M5 | `src/lib/repository/market-insights-repo.ts:58` | `arsenal: params.arsenal ?? null` → `?? undefined` | repo + analysis-service | ✅ Killed |
| M5b | `analysis-service.ts:279` | remove `arsenal` do `upsert` (reprocesso não sobrescreve) | analysis-service | ✅ Killed (5 testes) |
| M6 | `src/lib/service/portal-service.ts:199` | adiciona `arsenal` ao DTO do portal | portal-service | ✅ Killed (3 testes) |
| M7 | `src/lib/report/arsenal-pages.ts:307` | `buildArsenalPages` devolve só 2 páginas | `src/lib/report` | ✅ Killed (12 testes) |
| M8 | `arsenal-pages.ts:212` | `status === "rascunho"` → `!==` (nota preliminar) | `src/lib/report` | ✅ Killed |
| M9 | `src/lib/service/admin-service.ts:182` | download ignora o Arsenal (`arsenal: undefined`) | admin-service | ✅ Killed |
| M10 | `src/lib/agents/commercial-signals.ts:20` | remove `toLowerCase()` do C-level | commercial-signals | ✅ Killed |
| M11 | `src/lib/agents/commercial.ts:301` | instrução de desequilíbrio sempre presente | commercial | ✅ Killed |
| M12 | `commercial.ts:282` | remove `sanitizeUntrusted` do texto dos insights | commercial | ✅ Killed |
| M13 | `src/lib/report/build-pdf-input.ts:33` | PDF sem Arsenal passa a carregar a chave `arsenal: undefined` | report + service | ✅ Killed (8 testes) |
| M14 | `analysis-service.ts:145` | log de falha usa o step `arsenal` em vez de `arsenal_failed` | analysis-service | ✅ Killed |
| M15 | `src/lib/comercial/catalog.ts:94` | status composto `\|\|` → `&&` (um arquivo aprovado e outro rascunho vira "rascunho" só se ambos) | comercial, report, agents | ❌ **Survived** (245 passed) → fix task |
| M16 | `catalog.ts:41` | `if (seen.has(item.id))` → `if (false)` | comercial | ✅ Killed |
| M17 | `src/app/admin/components.tsx:93` | `arsenal_failed` fora de `LOG_ERROR_STEPS` | components | ✅ Killed |
| M18 | `commercial.ts:296` | instrução C-level nunca incluída | commercial | ✅ Killed |
| M19 | `admin-service.ts:166` | Arsenal persistido sem validar no schema | admin-service | ✅ Killed |
| M20 | `analysis-service.ts:128` | pipeline pula o agente quando `insights.bullets` é vazio | analysis-service | ❌ **Survived** (24 passed) → fix task |
| M21 | `report-generator.ts:603` | só 2 das 3 páginas anexadas | `src/lib/report` | ✅ Killed (5 testes) |
| M22 | `commercial-types.ts:28` | truncamento sem o "…" | commercial-types | ✅ Killed |
| M23 | `commercial.ts:25` | remove o guardrail "NUNCA invente cases…" do system prompt | commercial | ✅ Killed |
| M24 | `commercial-types.ts:13` | `total: 10` → `9` | agents + report + types | ✅ Killed (7 testes) |

**Sensor depth**: P0-expandido (≥5 mutações; 24 injetadas; dados do cliente/estratégia de venda e fluxo de relatório já em produção)
**Result**: 22/24 killed, **2 survived** — ❌ FAIL

---

## Code Quality (diff vs AGENTS.md Definition of Done e `docs/rules/*.md`)

| Check | Status |
| --- | --- |
| Minimum code / sem abstração de uso único | ✅ `build-pdf-input.ts` unifica duas cópias antes duplicadas (AD-014); `report-primitives.ts` é extração pura (conferi: `diff` ordenado de `report-generator.ts` antigo contra `report-primitives.ts` + novo mostra só `export`, imports e a linha do Arsenal) |
| Surgical changes / sem scope creep | ✅ `screen-service.ts` só ganha o campo `arsenal` do tipo; portal e `/r` intocados |
| Matches patterns (Route → Service → Repo → DTO) | ✅ sem rota nova; serviço orquestra, repo só persiste |
| Zod `.strict()` em fronteiras | ✅ `commercial-types.ts` e `catalog.ts` estritos; `safeParse` em `admin-service.ts:166` |
| Erros tipados, sem vazar internals | ✅ `CommercialAgentError`; falha só vai ao log do admin e `console.error` |
| Segredos / env | ✅ sem `NEXT_PUBLIC_*` nem `process.env` novos (`grep` vazio nos módulos novos) |
| Prompt injection | ✅ blocos de dados + `sanitizeUntrusted` + guardrail (M12, M23 mortos) |
| Rate limit / auth em rota nova | n/a, nenhuma rota nova (ARS-42) |
| `import "server-only"` | ⚠️ Menor: módulos novos em `src/lib/agents/` não o declaram, mas os agentes existentes (`writer.ts`) também não; consistente com o padrão local, sem `process.env` secreto |
| Migration re-executável e aplicável em banco vazio | ✅ `0019_...sql` (e a constraint lista todos os steps da `0011` mais os 2 novos) |
| Docs (AGENTS.md, data-model, ADR 012) em sincronia | ✅ |
| Testes mapeiam ACs, não rasos, nenhuma exclusão/skip novo | ✅ contagem sobe de 768 para 884; nenhum teste enfraquecido |
| Guidelines documentadas seguidas | `AGENTS.md` §7/§12 e `docs/rules/{security,validation,architecture}.md` |
| Questionário/snapshot em sincronia | n/a, `docs/snapshot-maturidade-dados.json` intocado |

---

## Visual Evidence (PNGs em `evidence/`)

- `real-page-01.png`: capa do diagnóstico, mesma paleta roxo/ink, Poppins nos títulos e Inter no corpo, radar, rodapé `Página 1 de 7`
- `real-page-05.png`: running head `ARSENAL COMERCIAL · USO INTERNO · CONFIDENCIAL`; `01 Pontos-chave para a reunião` (5 pontos com título, texto, dimensões); `02 Serviço ideal` (Qualidade e Dados Mestres, justificativa, dimensões atacadas, complementares); nota `Catálogo de serviços preliminar: validar antes de ofertar`; mesmo section header e rodapé do diagnóstico
- `real-page-06.png`: `03 Contorno de objeções`, 6 grupos, cada um com `OBJEÇÃO PROVÁVEL`, `CONTORNO`, `APOIO NO DIAGNÓSTICO`; nada cortado
- `real-page-07.png`: `04 Perguntas de descoberta (SPIN)`, `01`–`10`, chips ABERTA/FECHADA e SITUAÇÃO/PROBLEMA/IMPLICAÇÃO/NECESSIDADE alinhados, `Objetivo:` após cada pergunta
- Mesmo PDF baixável: `admin-download.pdf` (200, `application/pdf`, `attachment`, 7 páginas) é o arquivo de onde saem os PNGs; mesmo `buildPdfInput` no worker e no download (ARS-40)
- Os 4 blocos aparecem completos, na ordem pedida. Limitação: evidência é do caso típico (5/6/10); o caso de teto do schema não está nos PNGs (gap 1)

---

## Ranked Gaps (viram fix tasks)

1. **Major, ARS-27/ARS-37 (BUG-01):** Arsenal com campos no máximo do schema (5 pontos de 300, 6 objeções de 400, 10 perguntas de 240, justificativa de 500) renderiza **5** páginas de Arsenal, não 3. `src/lib/report/arsenal-pages.ts` não tem redução de conteúdo; `/tmp/arsenal-fix/worst.pdf` tem 9 páginas (reproduzido). Nenhum teste cobre o teto. Fix: ou limitar o orçamento de texto/ajustar layout para que o teto do schema caiba em 3 páginas, ou emendar a spec (registrar "3 páginas com saída típica" e fixar o teto) e adicionar teste do caso de teto. Prioridade: Major (o agente real fica abaixo do teto, mas a spec diz "exatamente 3").
2. **Minor, mutante M15 / ARS-35:** `COMMERCIAL_CATALOG.status` (`src/lib/comercial/catalog.ts:94`) combina dois status, mas só o caso "ambos rascunho" é testado. Fix: teste com `servicos` rascunho e `objecoes` aprovado (e o inverso) esperando `rascunho` e, na spec, definir que qualquer arquivo em `rascunho` mantém a nota.
3. **Minor, mutante M20 / Edge case `bullets` vazio:** sem teste em `analysis-service.test.ts` de que `processNext` chama o agente comercial com `insights.bullets = []`. Fix: um teste no pipeline com `insights: { bullets: [] }` esperando `commercial` chamado 1× e `arsenal` persistido.
4. **Cosmetic, ARS-19 (spec-precision):** `analysis-service.test.ts:691` só assere `expect.any(Number)` na duração. Fix: `vi.useFakeTimers` e esperar o ms exato, ou especificar na spec que basta um inteiro ≥ 0.
5. **Informativo, ARS-43/45/46:** a evidência dessas ACs vive em `/tmp` (fora do repo) e só 4 PNGs foram versionados. Reconferi o banco local, o PDF baixado e o JSON do agente real, mas um revisor sem a máquina não consegue repetir. Sugestão: versionar `admin-headers.txt` e `real-arsenal.json` em `evidence/`.

(BUG-02, o transbordo do card "Estimativa de Impacto" do diagnóstico, é pré-existente e não regressão; confirmado pelo test-report e fora de escopo.)

---

## Fix Plans

### Fix 1: teto do schema estoura as 3 páginas (gap 1)

- **Root cause**: o schema aceita textos de até 300/400/240/500 caracteres, mas o layout das 3 páginas A4 só comporta conteúdo típico.
- **Fix task**: decidir com o dono entre reduzir limites/layout (ex.: `pontosChave.texto` e `objecoes.contorno` menores, ou tipografia por contagem) ou emendar a spec; em ambos, teste de `generateScreenerPdf` com fixture no teto esperando `basePages + 3`.
- **Where**: `src/lib/agents/commercial-types.ts` (`ARSENAL_LIMITS`) e/ou `src/lib/report/arsenal-pages.ts`; teste em `src/lib/report/report-generator.test.ts`.
- **Verify**: `npx vitest run src/lib/report`; `npm run pdf:png` do PDF do teto com `pages=` diagnóstico + 3.
- **Priority**: Major

### Fix 2: status composto do catálogo (gap 2)

- **Where**: `src/lib/comercial/catalog.test.ts` (teste do status com `vi.doMock` dos JSONs ou export de função pura de composição).
- **Done when**: M15 morre.
- **Priority**: Minor

### Fix 3: pipeline com `bullets` vazio (gap 3)

- **Where**: `src/lib/service/analysis-service.test.ts`.
- **Done when**: M20 morre.
- **Priority**: Minor

---

## Requirement Traceability Update

| Requirement | Previous Status | New Status |
| ----------- | --------------- | ---------- |
| ARS-01..ARS-18, ARS-20..ARS-26, ARS-28..ARS-34, ARS-36, ARS-38..ARS-46 | Implementing | ✅ Verified |
| ARS-19 | Implementing | ✅ Verified (spec-precision gap, duração) |
| ARS-35 | Implementing | ✅ Verified (spec-precision gap, status composto; M15 sobrevive) |
| ARS-27, ARS-37 | Implementing | ❌ Needs Fix |

---

## Summary

**Overall**: ❌ Not Ready (3 fix tasks, 1 Major)

**Spec-anchored check**: 44/46 ACs match the spec outcome; ARS-27 e ARS-37 falham no teto do schema; 2 spec-precision gaps (ARS-19, ARS-35)
**Sensor**: 22/24 mutations killed, 2 survived (M15, M20)
**Gate**: 884 passed, 0 failed, 5 skipped (smokes gated)

**What works**: catálogo e schema com enum e mix testados e discriminantes; falha do agente isolada (M4, M14 mortos); reprocesso sobrescreve `arsenal` com `null` (M5, M5b mortos); portal e DTO sem Arsenal (M6 morto); PDF sem Arsenal idêntico ao atual (M13, M21 mortos); nota preliminar (M8 morto); download e e-mail pelo mesmo `buildPdfInput`; migration idempotente conferida no banco local; evidência visual com os 4 blocos, mesmo design system e mesmo PDF baixável.

**Issues found**: ver Ranked Gaps (1 Major, 2 Minor, 1 Cosmetic, 1 Informativo).

**Next steps**: rotear Fix 1 a 3 a um implementador, depois re-dispatch do Verifier (iteração 1 de no máximo 3).

---

## validate_state.py

```
$ python3 .claude/skills/tlc-spec-driven/scripts/validate_state.py arsenal-comercial --root .
  ERROR arsenal-comercial: validation.md verdict is FAIL - route the ranked gaps to fix tasks, then re-verify (feature is not done)

validate_state: 1 error(s) across [arsenal-comercial]
exit 1
```

Saída esperada para um veredito FAIL: o gate reconhece o relatório como real (presente, com citações `file:line`) e recusa marcar a feature como pronta até os fix tasks serem aplicados e o Verifier re-rodar.
