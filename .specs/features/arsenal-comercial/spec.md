# Arsenal Comercial Specification

## Problem Statement

O PDF que o gerente baixa no admin e recebe por e-mail traz o diagnóstico e a análise de mercado, mas não ajuda a conduzir a reunião de venda: faltam pontos de pauta, respostas a objeções, o serviço certo a ofertar e perguntas de descoberta. O vendedor monta isso à mão. Um agente comercial com a skill de SPIN Selling deve gerar esse material a partir do diagnóstico, da análise e dos insights, cruzado com os serviços da Rhema Data, como uma seção "Arsenal Comercial" no mesmo PDF.

## Goals

- [ ] Todo relatório gerado com sucesso inclui, no mesmo PDF, 3 páginas de Arsenal Comercial com os 4 blocos pedidos, no design system do relatório.
- [ ] Falha do agente comercial nunca impede o relatório: o PDF sai sem o Arsenal e o motivo fica no log do admin.
- [ ] O Arsenal fica restrito ao gerente: não aparece no portal do cliente nem em rota pública.
- [ ] Catálogo de serviços e grupos de objeção são dados versionados, substituíveis sem mudar código.

## Out of Scope

| Feature | Reason |
| ------- | ------ |
| Separar o worker em outro container ou mudar onde/como o PDF é gerado | Decidido pelo dono (AD-013) |
| Versão "cliente" do PDF e Arsenal no portal `/r` | Decidido pelo dono: Arsenal é interno |
| Visualizar o Arsenal na tela do admin | Adiado (context.md, Deferred Ideas) |
| Regenerar só o Arsenal sem reprocessar o relatório | Adiado; "Gerar relatório" cobre |
| Catálogo real de serviços, preços, prazos e cases | O dono ainda não enviou; seed é rascunho |
| Push, PR, deploy, Coolify, Supabase remoto | Tudo local; exige autorização explícita |

---

## Assumptions & Open Questions

Nenhuma linha abaixo foi confirmada pelo usuário: o coordenador encerrou sem responder ao checkpoint 1 e o planejador adotou os defaults recomendados. Trocar qualquer um antes do Execute é barato.

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --------------------- | -------------- | --------- | ---------- |
| Origem do catálogo e das objeções | `docs/comercial/servicos.json` e `objecoes.json`, `status: "rascunho"`, Zod no load, enums derivados | Dono ainda não enviou o conteúdo; troca vira mudança de dado | y (usuário, 2026-11-24) |
| Seed de serviços | 7 serviços: `diagnostico-360`, `governanca`, `qualidade-mestres`, `arquitetura-integracao`, `analytics-bi`, `seguranca-lgpd`, `ia-analytics-avancado` | Um por frente DMBOK2 mais o Diagnóstico 360 já citado em `docs/rules/architecture.md` | y (usuário, 2026-11-24) |
| Seed de grupos de objeção | 6 grupos: `preco`, `timing`, `ja-temos`, `confianca`, `risco-dados`, `decisao` | Cobrem as objeções típicas de venda consultiva de dados | y (usuário, 2026-11-24) |
| Nota de catálogo preliminar | O PDF mostra "Catálogo de serviços preliminar: validar antes de ofertar" enquanto `status` for `rascunho` | Evita que um serviço rascunho seja ofertado como oficial | y (usuário, 2026-11-24) |
| Tamanho do Arsenal | 3 a 5 pontos-chave; 3 a 6 objeções (1 por grupo); 1 serviço + até 2 complementares; 10 perguntas | Cabe em 3 páginas A4 e respeita o pedido (10 perguntas) | y (usuário, 2026-11-24) |
| Mix das perguntas | ≥4 abertas, ≥3 fechadas, ≤1 Situação, ≥2 de cada Problema/Implicação/Necessidade | O screener já respondeu a Situação; foco SPIN em dor e valor | y (usuário, 2026-11-24) |
| Limites de texto | Campo acima do limite é truncado na última palavra com "…", como `clampedOptionalString` | Padrão existente; evita rejeitar saída útil do LLM | y (usuário, 2026-11-24) |
| Guardrail de conteúdo | Prompt proíbe inventar cases, números de clientes, preços, prazos e ROI | Material vai para a mão do vendedor; invenção vira promessa | y (usuário, 2026-11-24) |
| Retry do Arsenal | Nenhum retry de job; só as 3 tentativas internas de schema | Falha do Arsenal não pode reabrir o pipeline principal | y (usuário, 2026-11-24) |
| Reprocesso | `arsenal` é sempre sobrescrito, inclusive com `null` | Nunca mistura diagnóstico novo com Arsenal antigo | y (usuário, 2026-11-24) |
| Arsenal persistido inválido no download | PDF sem Arsenal, sem erro | Catálogo pode mudar depois da geração | y (usuário, 2026-11-24) |
| Fonte dos pontos de decisão da skill SPIN | `docs/agents/skills/comercial/spin-selling.md`, texto por conta do planejador | Mesmo padrão das skills de segmento | y (usuário, 2026-11-24) |
| Chamadas ao LLM na verificação local | No máximo 2 execuções do agente comercial, sem e-mail | Limite do dono; chaves de LLM são reais | y |

