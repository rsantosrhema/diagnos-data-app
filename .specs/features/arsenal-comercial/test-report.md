# Arsenal Comercial — Relatório de Testes

**Data**: 2026-11-24
**Branch**: `feat/arsenal-comercial` (HEAD de teste `df01218` + este relatório)
**Escopo**: tasks T1–T27 e fix F1 de `.specs/features/arsenal-comercial/tasks.md`, ACs ARS-01..ARS-46
**Ambiente**: macOS local, Supabase local (`127.0.0.1:54321`), LLM real **não chamado** nesta etapa (a T26 já fez as 2 execuções permitidas)

---

## 1. Comandos e resultados

### 1.1 Gates principais

| Gate | Comando | Resultado |
| --- | --- | --- |
| Typecheck | `npm run typecheck` | exit 0, sem erros |
| Lint | `npm run lint` | exit 0; 3 warnings pré-existentes de `@next/next/no-page-custom-font` em `src/app/layout.tsx` |
| Testes | `npm run test` | exit 0; **77 arquivos passaram, 3 skipped (80); 884 testes passaram, 5 skipped (889)** |
| Build | `npm run build` | exit 0; rotas compiladas, incluindo `/r/[token]`, `/admin` e as rotas de API |

Contagem antes desta etapa: 874 passed / 5 skipped (879). Depois: **884 passed / 5 skipped (889)**, +10 testes, nenhum removido, enfraquecido ou skipped. Baseline da feature: 768 passed / 1 skipped. Estado final depois da F6: **889 passed / 5 skipped (894)**.

Os 5 skipped são os smokes gated já existentes: `arsenal-sample.smoke.test.ts` (2), `arsenal-smoke-flow.test.ts` (2) e `smoke-e2e-flow.test.ts` (1).

### 1.2 Gate Check Commands do `tasks.md`

| Gate da matriz | Comando | Resultado |
| --- | --- | --- |
| Catálogo | `npx vitest run src/lib/comercial` | 2 arquivos, **13 testes passed** |
| Agentes | `npx vitest run src/lib/agents` | 12 arquivos, **148 testes passed** |
| Repositório | `npx vitest run src/lib/repository/market-insights-repo.test.ts` | 1 arquivo, **14 testes passed** |
| Serviços + builder | `npx vitest run src/lib/service src/lib/report/build-pdf-input.test.ts` | 8 passed / 2 skipped, **141 passed / 3 skipped** |
| PDF | `npx vitest run src/lib/report` | 6 passed / 1 skipped, **74 passed / 2 skipped** |
| Admin (componente) | `npx vitest run src/app/admin/components.test.tsx` | 1 arquivo, **3 testes passed** |
| Portal + confidencialidade | `npx vitest run src/lib/service/portal-service.test.ts src/lib/comercial` | 3 arquivos, **43 testes passed** |

### 1.3 Smokes e ferramentas locais

| Verificação | Comando | Resultado |
| --- | --- | --- |
| PDF de exemplo (fixture, sem LLM) | `ARSENAL_OUT_DIR=/tmp/arsenal-test npm run pdf:arsenal-sample` | 1 arquivo, **2 testes passed**; `arsenal-sample.pdf` 76.564 B e `arsenal-sample-no-arsenal.pdf` 58.546 B |
| Conversor PDF→PNG | `npm run pdf:png -- /tmp/arsenal-test/arsenal-sample.pdf /tmp/arsenal-test/sample-png` | `pages=7` (4 do diagnóstico + 3 do Arsenal) |
| Base sem Arsenal | `npm run pdf:png -- …arsenal-sample-no-arsenal.pdf …/sample-png-base` | `pages=4` |
| PDF inexistente | `npm run pdf:png -- /tmp/arsenal-test/nao-existe.pdf …` | exit 1 (falha esperada) |
| Guarda do smoke real | `RUN_ARSENAL_E2E=1 NEXT_PUBLIC_SUPABASE_URL=https://remote.invalid npx vitest run src/lib/service/arsenal-smoke-flow.test.ts` | falha antes de qualquer escrita com `ARSENAL SMOKE: só roda contra o Supabase local`; 2 testes skipped |

