# Modelo de Dados — Diagnos Data App

Documento **vivo** do modelo de dados (Supabase/PostgreSQL). Este é o ponto único de referência para o schema. **Sempre que o schema mudar, atualize este documento no mesmo commit da migration** (ver [Como manter atualizado](#como-manter-atualizado)).

## Diagrama (Mermaid ER)

```mermaid
erDiagram
    leads ||--o{ access_tokens : "tem"
    leads ||--o| sessions : "tem"
    leads ||--o| session_drafts : "tem"
    leads ||--o| diagnostics : "tem"

    leads {
        uuid id PK
        text name
        text company
        text phone
        citext email UK
        text role
        text status
        timestamptz created_at
    }
    access_tokens {
        uuid id PK
        uuid lead_id FK
        text token_hash UK
        text status
        timestamptz expires_at
        timestamptz used_at
        timestamptz sent_at
        timestamptz created_at
    }
    sessions {
        text token_hash PK
        uuid lead_id FK
        timestamptz expires_at
        timestamptz created_at
    }
    session_drafts {
        uuid id PK
        uuid lead_id FK UK
        jsonb answers
        timestamptz updated_at
    }
    diagnostics {
        uuid id PK
        uuid lead_id FK UK
        numeric overall_score
        smallint overall_level
        jsonb dimension_scores
        jsonb narrative
        jsonb chart_data
        text pdf_path
        timestamptz created_at
    }
```

## Visão Geral

O modelo gira em torno de **`leads`** (o cliente). Cada lead pode ter:

- **Vários `access_tokens`** — histórico de tokens de acesso (um ativo `disponivel` por vez).
- **Uma `session`** — sessão ativa do cliente (2h).
- **Um `session_draft`** — rascunho do formulário (1:1).
- **Um `diagnostic`** — resultado do diagnóstico (1:1).

Todas as tabelas têm **RLS habilitado sem policies** para `anon`/`authenticated` — o acesso é feito apenas via **service-role** (server-side). Gerentes são gerenciados pelo **Supabase Auth** (`auth.users`), sem tabela própria.

---

## Referência das Tabelas

### `leads`

| Coluna | Tipo | Constraints |
| --- | --- | --- |
| `id` | `uuid` | PK, default `gen_random_uuid()` |
| `name` | `text` | not null |
| `company` | `text` | not null |
| `phone` | `text` | not null |
| `email` | `citext` | not null, **unique** (case-insensitive) |
| `role` | `text` | not null |
| `status` | `text` | not null, default `'pendente'`, **check** in (`pendente`,`token_gerado`,`concluido`) |
| `created_at` | `timestamptz` | not null, default `now()` |

**RLS**: habilitado, sem policies (service-role only).

### `access_tokens`

| Coluna | Tipo | Constraints |
| --- | --- | --- |
| `id` | `uuid` | PK, default `gen_random_uuid()` |
| `lead_id` | `uuid` | not null, **FK** → `leads(id)` `on delete cascade` |
| `token_hash` | `text` | not null, **unique** (SHA-256 hex; nunca texto puro) |
| `status` | `text` | not null, default `'disponivel'`, **check** in (`disponivel`,`cancelado`,`usado`,`expirado`) |
| `expires_at` | `timestamptz` | not null |
| `used_at` | `timestamptz` | nullable |
| `sent_at` | `timestamptz` | nullable |
| `created_at` | `timestamptz` | not null, default `now()` |

**Índices**: `one_active_token` (partial unique em `lead_id` where `status='disponivel'`), `access_tokens_lead_id_idx`, `access_tokens_status_idx`, `access_tokens_expires_at_idx`.

**RLS**: habilitado, sem policies (service-role only).

### `sessions`

| Coluna | Tipo | Constraints |
| --- | --- | --- |
| `token_hash` | `text` | **PK** (hash do token de sessão opaco) |
| `lead_id` | `uuid` | not null, **FK** → `leads(id)` `on delete cascade` |
| `expires_at` | `timestamptz` | not null |
| `created_at` | `timestamptz` | not null, default `now()` |

**Índices**: `sessions_lead_id_idx`, `sessions_expires_at_idx`.

**RLS**: habilitado, sem policies (service-role only).

### `session_drafts`

| Coluna | Tipo | Constraints |
| --- | --- | --- |
| `id` | `uuid` | PK, default `gen_random_uuid()` |
| `lead_id` | `uuid` | not null, **FK** → `leads(id)` `on delete cascade`, **unique** (1:1) |
| `answers` | `jsonb` | not null, default `'{}'` |
| `updated_at` | `timestamptz` | not null, default `now()` |

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
| `pdf_path` | `text` | nullable |
| `created_at` | `timestamptz` | not null, default `now()` |

**Índices**: `diagnostics_lead_id_idx`.

**RLS**: habilitado, sem policies (service-role only).

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

O script `supabase/scripts/validate_data_model.sql` valida relacionamentos (FK) e constraints (unique, check, cascade) com dados de teste. Ver `.specs/features/data-model/spec.md` para os critérios de aceite.