**Open questions:** none - all resolved or logged above.

---

## User Stories

### P1: Catálogo e grupos de objeção como dados ⭐ MVP

**User Story**: Como gerente, quero que serviços e grupos de objeção venham de arquivos de dados, para trocar o catálogo rascunho pelo oficial sem deploy de código.

**Why P1**: O agente e o PDF dependem dos ids do catálogo.

**Acceptance Criteria**:
1. The system SHALL load `docs/comercial/servicos.json` at module load, validated by a strict Zod schema where each service has `id` matching `^[a-z0-9-]+$`, `nome`, `resumo`, `dimensoes` (non-empty, each in `DIMENSION_IDS`) and `quando_indicar`. <!-- ARS-01 -->
2. IF the services file has a duplicate `id` or a `dimensoes` entry outside `DIMENSION_IDS` THEN the schema SHALL reject it with an issue naming the offending value. <!-- ARS-02 -->
3. The system SHALL load `docs/comercial/objecoes.json` at module load, validated by a strict Zod schema where each group has `id` matching `^[a-z0-9-]+$`, `nome` and `descricao`, and reject duplicate `id`. <!-- ARS-03 -->
4. The seed files SHALL have `status` equal to `"rascunho"`, exactly the 7 service ids and the 6 group ids listed in Assumptions, in that order. <!-- ARS-04 -->
5. The catalog module SHALL export `SERVICE_IDS` and `OBJECTION_GROUP_IDS` derived from the files, plus `getService(id)` and `getObjectionGroup(id)` returning the entry or `undefined`. <!-- ARS-05 -->

**Independent Test**: `src/lib/comercial/catalog.test.ts` com os arquivos reais e fixtures inválidas.

---

### P1: Agente comercial com skill SPIN ⭐ MVP

**User Story**: Como gerente, quero um agente que cruze o diagnóstico com os serviços e devolva o Arsenal validado, para chegar à reunião com material pronto.

**Why P1**: É o núcleo da feature.