### 1.4 Migration 0019 no Supabase local

| Verificação | Comando | Resultado |
| --- | --- | --- |
| Aplicação 1 | `docker exec -i supabase_db_diagnos-data-app psql … < supabase/migrations/0019_market_insights_arsenal.sql` | exit 0 (`NOTICE` de coluna já existente + 3 `ALTER TABLE`) |
| Aplicação 2 | mesmo comando | exit 0 (re-executável) |
| Coluna | `select data_type … column_name='arsenal'` | `jsonb` |
| Constraint | `select pg_get_constraintdef(oid) … analysis_job_logs_step_check` | contém `arsenal` e `arsenal_failed` |
| Insert do novo step | `begin; insert … 'arsenal_failed' …; rollback;` | `INSERT 0 1`, `ROLLBACK`, exit 0 |
| Evidência versionada | `.specs/features/arsenal-comercial/evidence/migration-check.txt` | saída das consultas acima no Supabase local: coluna `jsonb` e constraint com `arsenal` e `arsenal_failed` |

### 1.5 Ponta a ponta pelo admin local

App local (`npm run dev`, `http://localhost:3000`) contra o Supabase local. Lead real da T26 `950bd3b5-602f-43d5-b6d6-9de85a2b5f93` (Arsenal persistido), lead de falha `8fa22d4e-4fe1-4ee9-94ea-26f955b868e1` (Arsenal `null`).

| Requisição | Resultado |
| --- | --- |
| `GET /api/admin-proxy/portal/<real>/report-pdf` com `Authorization: Bearer <gerente>` | **200**, `content-type: application/pdf`, `content-disposition: attachment; filename="diagnostico-ana-teste.pdf"`, 76.450 B (headers versionados em `evidence/admin-headers.txt`, sem o `authorization`) |
| Mesma URL sem `Authorization` | **401**, corpo `{"error":"Não autenticado"}` |
| Conversão do download | `pages=7`; Arsenal nas páginas 5–7 |
| `GET …/report-pdf` do lead sem Arsenal | **200**, `application/pdf`, **4 páginas**, nenhuma página de Arsenal |
| `POST /api/admin-proxy/portal/<real>/share` + `GET /api/public-proxy/portal/<token>` | 200; DTO sem a chave `arsenal`; justificativa, primeiro contorno e primeira pergunta do Arsenal ausentes |
| `GET /r/<token>` | 200; nenhuma ocorrência de `arsenal` no HTML |
| Limpeza | `delete from share_tokens where lead_id=<real>` → `DELETE 1`; restantes 0; dev server encerrado |

O único match de "Arsenal" no JSON do portal é o nome da empresa de teste (`Empresa Arsenal b2cf5616`), dado do lead, não conteúdo do Arsenal.

---

## 2. Cobertura ARS → testes

Status: **46/46 cobertos** (44 por testes automatizados + ARS-43/ARS-45/ARS-46 por comandos e artefatos locais). Nenhuma lacuna permaneceu aberta.

### P1: Catálogo e grupos de objeção

| ARS | Teste/evidência | Status |
| --- | --- | --- |
| ARS-01 | `src/lib/comercial/catalog.test.ts:113` — serviço sem `quando_indicar` e `dimensoes: []` rejeitados; `:45` — 7 ids na ordem | ✅ |
| ARS-02 | `catalog.test.ts:59` — `id duplicado: governanca`; `:66` — `dimensão desconhecida: d99` | ✅ |
| ARS-03 | `catalog.test.ts:80` — `id duplicado: preco`; `:132` — grupo sem `nome`/`descricao`; `:49` — 6 ids na ordem | ✅ |
| ARS-04 | `catalog.test.ts:45,49,53` — ids exatos/ordem e `status` `"rascunho"` nos dois arquivos | ✅ |
| ARS-05 | `catalog.test.ts:150` — `getService("governanca")?.nome` e `getObjectionGroup("preco")?.nome`; `undefined` para id inexistente | ✅ |

