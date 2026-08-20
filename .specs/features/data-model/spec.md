# Data Model Specification

## Problem Statement

O banco já tem as tabelas do fluxo de acesso (`leads`, `access_tokens`, `sessions`, `session_drafts`), mas falta a tabela central que persiste o resultado do diagnóstico (`diagnostics`) — sem ela o modelo de dados da aplicação não está completo. Além disso, não há um diagrama/documentação viva do modelo nem dados de teste que comprovem que os relacionamentos e constraints funcionam. Precisamos fechar o modelo, documentá-lo de forma que se mantenha atualizado a cada mudança, e validar com dados de teste que todos os relacionamentos e constraints estão corretos.

## Goals

- [ ] Criar a tabela `diagnostics` (resultado do diagnóstico) ligada a `leads`, fechando o modelo de dados da aplicação.
- [ ] Documentar o modelo de dados completo com diagrama Mermaid em um doc vivo (`docs/data-model.md`) que se mantenha atualizado a cada mudança de schema.
- [ ] Validar com dados de teste que todos os relacionamentos (FK) e constraints (unique, check, cascade) funcionam.

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
| --- | --- |
| Tabelas de RAG / pgvector | Roadmap futuro (ADR-006), sem relação com o modelo atual. |
| Tabela de gerentes | Gerenciados pelo Supabase Auth (`auth.users`), sem tabela própria (decisão do design token-auth). |
| UI / páginas Next.js | Fora do escopo; aqui só schema + documentação + validação. |
| Alterar tabelas existentes (`leads`, `access_tokens`, etc.) | Já aplicadas e funcionando; só documentamos e validamos. |
| Migração de dados de produção | Nenhum dado real a migrar; apenas seed de teste. |

---

## Assumptions & Open Questions

Every ambiguity is resolved or recorded here - nothing is left silently unclear.

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --- | --- | --- | --- |
| Armazenamento do resultado | `diagnostics` com `dimension_scores`, `narrative`, `chart_data` como `jsonb` | Decisão do usuário: seguir `docs/architecture.md` (jsonb), não normalizar. | y |
| Um diagnóstico por lead | `unique (lead_id)` em `diagnostics` | ADR-003: um diagnóstico por cliente; token de uso único. | y |
| Formato do diagrama | Mermaid em markdown em `docs/data-model.md` | Decisão do usuário: versionável, diffável, renderiza no GitHub, fácil de manter em sincronia. | y |
| Dados de teste | Seed migration commitada + script SQL de validação re-executável | Decisão do usuário: seed commitado + validação. | y |
| Onde ficam as migrations | `supabase/migrations/` (novo) + aplicadas via supabase-mcp | Reproduzibilidade; o repo não tinha pasta `supabase/`. | y |
| `overall_score` | `numeric(3,2)` (0.00–5.00) | Escala DAMA-DMBOK 0–5; precisão de 2 casas. | y |
| `overall_level` | `smallint` com `check (0–5)` | Nível de maturidade inteiro 0–5 (CMMI-style). | y |
| `pdf_path` | `text` nullable | PDF pode ser gerado depois; caminho no Supabase Storage. | y |
| Seed em produção | Inserir dados de teste identificáveis (emails `teste@...`) | Usuário pediu validação com dados de teste; marcados para não confundir com leads reais. | y |

**Open questions:** none - all resolved or logged above.

---

## User Stories

### P1: Tabela `diagnostics` (resultado do diagnóstico) ⭐ MVP

**User Story**: As a aplicação, I want persistir o resultado do diagnóstico (score geral, nível, scores por dimensão, narrativa, dados de gráfico, caminho do PDF) ligado ao lead so that o histórico do diagnóstico fique registrado e rastreável.

**Why P1**: É a tabela central que fecha o modelo de dados; sem ela o diagnóstico não tem persistência.

**Acceptance Criteria** (each line is one EARS pattern):

1. WHEN a tabela `diagnostics` é criada THEN the sistema SHALL ter colunas `id` (uuid pk), `lead_id` (uuid not null), `overall_score` (numeric(3,2) not null), `overall_level` (smallint not null), `dimension_scores` (jsonb not null), `narrative` (jsonb not null), `chart_data` (jsonb not null), `pdf_path` (text nullable), `created_at` (timestamptz not null default now()).
2. The sistema SHALL definir `lead_id` como foreign key para `leads(id)` com `on delete cascade`.
3. The sistema SHALL garantir que cada lead tenha no máximo um diagnóstico (constraint `unique (lead_id)`).
4. The sistema SHALL restringir `overall_level` a valores 0–5 via check constraint.
5. The sistema SHALL habilitar RLS em `diagnostics` sem policies para anon/authenticated (acesso apenas via service-role), seguindo o padrão das demais tabelas.

**Independent Test**: Criar a tabela e verificar via `\d diagnostics` que colunas, FK, unique e check existem; inserir um diagnóstico para um lead e confirmar que um segundo insert para o mesmo lead falha.

---

### P1: Documentação viva do modelo de dados com diagrama ⭐ MVP