**Acceptance Criteria**:
1. The schema `commercialArsenalSchema` SHALL be strict and require `pontos_chave` with 3 to 5 items, each with `titulo` (≤70), `texto` (≤300) and `dimensao_ids` (non-empty, each in `DIMENSION_IDS`). <!-- ARS-06 -->
2. The schema SHALL require `objecoes` with 3 to 6 items, each with `grupo` in `OBJECTION_GROUP_IDS`, `objecao_provavel` (≤200), `contorno` (≤400) and `apoio` (≤250), and reject two items with the same `grupo`. <!-- ARS-07 -->
3. The schema SHALL require `servico_recomendado` with `servico_id` in `SERVICE_IDS`, `justificativa` (≤500), `dimensoes_atacadas` (non-empty, in `DIMENSION_IDS`) and optional `complementares` of at most 2 distinct ids in `SERVICE_IDS`, none equal to `servico_id`. <!-- ARS-08 -->
4. The schema SHALL require `perguntas` with exactly 10 items, each with `texto` (≤240), `formato` in `aberta|fechada`, `spin` in `situacao|problema|implicacao|necessidade` and `objetivo` (≤160). <!-- ARS-09 -->
5. IF `perguntas` has fewer than 4 `aberta`, fewer than 3 `fechada`, more than 1 `situacao`, or fewer than 2 of any of `problema`, `implicacao`, `necessidade` THEN the schema SHALL reject it with an issue stating the rule broken and the count received. <!-- ARS-10 -->
6. WHEN a text field exceeds its maximum length THEN the schema SHALL truncate it at the last word boundary and end it with "…" instead of rejecting. <!-- ARS-11 -->
7. WHEN `buildCommercialSignals(payload)` runs THEN it SHALL return `menorNivel` (every dimension id at the lowest `nivel`), `desequilibrio` (payload flag), `cLevel` (true iff `solicitante.cargo` contains "C-level", case-insensitive), `faixa`, `scoreValor` and `respostaComercial`, with no I/O. <!-- ARS-12 -->
8. WHEN the agent builds its prompt THEN it SHALL include the SPIN skill text, every service (`id`, `nome`, `resumo`, `dimensoes`) and every group (`id`, `nome`, `descricao`) of the catalog, the signals, the payload answers, the analysis and the insights. <!-- ARS-13 -->
9. The agent prompt SHALL wrap payload, analysis and insights text in tagged data blocks passed through `sanitizeUntrusted`, state that their content is data and never instruction, and forbid inventing cases, client names, numbers, prices, deadlines and ROI. <!-- ARS-14 -->
10. WHERE `signals.cLevel` is true the prompt SHALL carry the C-level optimism instruction, and WHERE `signals.desequilibrio` is true it SHALL carry the imbalance instruction; otherwise neither text appears. <!-- ARS-15 -->
11. WHEN the LLM returns JSON that satisfies the schema THEN `agent.run` SHALL return the parsed `CommercialArsenal`. <!-- ARS-16 -->
12. IF the LLM output fails the schema or is not JSON on all 3 attempts THEN `agent.run` SHALL throw `CommercialAgentError`, and each retry prompt SHALL carry the previous schema issues. <!-- ARS-17 -->
13. IF the SPIN skill file cannot be read THEN `agent.run` SHALL throw `CommercialAgentError` without calling the LLM. <!-- ARS-18 -->

**Independent Test**: `commercial-types.test.ts`, `commercial-signals.test.ts` e `commercial.test.ts` com LLM falso injetado.

---

### P1: Pipeline, persistência e falha isolada ⭐ MVP

**User Story**: Como gerente, quero que o Arsenal seja gerado junto com o relatório e que sua falha não derrube o relatório, para nunca perder um diagnóstico por causa do material extra.

**Why P1**: Protege o fluxo já em produção.