### P1: Schema do Arsenal

| ARS | Teste/evidência | Status |
| --- | --- | --- |
| ARS-06 | `src/lib/agents/commercial-types.test.ts:25,35,50` — 2 rejeita, 3 e 5 aceita, 6 rejeita; `:60` — `dimensao_ids` vazio/`d99` rejeitados | ✅ |
| ARS-07 | `commercial-types.test.ts:72,82,101` — 2 rejeita, 3 e 6 aceita, 7 rejeita; `:116` — grupo fora do catálogo; `:129` — `grupo repetido: preco` | ✅ |
| ARS-08 | `commercial-types.test.ts:145` — `servico_id` inexistente; `:152,174` — complementar igual ao principal e repetido; `:163` — 3 complementares | ✅ |
| ARS-09 | `commercial-types.test.ts:190` — 9 e 11 perguntas; `:202` — `formato`/`spin` fora do enum | ✅ |
| ARS-10 | `commercial-types.test.ts:221,231,241,253,264,277` — cada regra com a mensagem exata e a contagem recebida | ✅ |
| ARS-11 | `commercial-types.test.ts:330` — tabela cobre `titulo` (60), `texto` (200), `objecao_provavel` (140), `contorno` (220), `apoio` (120), `justificativa` (300), `texto` da pergunta (160) e `objetivo` (120); cada campo recebe `max + 1` e sai ≤ limite, terminando em `…`; `:318` — limite exato inalterado | ✅ |

### P1: Sinais e agente comercial

| ARS | Teste/evidência | Status |
| --- | --- | --- |
| ARS-12 | `src/lib/agents/commercial-signals.test.ts:34` — empate `["d02","d03"]`; `:49,61` — C-level case-insensitive e cargo vazio; `:73` — copia `desequilibrio`, `faixa`, `score`, `respostaComercial` | ✅ |
| ARS-13 | `src/lib/agents/commercial.test.ts:108` — skill, ids, sinais e tags; `:135` — nome, resumo e dimensões de cada serviço e nome/descrição de cada grupo | ✅ |
| ARS-14 | `commercial.test.ts:186` — 4 sentenças do system prompt e controle removido do resumo; `:157` — sanitização na resposta do diagnóstico e nos insights | ✅ |
| ARS-15 | `commercial.test.ts:214` — `SINAL C-LEVEL` e `SINAL DE DESEQUILÍBRIO` presentes só com os sinais ativos | ✅ |
| ARS-16 | `commercial.test.ts:95` — `run` devolve objeto igual a `makeArsenal()` | ✅ |
| ARS-17 | `commercial.test.ts:246` — 3 chamadas, feedback `ATENÇÃO` na 2ª; `:262` — não-JSON 3 vezes lança `CommercialAgentError` | ✅ |
| ARS-18 | `commercial.test.ts:273` — `skillLoader` que lança não chama o LLM; `commercial-skill.test.ts:24` — `CommercialSkillError`/`Skill SPIN indisponível` | ✅ |

### P1: Pipeline, persistência e log

