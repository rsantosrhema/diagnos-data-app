# Observabilidade do Pipeline de Relatórios Specification

## Problem Statement

O relatório é gerado de forma assíncrona: o gerente clica em "Gerar relatório" no painel admin, o job vai para a fila `pgmq (analysis_jobs)` e um worker cron o processa. Hoje não existe observabilidade dessa fila: `pgmq.pop()` apaga a mensagem ao ler (entrega *at-most-once*), nenhum estado de job é persistido, `market_insights` só ganha linha quando o worker termina, e o painel admin mostra apenas um badge e KPIs que não mudam. O gerente não consegue ver se o relatório está na fila, se está processando, em que etapa do pipeline ele está, nem o motivo de uma falha. Jobs perdidos por falha do worker são silenciosos e a fila parece sempre vazia.

## Goals

- [ ] O painel admin mostra uma área "Fila de relatórios" com o estado de cada job (pendente/processando/analisado/falha), tempo na fila e profundidade real da fila pgmq
- [ ] O painel admin mostra um "Log de processamentos" com os eventos de cada etapa do pipeline (enqueued, started, researcher, analyst, writer, pdf, email, completed, failed) e timestamps
- [ ] A fila passa a usar `read()` + `ack()`/`archive()` com visibility timeout, permitindo retry automático se o worker cair e preservando histórico
- [ ] A geração não enfileira jobs duplicados para o mesmo lead

## Out of Scope

| Feature | Reason |
| --- | --- |
| Retry com backoff exponencial por tentativa | Escopo mínimo: `ack`/`archive` + `requeue` manual; backoff é follow-up de ops |
| Alertas/notificações (email/Slack) sobre jobs parados | Não é o pedido; o log no admin resolve a visibilidade |
| Dashboard de métricas agregadas (tempo médio de processamento, P95) | Não é o pedido; `analysis_job_logs` já coleta os dados para futuro |
| Instrumentação OpenTelemetry/Sentry | Escopo decidido: log em banco + Vercel Function Logs |
| Melhoria visual geral do painel admin | Restrito à nova seção de fila + log |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --- | --- | --- | --- |
| Semântica de entrega da fila | `pgmq.read(..., vt:=600)` + `analysis_queue_ack` (archive) / `analysis_queue_requeue` (set_vt 0) | Decidido com o usuário: `read + ack/archive` para retry automático e histórico. | y |
| Timeout de visibilidade | 600s (10 min) | Pipeline completo (Exa + 3 LLM calls + PDF + email) cabe em 10 min; acima disso o job volta para a fila. | y |
| Registro do log | Nova tabela `analysis_job_logs` com um evento por etapa | Decidido com o usuário: granularidade por etapa dos agentes. | y |
| Duplicação de job por lead | Deduplicar: novo enqueue é rejeitado enquanto existir job `pendente`/`processando` para o lead | Decidido com o usuário. | y |
| Status `processando` | Escrito no `read()` da fila (antes do pipeline), exibido no badge | `processando` hoje é código morto; passa a ser escrito de verdade. | y |
| Nome da tabela do log | `analysis_job_logs` (coluna `step`, não `event`) | Consistente com `market_insights`/`leads`; `step` descreve etapa do pipeline. | y |
| Fallback de PDF básico no erro | Mantém comportamento atual (EMAIL-03) | Mudança de escopo não relacionada; o log registra `failed` antes do fallback. | y |
| `enqueue` do screener (INS-03) | Não afetado: `screen-service` não chama mais `enqueue` (removido no fluxo 0008); `enqueue` retorna `{ok, queued}` | Verificado no código: `screen-service.ts` não referencia `enqueue`/`analysisService`. | y |
| Quem pode ver o log | Somente gerente autenticado (rota admin protegida) | Mesma auth do dashboard existente. | y |

**Open questions:** none — todos resolvidos ou logados acima.

---

## User Stories

### P1: Estado por job na fila ⭐ MVP

**User Story**: Como gerente comercial, quero ver a fila de relatórios com o estado de cada job, para saber se o relatório do meu lead está na fila, processando ou concluído.

**Why P1**: É o pedido central — visibilidade da fila que hoje não existe.

**Acceptance Criteria**:

1. WHEN o gerente gera um relatório com sucesso THEN o sistema SHALL retornar `{ ok: true, queued: true }` e criar uma linha `market_insights` com `status = 'pendente'` e `queued_at` preenchido.
2. WHEN o worker dá `read()` em um job THEN o sistema SHALL atualizar o `status` para `processando`, preencher `processing_started_at` e incrementar `attempts` em 1.
3. WHEN o worker conclui o pipeline com sucesso THEN o sistema SHALL definir `status = 'analisado'` e `completed_at`, e arquivar a mensagem (ack).
4. WHEN o pipeline falha THEN o sistema SHALL definir `status = 'falha'`, registrar o erro em `last_error` e arquivar a mensagem (ack).
5. The system SHALL expor no painel admin, para cada lead com análise, os campos `analysisStatus`, `queuedAt`, `processingStartedAt`, `attempts`, `errorMessage` e `ageSeconds` (tempo desde o enqueue).
6. The system SHALL exibir no painel admin a profundidade da fila pgmq (jobs aguardando leitura).

