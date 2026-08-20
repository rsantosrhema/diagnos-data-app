# Data Model Design

**Spec**: `.specs/features/data-model/spec.md`
**Status**: Approved (escopo: schema + documentação + validação; sem UI)

> **Escopo desta entrega:** fechar o modelo de dados com a tabela `diagnostics`, documentar o modelo completo com diagrama Mermaid em `docs/data-model.md`, e validar relacionamentos/constraints com seed + script SQL. As migrations são aplicadas via **supabase-mcp** pelo agente. Nenhuma UI Next.js é tocada.

---

## Architecture Overview

O modelo de dados gira em torno de `leads` (o cliente). Cada lead pode ter: vários `access_tokens` (histórico), uma `session` ativa, um `session_draft` (rascunho do formulário) e — agora — um `diagnostic` (resultado do diagnóstico). Tudo é acessado via service-role (RLS nega anon/authenticated).

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

---

## Components

### Migration: `diagnostics` table

- **Purpose**: Persistir o resultado do diagnóstico por lead.
- **Location**: `supabase/migrations/0003_diagnostics.sql`
- **Interfaces**: DDL (ver Data Models)
- **Dependencies**: Supabase project, tabela `leads` existente
- **Reuses**: padrão das migrations `0001`/`0002` (RLS, service-role)

### Documentação viva: `docs/data-model.md`

- **Purpose**: Diagrama Mermaid + referência das tabelas + seção de manutenção.
- **Location**: `docs/data-model.md`
- **Interfaces**: markdown (renderiza no GitHub)
- **Dependencies**: schema final
- **Reuses**: `docs/architecture.md` (link), ADRs

### Seed de teste: `supabase/migrations/0004_seed_test_data.sql`

- **Purpose**: Inserir dados de teste identificáveis para validar relacionamentos.
- **Location**: `supabase/migrations/0004_seed_test_data.sql`
- **Interfaces**: DML idempotente
- **Dependencies**: migrations 0001–0003
- **Reuses**: nenhum

### Script de validação: `supabase/scripts/validate_data_model.sql`

- **Purpose**: Confirmar FKs, unique/check constraints e cascade; falhar com exception se algo estiver errado.
- **Location**: `supabase/scripts/validate_data_model.sql`
- **Interfaces**: SQL re-executável (DO block com asserts)
- **Dependencies**: seed aplicado
- **Reuses**: nenhum

---

## Data Models

### `diagnostics` (nova)

```sql
create table if not exists public.diagnostics (
  id               uuid primary key default gen_random_uuid(),
  lead_id          uuid not null references public.leads(id) on delete cascade,
  overall_score    numeric(3,2) not null check (overall_score >= 0 and overall_score <= 5),
  overall_level    smallint not null check (overall_level between 0 and 5),
  dimension_scores jsonb not null default '[]'::jsonb,
  narrative        jsonb not null default '{}'::jsonb,
  chart_data       jsonb not null default '{}'::jsonb,
  pdf_path         text,
  created_at       timestamptz not null default now(),
  unique (lead_id)
);

alter table public.diagnostics enable row level security;
-- sem policies para anon/authenticated => acesso negado; service_role bypassa
```

**Decisões:**
- `overall_score numeric(3,2)` — escala 0–5, 2 casas decimais (0.00–5.00).
- `overall_level smallint check (0–5)` — nível inteiro CMMI-style.
- `dimension_scores`/`narrative`/`chart_data` como `jsonb` — decisão do usuário (segue `architecture.md`).
- `unique (lead_id)` — um diagnóstico por lead (ADR-003).
- `on delete cascade` — remover lead remove o diagnóstico.

### Tabelas existentes (documentadas, não alteradas)

`leads`, `access_tokens`, `sessions`, `session_drafts` — conforme migrations `0001`/`0002`. O doc `data-model.md` as referencia com colunas, tipos e constraints.

---

## Error Handling Strategy

| Scenario | Handling |
| --- | --- |
| Violação de unique (email, token_hash, one_active_token, lead_id) | Constraint do Postgres rejeita; script de validação espera a rejeição |
| Violação de check (status, overall_level, overall_score) | Constraint rejeita; script espera a rejeição |
| FK para lead inexistente | Constraint rejeita; script espera a rejeição |
| Cascade ao deletar lead | Script confirma remoção dos filhos |
| Validação falha | `DO` block lança exception → saída não-zero |

---

## Risks & Concerns

| Concern | Location | Impact | Mitigation |
| --- | --- | --- | --- |
| Seed de teste em produção pode poluir | `0004_seed_test_data.sql` | Dados falsos no banco | Emails `teste@...` identificáveis; documentado como seed de validação |
| Doc desatualiza com o schema | `docs/data-model.md` | Diagrama errado | Seção "Como manter atualizado" obriga atualizar no mesmo commit da migration |
| `numeric(3,2)` limita score | `diagnostics.overall_score` | Score > 5 rejeitado | Escala DAMA é 0–5; correto |
| RLS sem policy | `diagnostics` | Acesso negado a anon | Intencional: só service-role (padrão das demais) |

---

## Tech Decisions (only non-obvious ones)

| Decision | Choice | Rationale |
| --- | --- | --- |
| Armazenamento do resultado | jsonb em `diagnostics` | Decisão do usuário; segue `architecture.md` |
| Um diagnóstico por lead | `unique (lead_id)` | ADR-003 |
| Formato do diagrama | Mermaid em `docs/data-model.md` | Decisão do usuário; versionável, renderiza no GitHub |
| Validação | Script SQL com `DO`/asserts re-executável | Decisão do usuário; determinístico, falha com exception |
| Seed | Migration commitada, idempotente, emails `teste@...` | Decisão do usuário; reproduzível |
| Onde ficam migrations | `supabase/migrations/` (novo) | Reproduzibilidade; repo não tinha pasta |
| Harness | **Intocado** — feature vive em `supabase/` + `docs/` | Preserva pureza (ADR-005) |