| ARS | Teste/evidência | Status |
| --- | --- | --- |
| ARS-19 | `src/lib/service/analysis-service.test.ts:691` — `commercial({ payload, analysis, insights })`, log `arsenal` entre `writer` e `pdf` | ✅ |
| ARS-20 | `analysis-service.test.ts:714` — `upsert` exato com `arsenal` e `status: "analisado"`; input do PDF com o mesmo Arsenal | ✅ |
| ARS-21 | `analysis-service.test.ts:747` — `arsenal_failed` com `falha simulada`, `arsenal: null`, PDF sem a chave, e-mail 1, `ack("analisado")`, sem requeue/reset | ✅ |
| ARS-22 | `analysis-service.test.ts:799` — três reprocessos gravam a chave sempre (valor, `null`, novo valor); `:860` — sem agente, nenhum log e `arsenal: null`; `market-insights-repo.test.ts:51` | ✅ |
| ARS-23 | `analysis-service.test.ts:830` — `analyst` falha, `commercial` 0 chamadas, PDF de fallback sem `arsenal` | ✅ |
| ARS-24 | Migration 0019 aplicada 2× exit 0, coluna `jsonb`, constraint com os dois steps, insert `arsenal_failed` em transação | ✅ |
| ARS-25 | `market-insights-repo.test.ts:79` — `arsenal` gravado; `:137` — select contém `arsenal` e devolve o valor; `:232` — `logEvent(..., "arsenal_failed", ...)` | ✅ |
| ARS-26 | `src/app/admin/components.test.tsx:8` — `Arsenal comercial (LLM)` neutro; `:16` — `Falha no Arsenal comercial` com `text-[#b23a34]`/`font-medium`; `:24` — regressão `pdf_failed` | ✅ |

### P1: PDF

| ARS | Teste/evidência | Status |
| --- | --- | --- |
| ARS-27 | `src/lib/report/report-generator.test.ts:496` — 3 páginas Arsenal após as do diagnóstico, prefixo com mesmas keys e mesmo texto; `:564` — 6 objeções cabem na página 3 | ✅ |
| ARS-28 | `report-generator.test.ts:484` — sem Arsenal: 2 páginas, 3 com analysis + insights | ✅ |
| ARS-29 | `src/lib/report/arsenal-pages.test.tsx:388` — running head confidencial e rodapé nas 3 páginas; `:130` — running head na página 1 | ✅ |
| ARS-30 | `arsenal-pages.test.tsx:401` — seções `01→02→03→04` na ordem no PDF inteiro; `:130,205,268` — cabeçalho de cada seção | ✅ |
| ARS-31 | `arsenal-pages.test.tsx:155` — nomes curtos `Dimensões: Governança, Patrocínio`, etc.; `:130` — título e texto de cada ponto | ✅ |
| ARS-32 | `arsenal-pages.test.tsx:130` — nome do serviço, justificativa, `Dimensões atacadas: Governança, Qualidade` e `Complementares: Qualidade e Dados Mestres`; `:181` — omite complementares ausentes | ✅ |
| ARS-33 | `arsenal-pages.test.tsx:205,223,233,247` — grupo do catálogo, 3 rótulos por objeção, ordem grupo→objeção e fallback para o id | ✅ |
| ARS-34 | `arsenal-pages.test.tsx:268` — números `01`–`10`; `:301,324` — contagem de chips segue os dados (6/4, 7/3); `:314` — `Objetivo:` após o texto; `:340` — chips alinhados e `NECESSIDADE` cabe (F1) | ✅ |
| ARS-35 | `arsenal-pages.test.tsx:164` — nota presente com `rascunho`; `:170` — ausente com `aprovado` | ✅ |
| ARS-36 | `arsenal-pages.test.tsx:195,258,336` — só tokens de `COLORS` e fontes Inter/Poppins; `report-primitives.test.ts:5` — tokens e `p(12)=9`/`PAGE.width=595` | ✅ |
| ARS-37 | `report-generator.test.ts:541` — `%PDF` e páginas do diagnóstico + 3; `:551` — 3 → 6 com analysis + insights | ✅ |

### P1: Download e confidencialidade