**Independent Test**: gerar um relatório → verificar linha `market_insights` `pendente`+`queued_at`; rodar `processNext` → `processando`+`attempts=1`; sucesso → `analisado`; falha → `falha`+`last_error`.

---

### P1: Log de processamentos por etapa ⭐ MVP

**User Story**: Como gerente comercial, quero ver o log de processamento de cada relatório com as etapas dos agentes, para saber onde o relatório está travado ou por que falhou.

**Why P1**: Sem as etapas, "processando" não diz nada sobre progresso nem sobre o motivo da falha.

**Acceptance Criteria**:

7. WHEN o worker processa um job THEN o sistema SHALL registrar um evento em `analysis_job_logs` para cada etapa (`enqueued`, `started`, `researcher`, `analyst`, `writer`, `pdf`, `email`, `completed`, `failed`) com timestamp e, quando aplicável, `duration_ms`.
8. WHEN o pipeline falha THEN o sistema SHALL registrar o evento `failed` com a mensagem de erro no campo `message` de `analysis_job_logs`.
9. The system SHALL retornar os últimos eventos (limit 50) do log de processamentos no endpoint de dashboard admin, com o nome do lead em cada evento.
10. The system SHALL exibir no painel admin os eventos do log em ordem cronológica decrescente, com etapa, lead, timestamp e erro quando houver.

**Independent Test**: rodar `processNext` com mocks → verificar eventos `started`/`researcher`/`analyst`/`writer`/`pdf`/`email`/`completed` gravados em ordem; com orchestrator lançando → evento `failed` com a mensagem.

---

### P2: Deduplicação de jobs por lead

**User Story**: Como gerente comercial, quero que um segundo clique em "Gerar relatório" enquanto o job ainda está pendente/processando seja rejeitado com mensagem clara, para não gerar relatórios duplicados nem custo duplo de LLM.

**Why P2**: Evita desperdício de custo e confusão; baixo custo de implementação.

**Acceptance Criteria**:

11. WHEN o gerente clica em "Gerar relatório" para um lead que já tem job `pendente` ou `processando` THEN o sistema SHALL responder `{ ok: true, queued: false }` sem re-enfileirar, e a UI SHALL exibir a mensagem "Relatório já está na fila/em processamento".
12. WHEN o job está `analisado`, `falha` ou inexistente THEN o sistema SHALL permitir novo enqueue (`queued: true`).
13. The system SHALL considerar `analise_pendente`/`concluido` de `leads.status` como estados elegíveis para reenfileirar (sem regressão do fluxo atual).

**Independent Test**: enfileirar 2x para o mesmo lead → segundo retorna `{ok:true, queued:false}`; reprocessar um lead `falha` → `{ok:true, queued:true}`.

---

## Edge Cases

- IF a fila pgmq estiver indisponível no enqueue THEN o sistema SHALL responder erro 5xx ao gerente (não sucesso falso), mantendo log em Vercel.
- IF o worker cair no meio do processamento THEN a mensagem SHALL retornar à fila após o visibility timeout e ser reprocessada (novo `attempts`).
- IF `market_insights` não tem linha para um lead que apareceu na fila THEN o sistema SHALL criar a linha no `read()` (upsert por `lead_id`), evitando perda de estado.
- IF o pipeline falha mas o payload existe THEN o sistema SHALL enviar o PDF básico de fallback (comportamento EMAIL-03 mantido) e registrar `failed` antes disso.
- IF não há jobs na fila THEN o dashboard SHALL mostrar profundidade 0 e estado vazio nas seções de fila.

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| --- | --- | --- | --- |
| OBS-01 | P1: Estado por job na fila | Design | Pending |
| OBS-02 | P1: Estado por job na fila | Design | Pending |
| OBS-03 | P1: Estado por job na fila | Design | Pending |
| OBS-04 | P1: Estado por job na fila | Design | Pending |
| OBS-05 | P1: Estado por job na fila | Design | Pending |
| OBS-06 | P1: Estado por job na fila | Design | Pending |
| OBS-07 | P1: Log de processamentos | Design | Pending |
| OBS-08 | P1: Log de processamentos | Design | Pending |
| OBS-09 | P1: Log de processamentos | Design | Pending |
| OBS-10 | P1: Log de processamentos | Design | Pending |
| OBS-11 | P2: Deduplicação de jobs | Design | Pending |
| OBS-12 | P2: Deduplicação de jobs | Design | Pending |
| OBS-13 | P2: Deduplicação de jobs | Design | Pending |

**Coverage:** 13 total, 0 mapped to tasks, 13 unmapped ⚠️

---

## Success Criteria

- [ ] O gerente gera um relatório e vê imediatamente na seção "Fila de relatórios" o lead com status pendente e o tempo na fila
- [ ] Durante o processamento, o gerente vê o status "processando" e os eventos das etapas no log
- [ ] Em caso de falha, o gerente vê o motivo exato no log e no badge da tabela
- [ ] Clicar duas vezes em "Gerar relatório" não enfileira job duplicado