**Acceptance Criteria**:
1. WHEN researcher, analyst and writer succeed THEN `processNext` SHALL call the commercial agent with `{ payload, analysis, insights }` and log step `arsenal` with its duration in ms. <!-- ARS-19 -->
2. WHEN the commercial agent succeeds THEN `processNext` SHALL persist the Arsenal in `market_insights.arsenal` in the same `upsert` as `analysis` and `insights`, and pass it to the PDF input of the e-mail. <!-- ARS-20 -->
3. IF the commercial agent throws THEN `processNext` SHALL log `arsenal_failed` with the error message, upsert `arsenal` as `null`, keep status `analisado`, generate the PDF without Arsenal, send the e-mail and ack `analisado` without requeue. <!-- ARS-21 -->
4. WHEN a lead is processed again THEN the `upsert` SHALL always write the `arsenal` key, with the new value or `null`, never leaving the previous Arsenal. <!-- ARS-22 -->
5. IF the pipeline fails in researcher, analyst or writer THEN `processNext` SHALL NOT call the commercial agent, and the final-failure fallback PDF SHALL carry no Arsenal. <!-- ARS-23 -->
6. The migration `0019_market_insights_arsenal.sql` SHALL add nullable column `arsenal jsonb` to `market_insights` and allow steps `arsenal` and `arsenal_failed` in `analysis_job_logs`, and SHALL be re-executable. <!-- ARS-24 -->
7. The repository SHALL select `arsenal` in `findByLeadId`, write it in `upsert`, and `AnalysisJobLogStep` SHALL include `arsenal` and `arsenal_failed`. <!-- ARS-25 -->
8. The admin log SHALL label `arsenal` as "Arsenal comercial (LLM)" and `arsenal_failed` as "Falha no Arsenal comercial", the latter in the error tone. <!-- ARS-26 -->

**Independent Test**: `analysis-service.test.ts`, `market-insights-repo.test.ts`, `components` do admin, migration aplicada no Supabase local.

---

### P1: Arsenal no PDF ⭐ MVP

**User Story**: Como gerente, quero as páginas do Arsenal no mesmo PDF, com a cara do relatório, para levar um único arquivo à reunião.

**Why P1**: É o que o usuário vê.

**Acceptance Criteria**:
1. WHERE `input.arsenal` is present THEN `buildReportChildren` SHALL return the existing diagnostic pages unchanged followed by exactly 3 Arsenal pages. <!-- ARS-27 -->
2. WHERE `input.arsenal` is absent THEN `buildReportChildren` SHALL return exactly the pages it returns today (2 pages, or 3 with analysis or insights). <!-- ARS-28 -->
3. The system SHALL show on each Arsenal page the running head "ARSENAL COMERCIAL · USO INTERNO · CONFIDENCIAL" and the report footer. <!-- ARS-29 -->
4. The Arsenal pages SHALL present, in order, the sections "Pontos-chave para a reunião", "Serviço ideal", "Contorno de objeções" and "Perguntas de descoberta (SPIN)", numbered 01 to 04 with the report's section header. <!-- ARS-30 -->
5. The key-points section SHALL list every `pontos_chave` item with its `titulo`, `texto` and the short names of its dimensions. <!-- ARS-31 -->
6. The service section SHALL show the `nome` of the recommended service from the catalog, its `justificativa`, the names of `dimensoes_atacadas` and, when present, the `nome` of each complementary service. <!-- ARS-32 -->
7. The objections section SHALL group items by the catalog `nome` of their `grupo`, showing `objecao_provavel`, `contorno` and `apoio` for each. <!-- ARS-33 -->
8. The questions section SHALL number the 10 questions "01" to "10", each with a chip "ABERTA" or "FECHADA", the SPIN stage label ("SITUAÇÃO", "PROBLEMA", "IMPLICAÇÃO", "NECESSIDADE") and the `objetivo`. <!-- ARS-34 -->
9. WHILE the catalog `status` is `rascunho` the service section SHALL show the note "Catálogo de serviços preliminar: validar antes de ofertar"; WHILE it is `aprovado` the note SHALL NOT appear. <!-- ARS-35 -->
10. The Arsenal pages SHALL use only colors from the report `COLORS` tokens and the fonts Inter and Poppins. <!-- ARS-36 -->
11. WHEN `generateScreenerPdf` receives an input with Arsenal THEN it SHALL return a buffer starting with `%PDF` whose page count equals the diagnostic pages plus 3. <!-- ARS-37 -->

**Independent Test**: `arsenal-pages.test.ts` e `report-generator.test.ts` com fixture; PNG das páginas para conferência visual.

---

### P1: Download e e-mail com o mesmo conteúdo ⭐ MVP