| ARS | Teste/evidência | Status |
| --- | --- | --- |
| ARS-38 | `src/lib/service/admin-service.test.ts:632` — Arsenal válido chega ao `generatePdf` | ✅ |
| ARS-39 | `admin-service.test.ts:652,672,691` — `null`, ausente e serviço fora do catálogo geram PDF sem a chave e resolvem | ✅ |
| ARS-40 | `src/lib/report/build-pdf-input.test.ts:48,76,93,104`; `admin-service.test.ts:718`; `analysis-service.test.ts:691,714` — mesmo builder e input igual | ✅ |
| ARS-41 | `src/lib/service/portal-service.test.ts:719,734,752` — gerente e token sem a chave `arsenal` e sem justificativa/contorno/pergunta; `null` idem | ✅ |
| ARS-42 | `src/lib/comercial/no-public-arsenal.test.ts:28,34,38` — nenhum caminho/conteúdo em `src/app/r`, allowlist exata do worker; `src/app/api/admin/portal/[leadId]/report-pdf/route.test.ts` — 401 sem chave/gerente | ✅ |

### P2: Verificação local

| ARS | Evidência | Status |
| --- | --- | --- |
| ARS-43 | Migration aplicada 2× exit 0; coluna `jsonb`; constraint com `arsenal_failed`; insert+rollback exit 0; saída versionada em `evidence/migration-check.txt` | ✅ |
| ARS-44 | `npm run pdf:arsenal-sample` 2 passed; `npm run pdf:png` `pages=7`/`pages=4`; PDF inexistente exit 1 | ✅ |
| ARS-45 | `evidence/real-arsenal.json` (T26) valida no `commercialArsenalSchema` (5 pontos, 6 objeções, 10 perguntas, serviço `qualidade-mestres`); PDF pós-F1 renderiza as 3 páginas; nenhuma chamada nova ao LLM | ✅ |
| ARS-46 | Download autenticado 200 `application/pdf` (`evidence/admin-headers.txt`), 7 páginas com Arsenal em 5–7; sem token 401; lead sem Arsenal 4 páginas | ✅ |

---

## 3. Lacunas fechadas nesta etapa

10 testes novos, em 3 commits atômicos:

| Commit | Arquivo | Teste adicionado | ARS |
| --- | --- | --- | --- |
| `62c5448` | `src/lib/comercial/catalog.test.ts` | serviço sem campo obrigatório e `dimensoes: []`; grupo sem `nome`/`descricao` | ARS-01, ARS-03 |
| `62c5448` | `src/lib/agents/commercial-types.test.ts` | grupo fora do catálogo; complementares repetidos; `formato`/`spin` inválidos; truncamento em cada um dos 8 campos | ARS-07, ARS-08, ARS-09, ARS-11 |
| `5f2c0d2` | `src/lib/agents/commercial.test.ts` | nome/resumo/dimensões de cada serviço e nome/descrição de cada grupo no prompt | ARS-13 |
| `5f2c0d2` | `src/lib/agents/commercial.test.ts` | sanitização na resposta do diagnóstico e nos insights, além do resumo | ARS-14 |
| `8414169` | `src/lib/report/arsenal-pages.test.tsx` | running head + rodapé nas três páginas | ARS-29 |
| `8414169` | `src/lib/report/arsenal-pages.test.tsx` | ordem global `01→02→03→04` | ARS-30 |
| `8414169` | `src/lib/report/arsenal-pages.test.tsx` | `Dimensões atacadas:` do serviço na página 1 | ARS-32 |
| `8414169` | `src/lib/report/report-generator.test.ts` | texto das páginas de diagnóstico inalterado ao anexar o Arsenal (assertion reforçada, sem teste novo) | ARS-27 |

Os testes novos foram derivados da spec (valores esperados de ARS-01..ARS-36), não da implementação. Nenhum teste existente foi removido, enfraquecido ou marcado como skip.

---

## 4. Evidências

### 4.1 No repositório

