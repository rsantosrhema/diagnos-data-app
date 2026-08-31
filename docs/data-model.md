# Modelo de Dados — Diagnos Data App

Documento **vivo** do modelo de dados (Supabase/PostgreSQL). Este é o ponto único de referência para o schema. **Sempre que o schema mudar, atualize este documento no mesmo commit da migration** (ver [Como manter atualizado](#como-manter-atualizado)).

## Diagrama (Mermaid ER)

```mermaid
erDiagram
    leads ||--o| diagnostics : "tem"
    leads ||--o| assessment_responses : "tem"
    leads ||--o| market_insights : "tem"

    leads {
        uuid id PK
        text name
        text company "nullable"
        text phone "nullable"
        citext email UK
        text role
        text status "pendente | concluido"
        boolean consent
        timestamptz consent_at "nullable"
        timestamptz created_at
    }
    diagnostics {
        uuid id PK
        uuid lead_id FK UK
        numeric overall_score
        smallint overall_level
        jsonb dimension_scores
        jsonb narrative
        jsonb chart_data
        text pdf_path "nullable, nao usado no codigo"
        timestamptz created_at
    }
    assessment_responses {
        uuid id PK
        uuid lead_id FK UK
        jsonb context
        jsonb answers
        jsonb commercial_answer
        jsonb consent
        jsonb agent_payload
        timestamptz created_at
    }
    market_insights {
        uuid id PK
        uuid lead_id FK UK
        jsonb research
        jsonb analysis
        jsonb insights
        jsonb sources
        text status
        text error
        timestamptz created_at
        timestamptz updated_at
        timestamptz queued_at
        timestamptz processing_started_at
        timestamptz completed_at
        integer attempts
    }
    leads ||--o| analysis_job_logs : "registra"
    analysis_job_logs {
        uuid id PK
        uuid lead_id FK
        text step
        text message
        integer duration_ms
        timestamptz created_at
    }
```

## Visão Geral

O modelo gira em torno de **`leads`** (o cliente). Cada lead pode ter:

- **Um `assessment_response`** — respostas completas da autoavaliação + `agent_payload` consumido pelos agentes de análise (1:1).
- **Um `diagnostic`** — resultado do diagnóstico (1:1).
- **Um `market_insights`** — resultado do pipeline de agentes (research, analysis, insights + fontes) por lead (1:1), preenchido em background pelo worker de análise quando o gerente clica em "Gerar relatório".

> As tabelas `access_tokens`, `sessions` e `session_drafts` do fluxo antigo de token foram removidas na migration `0008_remove_token_flow` (junto com a RPC `mark_expired_tokens` e o status `token_gerado` de leads).

Todas as tabelas têm **RLS habilitado sem policies** para `anon`/`authenticated` — o acesso é feito apenas via **service-role** (server-side). Gerentes são gerenciados pelo **Supabase Auth** (`auth.users`), sem tabela própria.

---

## Referência das Tabelas

### `leads`

| Coluna | Tipo | Constraints |
| --- | --- | --- |
| `id` | `uuid` | PK, default `gen_random_uuid()` |
| `name` | `text` | not null |
| `company` | `text` | nullable |
| `phone` | `text` | nullable |
| `email` | `citext` | not null, **unique** (case-insensitive) |
| `role` | `text` | not null |
| `status` | `text` | not null, default `'pendente'`, **check** in (`pendente`,`concluido`) |
| `consent` | `boolean` | not null, default `false` |
| `consent_at` | `timestamptz` | nullable |
| `created_at` | `timestamptz` | not null, default `now()` |

**Ciclo de status**: `pendente` (cadastro na landing) → `concluido` (submit do screener). Leads `pendente` podem ser reutilizados por novo cadastro do mesmo email; leads `concluido` são bloqueados (409).

**RLS**: habilitado, sem policies (service-role only).

### `diagnostics`

| Coluna | Tipo | Constraints |
| --- | --- | --- |
| `id` | `uuid` | PK, default `gen_random_uuid()` |
| `lead_id` | `uuid` | not null, **FK** → `leads(id)` `on delete cascade`, **unique** (1:1) |
| `overall_score` | `numeric(3,2)` | not null, **check** 0–5 |
| `overall_level` | `smallint` | not null, **check** 0–5 |
| `dimension_scores` | `jsonb` | not null, default `'[]'` |
| `narrative` | `jsonb` | not null, default `'{}'` |
| `chart_data` | `jsonb` | not null, default `'{}'` |
| `pdf_path` | `text` | nullable (não usado no código) |
| `created_at` | `timestamptz` | not null, default `now()` |

**Índices**: `diagnostics_lead_id_idx`.

**RLS**: habilitado, sem policies (service-role only).

### `assessment_responses`

| Coluna | Tipo | Constraints |
| --- | --- | --- |
| `id` | `uuid` | PK, default `gen_random_uuid()` |
| `lead_id` | `uuid` | not null, **FK** → `leads(id)` `on delete cascade`, **unique** (1:1) |
| `context` | `jsonb` | not null |
| `answers` | `jsonb` | not null |
| `commercial_answer` | `jsonb` | not null |
| `consent` | `jsonb` | not null |
| `agent_payload` | `jsonb` | not null (lido pelo worker de análise) |
| `created_at` | `timestamptz` | not null, default `now()` |

**Índices**: `assessment_responses_lead_id_idx`.

**RLS**: habilitado, sem policies (service-role only).

### `market_insights`

| Coluna | Tipo | Constraints |
| --- | --- | --- |
| `id` | `uuid` | PK, default `gen_random_uuid()` |
| `lead_id` | `uuid` | not null, **FK** → `leads(id)` `on delete cascade`, **unique** (1:1) |
| `research` | `jsonb` | not null, default `'{}'` |
| `analysis` | `jsonb` | not null, default `'{}'` |
| `insights` | `jsonb` | not null, default `'[]'` |
| `sources` | `jsonb` | not null, default `'[]'` |
| `status` | `text` | not null, default `'pendente'`, **check** in (`pendente`,`processando`,`analisado`,`falha`) |
| `error` | `text` | nullable |
| `created_at` | `timestamptz` | not null, default `now()` |
| `updated_at` | `timestamptz` | not null, default `now()` |
| `queued_at` | `timestamptz` | nullable (preenchido no enqueue) |
| `processing_started_at` | `timestamptz` | nullable (preenchido no `read` da fila) |
| `completed_at` | `timestamptz` | nullable (preenchido no ack de sucesso) |
| `attempts` | `integer` | not null, default `0` (incrementado a cada `read`) |

**Índices**: `market_insights_lead_id_idx`.

**RLS**: habilitado, sem policies (service-role only).

**Fila**: os jobs de análise são enfileirados na fila `analysis_jobs` (extensão `pgmq`) via wrappers `security definer` `analysis_queue_enqueue(uuid)` / `analysis_queue_read()` / `analysis_queue_ack(...)` / `analysis_queue_requeue(...)` / `analysis_queue_stats()`, chamados pelo service-role através de `supabase.rpc`. Semântica **read + ack/archive** (ADR-010): `read` usa visibility timeout de 600s (a mensagem não é apagada ao ler; se o worker cair, ela volta à fila), e `ack` arquiva a mensagem em `pgmq_archived` preservando histórico. A fila é independente do PostgREST (não exposta a `anon`/`authenticated`).

### `analysis_job_logs`

| Coluna | Tipo | Constraints |
| --- | --- | --- |
| `id` | `uuid` | PK, default `gen_random_uuid()` |
| `lead_id` | `uuid` | not null, **FK** → `leads(id)` `on delete cascade` |
| `step` | `text` | not null, **check** in (`enqueued`,`started`,`researcher`,`analyst`,`writer`,`pdf`,`email`,`completed`,`failed`) |
| `message` | `text` | nullable (ex.: mensagem de erro no `failed`) |
| `duration_ms` | `integer` | nullable (duração da etapa, quando aplicável) |
| `created_at` | `timestamptz` | not null, default `now()` |

**Índices**: `analysis_job_logs_lead_created_idx`, `analysis_job_logs_created_idx`.

**RLS**: habilitado, sem policies (service-role only).

**Ciclo de eventos**: `enqueued` (no enqueue) → `started`/`researcher`/`analyst`/`writer`/`pdf`/`email` (durante o processamento) → `completed` (sucesso) ou `failed` (falha, com a mensagem de erro).

---

## Como manter atualizado

Este documento é a fonte de verdade do schema. A cada mudança de schema (nova tabela, coluna, constraint, índice ou RLS), **atualize este documento no mesmo commit da migration**:

1. **Diagrama Mermaid** — adicione/altere a entidade e o relacionamento no bloco `erDiagram`.
2. **Referência das tabelas** — atualize a tabela correspondente (colunas, tipos, constraints).
3. **Visão Geral** — ajuste a descrição dos relacionamentos se necessário.
4. **Migration** — a migration SQL e este doc devem ser commitados juntos, para que o histórico de git reflita o schema.

> Regra: **nenhuma migration sem a atualização correspondente deste documento.**

---

## Validação

O script `supabase/scripts/validate_data_model.sql` valida relacionamentos (FK) e constraints (unique, check, cascade) com um lead temporário autossuficiente. Ver `.specs/features/data-model/spec.md` para os critérios de aceite.