**User Story**: Como gerente, quero que o "Exportar PDF" traga o mesmo Arsenal que veio por e-mail, para não haver duas versões.

**Why P1**: O PDF é gerado em dois pontos (worker e `getReportPdf`).

**Acceptance Criteria**:
1. WHEN `getReportPdf` runs for a lead whose `market_insights.arsenal` satisfies the schema THEN it SHALL pass that Arsenal to `generatePdf`. <!-- ARS-38 -->
2. IF `market_insights.arsenal` is `null` or fails the schema THEN `getReportPdf` SHALL generate the PDF without Arsenal and SHALL NOT throw. <!-- ARS-39 -->
3. The PDF input built by the worker and the one built by `getReportPdf` SHALL be equal for the same payload, analysis, insights and Arsenal. <!-- ARS-40 -->

**Independent Test**: `admin-service.test.ts` e `analysis-service.test.ts` comparando os dois inputs.

---

### P1: Arsenal restrito ao gerente ⭐ MVP

**User Story**: Como dono, quero garantia de que o cliente nunca vê o Arsenal.

**Why P1**: Contém estratégia de venda e objeções prováveis.

**Acceptance Criteria**:
1. WHEN the portal DTO is built for a lead whose `market_insights` row has an Arsenal THEN the DTO, in public and manager modes, SHALL NOT contain the key `arsenal` nor any Arsenal text. <!-- ARS-41 -->
2. The system SHALL expose the Arsenal only through the existing manager-guarded PDF route and the e-mail to `MANAGER_NOTIFICATION_EMAIL`, adding no new route. <!-- ARS-42 -->

**Independent Test**: `portal-service.test.ts` serializa o DTO e procura o texto; `report-pdf/route.test.ts` existente segue verde (401 sem chave/gerente).

---

### P2: Verificação local ponta a ponta

**User Story**: Como dono, quero evidência local de que migration, PDF, agente real e download funcionam.

**Why P2**: O Verifier e o dono dependem dessa evidência; não muda o produto.

**Acceptance Criteria**:
1. WHEN `0019_market_insights_arsenal.sql` is applied twice with `docker exec -i supabase_db_diagnos-data-app psql -U postgres -d postgres -v ON_ERROR_STOP=1` THEN both runs SHALL exit 0, the column `market_insights.arsenal` SHALL exist and an insert into `analysis_job_logs` with step `arsenal_failed` SHALL succeed. <!-- ARS-43 -->
2. WHEN `npm run pdf:arsenal-sample` runs THEN it SHALL write a PDF from a fixed fixture, with no LLM call, and `npm run pdf:png` SHALL render each page to a PNG in the scratch folder. <!-- ARS-44 -->
3. WHEN the commercial agent runs against the real LLM on the fixture payload, at most 2 times and without sending e-mail, THEN its output SHALL satisfy `commercialArsenalSchema` and the resulting PDF SHALL render the Arsenal pages. <!-- ARS-45 -->
4. WHEN the manager clicks "Exportar PDF" in the local admin (`npm run dev` against the local Supabase) for a lead with a persisted Arsenal THEN the downloaded PDF SHALL contain the Arsenal pages. <!-- ARS-46 -->

**Independent Test**: roteiro e evidências em `.specs/features/arsenal-comercial/smoke-test.md`.

---

## Edge Cases