| Arquivo | Conteúdo |
| --- | --- |
| `.specs/features/arsenal-comercial/evidence/real-page-01.png` | Capa do diagnóstico (radar, estágio Emergente) |
| `.specs/features/arsenal-comercial/evidence/real-page-05.png` | Arsenal `01` Pontos-chave e `02` Serviço ideal + nota do catálogo |
| `.specs/features/arsenal-comercial/evidence/real-page-06.png` | Arsenal `03` Contorno de objeções com os 6 grupos |
| `.specs/features/arsenal-comercial/evidence/real-page-07.png` | Arsenal `04` Perguntas SPIN, `01`–`10`, chips e `Objetivo:` |
| `.specs/features/arsenal-comercial/evidence/worst-page-05.png` | Pior caso (teto do schema): `01` pontos-chave e `02` serviço ideal |
| `.specs/features/arsenal-comercial/evidence/worst-page-06.png` | Pior caso: `03` com 6 objeções, todas inteiras |
| `.specs/features/arsenal-comercial/evidence/worst-page-07.png` | Pior caso: `04` com 10 perguntas e chips SPIN inteiros |
| `.specs/features/arsenal-comercial/evidence/real-arsenal.json` | Arsenal real da T26 (5 pontos, 6 objeções, 10 perguntas, serviço `qualidade-mestres`) — sustenta ARS-45 |
| `.specs/features/arsenal-comercial/evidence/admin-headers.txt` | Headers do download autenticado pós-fix: `200`, `application/pdf`, `attachment`; sem `authorization`/cookie — sustenta ARS-46 |
| `.specs/features/arsenal-comercial/evidence/migration-check.txt` | Saída psql local: `market_insights.arsenal` `jsonb` e constraint de `analysis_job_logs` com `arsenal`/`arsenal_failed` — sustenta ARS-43 |

PNGs a 80 dpi (661×936). `real-page-05..07` foram regerados na F6 com os limites novos (o JSON real trunca justificativa e contornos); `worst-page-05..07` vêm do fixture no teto do schema. F1 gerou os PNGs reais originais; F5 versionou os artefatos de texto/JSON, nenhum com token, cookie ou credencial.

### 4.2 Fora do repositório (artefatos locais)

| Caminho | Conteúdo |
| --- | --- |
| `/tmp/arsenal-postfix/admin-download.pdf` | PDF pós-fix baixado pela rota do "Exportar PDF" (7 páginas, 76.450 B) |
| `/tmp/arsenal-postfix/admin-png` | 7 PNGs do download |
| `/tmp/arsenal-postfix/no-arsenal.pdf` + `no-arsenal-png` | Lead sem Arsenal (4 páginas) |
| `/tmp/arsenal-postfix/portal.json` + `r-page.html` | DTO público e HTML do `/r` sem Arsenal |
| `/tmp/arsenal-test/sample-png` + `sample-png-base` | Fixture 7 páginas vs base 4 páginas |
| `/tmp/arsenal-evidence/real-arsenal.json` | Arsenal real da T26 reutilizado e validado (cópia versionada em `evidence/real-arsenal.json`) |
| `/tmp/arsenal-postfix/admin-headers.txt` | Headers do download pós-fix (cópia sanitizada em `evidence/admin-headers.txt`) |
| `/tmp/arsenal-f6/worst.pdf` | Pior caso com os limites da F6 — 7 páginas (4 do diagnóstico + 3 do Arsenal); o antigo `/tmp/arsenal-fix/worst.pdf` tinha 9 |

### 4.3 Conferência visual (pós-fix)

- Página 1: capa do diagnóstico, radar e rodapé `Página 1 de 7`; mesma paleta roxo/ink e fontes do Arsenal.
- Página 5: running head `ARSENAL COMERCIAL · USO INTERNO · CONFIDENCIAL`; `01` com 5 pontos (título, texto, dimensões); `02` com `Qualidade e Dados Mestres`, justificativa, dimensões atacadas e 2 complementares; nota `Catálogo de serviços preliminar: validar antes de ofertar`; `Página 5 de 7`.
- Página 6: `03` com 6 grupos reais, cada um com `OBJEÇÃO PROVÁVEL`, `CONTORNO` e `APOIO NO DIAGNÓSTICO`; nada cortado ou sobreposto; `Página 6 de 7`.
- Página 7: `04` com `01`–`10`, chips `ABERTA` (6) / `FECHADA` (4) e `SITUAÇÃO` (1) / `PROBLEMA` (3) / `IMPLICAÇÃO` (3) / `NECESSIDADE` (3); coluna de chips alinhada e `NECESSIDADE` inteiro (F1); `Objetivo:` logo após cada pergunta; `Página 7 de 7`.
- F6 (limites novos): a justificativa do serviço e os contornos do JSON real terminam em `…` por truncamento de schema, sem corte de layout; o pior caso (`worst-page-05..07.png`) mostra os 5 pontos, 6 objeções e 10 perguntas inteiros nas 3 páginas do Arsenal.
- Pré-fix (T26/T27): `/tmp/arsenal-evidence/real-png/page-07.png` mostrava `NECESSIDADE` cortado e chips desalinhados; o PDF pós-fix corrige os dois pontos.