**User Story**: As a desenvolvedor, I want um documento com diagrama Mermaid e referência das tabelas so that eu entenda o modelo e o mantenha atualizado a cada mudança de schema.

**Why P1**: Sem documentação viva, o modelo fica opaco e desatualizado; o usuário pediu explicitamente.

**Acceptance Criteria**:

1. WHEN `docs/data-model.md` é criado THEN the sistema SHALL conter um diagrama Mermaid ER com todas as tabelas (`leads`, `access_tokens`, `sessions`, `session_drafts`, `diagnostics`) e seus relacionamentos.
2. The sistema SHALL documentar, para cada tabela, suas colunas, tipos, constraints (PK, FK, unique, check) e notas de RLS.
3. The sistema SHALL incluir uma seção "Como manter atualizado" explicando que, a cada mudança de schema, o diagrama e a referência devem ser atualizados no mesmo commit da migration.
4. The sistema SHALL referenciar o doc a partir de `docs/architecture.md` (seção Modelo de Dados) para descoberta.

**Independent Test**: Abrir `docs/data-model.md` e ver o diagrama Mermaid renderizado com as 5 tabelas e FKs; conferir que a seção de manutenção existe e que `architecture.md` linka o doc.

---

### P1: Dados de teste e validação de relacionamentos/constraints ⭐ MVP

**User Story**: As a desenvolvedor, I want um seed de dados de teste e um script de validação so that eu confirme que todos os relacionamentos (FK) e constraints (unique, check, cascade) funcionam.

**Why P1**: O usuário pediu explicitamente validar com dados de teste que o modelo está íntegro.

**Acceptance Criteria**:

1. WHEN o seed de teste é aplicado THEN the sistema SHALL inserir um lead de teste e, para ele, um `access_token`, uma `session`, um `session_draft` e um `diagnostic` (relacionamentos 1:N e 1:1).
2. WHEN o script de validação roda THEN the sistema SHALL confirmar que cada FK aponta para um lead existente (sem órfãos).
3. WHEN o script de validação testa constraints THEN the sistema SHALL confirmar que: `leads.email` é único, `access_tokens.token_hash` é único, `one_active_token` permite só um token `disponivel` por lead, `session_drafts.lead_id` é único, `diagnostics.lead_id` é único, e os checks de `leads.status`, `access_tokens.status` e `diagnostics.overall_level` rejeitam valores inválidos.
4. WHEN o script de validação testa cascade THEN the sistema SHALL confirmar que deletar um lead remove seus `access_tokens`, `sessions`, `session_drafts` e `diagnostics` filhos.
5. IF qualquer validação falha THEN the script SHALL falhar com erro explícito (exception) e status de saída não-zero.
6. The sistema SHALL tornar o script de validação re-executável (idempotente) e o seed identificável (emails `teste@...`).

**Independent Test**: Rodar o seed e o script de validação; ver "PASS" para todos os relacionamentos e constraints; deletar um lead de teste e confirmar cascade.

---

## Edge Cases

Edge cases are usually unwanted-behavior (IF/THEN) or boundary (WHEN) criteria:

- IF um segundo token `disponivel` é inserido para o mesmo lead THEN a constraint `one_active_token` SHALL rejeitar (violação de unique).
- IF um `overall_level` fora de 0–5 é inserido THEN o check constraint SHALL rejeitar.
- IF um `overall_score` com mais de 2 casas decimais ou fora de 0–5 é inserido THEN o tipo `numeric(3,2)` SHALL rejeitar.
- IF um `diagnostics` é inserido com `lead_id` inexistente THEN a FK SHALL rejeitar.
- IF um `access_tokens`/`sessions`/`session_drafts`/`diagnostics` é inserido com `lead_id` inexistente THEN a FK SHALL rejeitar.

---

## Requirement Traceability

Each requirement gets a unique ID for tracking across design, tasks, and validation.

| Requirement ID | Story | Phase | Status |
| --- | --- | --- | --- |
| DM-01 | P1: Tabela diagnostics (colunas/tipos) | Design | Implementing |
| DM-02 | P1: Tabela diagnostics (FK + unique + check + RLS) | Design | Implementing |
| DM-03 | P1: Documentação viva com diagrama | Design | Implementing |
| DM-04 | P1: Seed de dados de teste | Design | Pending |
| DM-05 | P1: Script de validação de relacionamentos/constraints | Design | Pending |

**ID format:** `DM-[NUMBER]`

**Status values:** Pending → In Design → In Tasks → Implementing → Verified

**Coverage:** 5 total, 0 mapped, 5 unmapped ⚠️

---

## Success Criteria

How we know the feature is successful:

- [ ] Tabela `diagnostics` criada com FK, unique e check corretos, fechando o modelo de dados.
- [ ] `docs/data-model.md` com diagrama Mermaid das 5 tabelas e seção de manutenção, linkado de `architecture.md`.
- [ ] Script de validação passa (PASS) confirmando todos os relacionamentos e constraints.
- [ ] Seed de teste identificável e re-executável.