- WHEN the model returns a `servico_id` outside the catalog THEN the schema SHALL reject it and the agent SHALL retry with the issue in the prompt (ARS-08, ARS-17).
- IF a persisted Arsenal references a service or group removed from the catalog THEN the PDF SHALL render without Arsenal (ARS-39).
- WHEN the analysis exists but `insights.bullets` is empty THEN the agent SHALL still run and the Arsenal SHALL be generated from the payload and the analysis.
- WHEN the lead has no `empresa.nome` THEN the prompt SHALL use "não informada", as the writer does.
- IF the payload `cargo` is empty THEN `signals.cLevel` SHALL be `false`.

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| -------------- | ----- | ----- | ------ |
| ARS-01 | P1: Catálogo | Tasks | In Tasks |
| ARS-02 | P1: Catálogo | Tasks | In Tasks |
| ARS-03 | P1: Catálogo | Tasks | In Tasks |
| ARS-04 | P1: Catálogo | Tasks | In Tasks |
| ARS-05 | P1: Catálogo | Tasks | In Tasks |
| ARS-06 | P1: Agente | Tasks | In Tasks |
| ARS-07 | P1: Agente | Tasks | In Tasks |
| ARS-08 | P1: Agente | Tasks | In Tasks |
| ARS-09 | P1: Agente | Tasks | In Tasks |
| ARS-10 | P1: Agente | Tasks | In Tasks |
| ARS-11 | P1: Agente | Tasks | In Tasks |
| ARS-12 | P1: Agente | Tasks | In Tasks |
| ARS-13 | P1: Agente | Tasks | In Tasks |
| ARS-14 | P1: Agente | Tasks | In Tasks |
| ARS-15 | P1: Agente | Tasks | In Tasks |
| ARS-16 | P1: Agente | Tasks | In Tasks |
| ARS-17 | P1: Agente | Tasks | In Tasks |
| ARS-18 | P1: Agente | Tasks | In Tasks |
| ARS-19 | P1: Pipeline | Tasks | In Tasks |
| ARS-20 | P1: Pipeline | Tasks | In Tasks |
| ARS-21 | P1: Pipeline | Tasks | In Tasks |
| ARS-22 | P1: Pipeline | Tasks | In Tasks |
| ARS-23 | P1: Pipeline | Tasks | In Tasks |
| ARS-24 | P1: Pipeline | Tasks | In Tasks |
| ARS-25 | P1: Pipeline | Tasks | In Tasks |
| ARS-26 | P1: Pipeline | Tasks | In Tasks |
| ARS-27 | P1: PDF | Tasks | In Tasks |
| ARS-28 | P1: PDF | Tasks | In Tasks |
| ARS-29 | P1: PDF | Tasks | In Tasks |
| ARS-30 | P1: PDF | Tasks | In Tasks |
| ARS-31 | P1: PDF | Tasks | In Tasks |
| ARS-32 | P1: PDF | Tasks | In Tasks |
| ARS-33 | P1: PDF | Tasks | In Tasks |
| ARS-34 | P1: PDF | Tasks | In Tasks |
| ARS-35 | P1: PDF | Tasks | In Tasks |
| ARS-36 | P1: PDF | Tasks | In Tasks |
| ARS-37 | P1: PDF | Tasks | In Tasks |
| ARS-38 | P1: Download | Tasks | In Tasks |
| ARS-39 | P1: Download | Tasks | In Tasks |
| ARS-40 | P1: Download | Tasks | In Tasks |
| ARS-41 | P1: Restrito | Tasks | In Tasks |
| ARS-42 | P1: Restrito | Tasks | In Tasks |
| ARS-43 | P2: Verificação | Tasks | In Tasks |
| ARS-44 | P2: Verificação | Tasks | In Tasks |
| ARS-45 | P2: Verificação | Tasks | In Tasks |
| ARS-46 | P2: Verificação | Tasks | In Tasks |

**Coverage:** 46 total, 46 mapped to tasks, 0 unmapped (matriz em `tasks.md`, seção Requirement → Task Coverage)

---

## Success Criteria

- [ ] `npm run typecheck`, `npm run lint`, `npm run test` e `npm run build` passam; a contagem de testes não cai abaixo de 768.
- [ ] Um relatório gerado localmente com a saída real do agente comercial produz um PDF de diagnóstico + 3 páginas de Arsenal, conferido em PNG.
- [ ] Com o agente forçado a falhar, o PDF sai sem Arsenal e o log do admin mostra "Falha no Arsenal comercial".
- [ ] Nenhuma menção ao Arsenal em `src/app/r` nem no DTO do portal.