Conteúdo do download confere com `real-arsenal.json`: serviço `qualidade-mestres`, 5 pontos, 6 grupos e as 10 perguntas do JSON.

---

## 5. Bugs e limitações

Nenhum bug bloqueante. Duas limitações não bloqueantes, ambas já registradas no `smoke-test.md`:

### BUG-01 (resolvido na F6) — pior caso estourava as 3 páginas do Arsenal

- **Onde**: `src/lib/agents/commercial-types.ts` (`ARSENAL_LIMITS`) e `src/lib/report/arsenal-pages.ts`.
- **Reprodução original**: Arsenal com 5 pontos de 300 caracteres, 6 objeções de 400, 10 perguntas de 240 e justificativa de 500 renderizava 5 páginas de Arsenal (9 no total: 4 do diagnóstico + 5).
- **Correção**: limites reduzidos para `titulo` 60, `texto` 200, `objecao_provavel` 140, `contorno` 220, `apoio` 120, `justificativa` 300, `texto` da pergunta 160 e `objetivo` 120; truncamento na última palavra mantido. Teste de regressão `report-generator.test.ts:564` gera o teto com `makeMaxArsenal()` e exige `basePages + 3`.
- **Obtido depois**: 3 páginas de Arsenal (7 no total: 4 do diagnóstico + 3), confirmado em `/tmp/arsenal-f6/worst.pdf` e nos PNGs `evidence/worst-page-05..07.png`.

### BUG-02 (pré-existente, fora do escopo) — transbordo do diagnóstico

- **Onde**: `src/lib/report/report-generator.ts` (`pageTwo` do diagnóstico).
- **Reprodução**: fixture da T22/T26 com 3 dores, 2 concorrentes e 4 insights.
- **Esperado**: card "Estimativa de Impacto" inteiro na página 2.
- **Obtido**: a cauda do card cai sozinha na página 3. Acontece com e sem Arsenal, então não é regressão da feature; o mesmo fixture no PDF sem Arsenal tem 4 páginas com a mesma quebra. Registrado no `smoke-test.md` (item 2) para tarefa própria do relatório.

---

## 6. Commits desta etapa

| Hash | Mensagem |
| --- | --- |
| `62c5448` | `test(comercial): cobre campos e limites do catálogo e do schema` |
| `5f2c0d2` | `test(agents): cobre catálogo completo e sanitização no prompt` |
| `8414169` | `test(report): cobre running head, ordem das seções e serviço` |
| `df01218` | `docs(specs): evidência pós-fix do PDF real do Arsenal` |
| este commit | `docs(specs): relatório de testes do Arsenal Comercial` |

Somente testes, fixtures, evidências e documentação foram tocados; nenhum arquivo de `src/` de produção, `supabase/` ou `docs/` foi alterado. Nenhum push, PR, deploy, e-mail ou acesso a Supabase remoto.

---

## 7. Veredito

**PASS** — 46/46 ARS cobertos, 884 testes passed / 5 skipped, gates (typecheck, lint, test, build) verdes, migration re-executável, smokes locais e download pelo admin conferidos após o F1. Nenhum bug bloqueante; BUG-01 e BUG-02 ficam registrados como limitações não bloqueantes.
