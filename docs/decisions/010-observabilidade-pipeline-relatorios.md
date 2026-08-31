# ADR-010: Observabilidade do pipeline de relatórios (fila visível + log de processamento)

- **Data**: 2026-08-31
- **Status**: Aceito
- **Decisores**: Rafael (tech lead), time comercial
- **Tags**: observabilidade, fila, pgmq, market-insights, admin, relatórios

## Contexto e Declaração do Problema

O relatório de análise é gerado de forma assíncrona: o gerente clica em "Gerar relatório" no painel admin, o job entra na fila `analysis_jobs` (pgmq) e um worker cron processa o pipeline de agentes (ADR-009). Hoje essa fila é opaca:

- `pgmq.pop()` **apaga a mensagem ao ler** (entrega *at-most-once*): se o worker cair no meio, o job se perde sem rastro.
- Nenhum estado de job é persistido — `market_insights` só ganha linha quando o worker **termina**; um job enfileirado e não processado é indistinguível de "nunca foi pedido".
- O status `processando` existia no domínio mas nenhum caminho o escrevia (código morto).
- O painel admin mostrava apenas um badge e KPIs que não mudavam — o gerente não sabe se o relatório está na fila, em que etapa está, nem por que falhou.

Objetivo: dar visibilidade total ao gerente (estado por job + log das etapas dos agentes) e tornar a fila resiliente a falhas de worker.

## Drivers da Decisão

- O comercial precisa saber **onde** o relatório está: na fila, processando (em qual etapa) ou falho (com o motivo).
- Falha de worker não pode perder o job silenciosamente — entrega *at-least-once* dentro de um visibility timeout.
- Custo de LLM/Exa deve ser evitado: não re-enfileirar duplicado para o mesmo lead enquanto houver job em andamento.
- Histórico deve ser preservado para auditoria (arquivamento, não deleção).
- Log deve ser consultável no painel admin sem infraestrutura externa de observabilidade.

## Opções Consideradas

1. **Manter `pgmq.pop()` (at-most-once)** — mudança mínima, mas a "fila" do admin seria derivada só das linhas `market_insights`, sem profundidade real do pgmq e sem retry.
2. **`pgmq.read()` + `ack()`/`archive()` com visibility timeout (600s)** — a mensagem fica invisível por 10 min ao ser lida; se o worker cair, ela volta à fila e é reprocessada; `ack` arquiva em `pgmq_archived`, preservando histórico. (Escolhida.)
3. **Fila externa (Inngest/Trigger.dev/SQS)** — mais infra e custo; o pgmq já vive na stack (Supabase).
4. **Logs apenas no Vercel (console)** — sem estado consultável no admin; o comercial não tem acesso.

## Resultado da Decisão

**Opção 2 — `pgmq.read()` + `ack()`/`archive()` (VT 600s)**, com estado por job em `market_insights` e log por etapa em `analysis_job_logs`.

### Semântica da fila (migration 0009)

- `analysis_queue_enqueue(p_lead_id)` — dedup: se já existe job `pendente`/`processando` para o lead, retorna `{ok, queued:false}` sem re-enfileirar. Cria/atualiza a linha `market_insights` (`pendente`, `queued_at=now()`, `attempts=0`) e grava evento `enqueued`.
- `analysis_queue_read()` — `pgmq.read('analysis_jobs', 600, 1)` (a mensagem **não** é apagada); marca `processando`, `processing_started_at=now()`, `attempts+1` (upsert por `lead_id`); grava evento `started`.
- `analysis_queue_ack(p_msg_id, p_lead_id, p_status, p_error, p_duration_ms)` — `pgmq.archive` (preserva histórico); `analisado`+`completed_at` ou `falha`+`error`; grava evento `completed`/`failed`.
- `analysis_queue_requeue(p_msg_id)` — `pgmq.set_vt(..., 0)` para retry manual.
- `analysis_queue_stats()` — profundidade real da fila (`pgmq.metrics`) + contagens por status.

### Estado e log

`market_insights` ganha `queued_at`, `processing_started_at`, `completed_at`, `attempts`. Nova tabela `analysis_job_logs` (FK `leads` on delete cascade, RLS sem policies) registra um evento por etapa: `enqueued → started → researcher → analyst → writer → pdf → email → completed | failed`, com `duration_ms` e mensagem de erro em `failed`.

### Serviços e rotas

- `analysis-service.enqueue` retorna `{ok, queued}` e **propaga erro** (o admin não vê mais sucesso falso em falha de fila).
- `processNext` usa `read → payload → pipeline → ack`; falha arquiva (`falha` + `last_error`) e mantém o fallback de PDF básico (EMAIL-03).
- Painel admin ganha as seções **"Fila de relatórios"** (estado/tempo na fila/tentativas/erro + profundidade) e **"Log de processamentos"** (timeline dos eventos), com auto-refresh de 15s enquanto houver pendente/processando.
- Duplicação rejeitada com HTTP 409 no reprocess.

## Consequências Positivas

- O gerente vê na hora se o relatório entrou na fila, em que etapa está e o motivo exato de uma falha.
- Falha de worker não perde job: a mensagem volta à fila após 600s e é reprocessada (com `attempts` incrementado).
- Histórico arquivado em `pgmq_archived` + log por etapa permite auditoria e debugging.
- Dedup evita custo duplo de LLM/Exa por clique duplicado.
- `processando` deixa de ser código morto e passa a ser exibido de verdade.

## Consequências Negativas

- Mudança de semântica de entrega (pop → read+ack) exige atualização de testes e do contrato das RPCs.
- Sem `ack` explícito após sucesso, o job pode ser reprocessado se o worker cair entre o sucesso do pipeline e o arquivamento — mitigado pelo upsert idempotente por `lead_id` e pelo contador `attempts`.
- `analysis_job_logs` cresce a cada etapa por relatório — mitigado pelo índice `created_at` e pelo limit de 50 no dashboard.
- Backoff exponencial e alertas de jobs parados continuam como follow-up de ops (fora deste ADR).

## Links

- [ADR-009: Pipeline de agentes para insights de mercado](009-pipeline-agentes-insights-de-mercado.md) — o pipeline cuja fila este ADR torna observável
- [ADR-001: Usar Supabase como datastore](001-usar-supabase-como-datastore.md) — pgmq e `market_insights`
- [ADR-007: Arquitetura em Camadas no Backend](007-arquitetura-em-camadas-backend.md) — serviços e rotas tocados
- [docs/data-model.md](../data-model.md) — schema atualizado (migration 0009)
