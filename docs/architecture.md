# Arquitetura — Diagnos Data App

Visão de alto nível da aplicação de Diagnóstico de Maturidade de Dados. Este documento descreve o fluxo, as camadas, o modelo de dados e as decisões arquiteturais. Decisões detalhadas estão registradas como ADRs em `docs/decisions/`.

## Visão Geral

A aplicação é um **Next.js** (App Router) que executa um diagnóstico de maturidade de dados como **triagem de lead-gen**. O fluxo é:

1. **Landing page** — o visitante se cadastra (nome, empresa, telefone, email, cargo) e é redirecionado direto para o formulário. Emails duplicados reutilizam o lead pendente; email já concluído é rejeitado (409).
2. **Formulário** — o lead responde o questionário (perfil da empresa + 10 dimensões DAMA-DMBOK + 1 pergunta comercial + consentimento).
3. **Scoring determinístico** — as respostas são pontuadas com fórmula fixa (contrato JSON), sem LLM.
4. **Persistência** — lead, respostas e diagnóstico são salvos no Supabase. Nenhum PDF é gerado neste ponto.
5. **Relatório sob demanda** — o **gerente comercial**, no painel `/admin`, clica em "Gerar relatório" para um lead; o worker de análise roda os agentes, gera o PDF (`@react-pdf/renderer`) e envia por email (Resend).

## Camadas

```
┌─────────────────────────────────────────────────────────────┐
│  Next.js (src/) — App Router                                 │
│  Landing · /diagnostico (formulário screener) · /admin       │
│  /api/public-proxy/* → (injeta INTERNAL_API_KEY) → /api/*    │
│  /api/admin-proxy/*  → (injeta INTERNAL_API_KEY) → /api/admin/*│
│  src/lib/agents/ → pipeline de análise (Exa + LLM)           │
│  src/lib/report/ → gerador PDF (@react-pdf/renderer)         │
│  src/lib/email/  → envio via Resend                          │
│  Supabase client → leads, assessments, diagnostics, insights │
└──────────────────────────────────────────────────────────────┘
```

- **Routes** (thin): auth/`INTERNAL_API_KEY`, validação Zod, mapeamento de erro.
- **Services** (`src/lib/service/`): lógica de negócio (lead, screen, admin, analysis); lançam erros tipados.
- **Repositories** (`src/lib/repository/`): acesso a dados via Supabase, seleção explícita de colunas.
- **DTOs** (`src/lib/dto/`): formatos seguros retornados ao cliente.

## Fluxo de Processo

```
Cliente → Landing (cadastro) → cria/reutiliza lead (Supabase) → /diagnostico
Submit → POST /api/public-proxy/screener → /api/screener
       → screenService.submitScreener:
           honeypot → resolve lead (leadId da sessionStorage ou email)
           → bloqueia reenvio (409) → computa scores (contrato JSON)
           → persiste assessment_responses + diagnostics → lead.status = concluido
       → tela de sucesso (sem PDF, sem email)

Gerente → /admin (login Supabase Auth) → "Gerar relatório"
        → POST /api/admin-proxy/analysis/reprocess → /api/admin/analysis/reprocess
        → adminService.generateReport → enfileira job (pgmq analysis_jobs)
Worker (cron 5min) → roda agentes (researcher Exa + analyst/writer LLM)
        → market_insights.status = analisado → PDF enriquecido → email ao gerente (Resend)
```

## Modelo de Dados (Supabase/PostgreSQL)

> **Documento vivo:** o modelo completo, com diagrama Mermaid e referência de todas as tabelas, está em [data-model.md](data-model.md). Atualize-o no mesmo commit de qualquer mudança de schema.

- **leads** — `id`, `name`, `email`, `company`, `role`, `status` (`pendente`|`concluido`), `created_at`
- **assessment_responses** — respostas do screener + payload do agente, `lead_id` (1:1)
- **diagnostics** — `id`, `lead_id`, `overall_score`, `overall_level`, `dimension_scores` (jsonb), `narrative` (jsonb), `chart_data` (jsonb), `created_at` (1:1)
- **market_insights** — resultado do pipeline de agentes (research, analysis, insights, fontes, status), `lead_id` (1:1)

> As tabelas `access_tokens`, `sessions` e `session_drafts` (fluxo antigo de token) foram removidas na migration `0008_remove_token_flow`.

## Integrações

| Integração | Tecnologia | ADR |
| --- | --- | --- |
| Banco de dados + Storage | Supabase (PostgreSQL gerenciado) | [ADR-001](decisions/001-usar-supabase-como-datastore.md) |
| Email (PDF) | Resend | [ADR-002](decisions/002-usar-resend-para-email.md) |
| ~~Token de acesso único~~ (superseded — cadastro direto) | — | [ADR-003](decisions/003-usar-token-de-acesso-unico.md) |
| Relatório PDF | @react-pdf/renderer | [ADR-004](decisions/004-usar-react-pdf-renderer.md) |
| Triagem (scoring) | Contrato JSON determinístico (sem LLM) | [ADR-008](decisions/008-diagnostico-maturidade-dados-como-lead-gen.md) |
| Pipeline de agentes + fila | pgmq + Exa + LLM | [ADR-009](decisions/009-pipeline-agentes-insights-de-mercado.md) |

## Roadmap Futuro

- **IA / agente LLM** no diagnóstico pago (Diagnóstico 360°), consumindo o `agent_payload` já montado no screener.
- **RAG com pgvector** no Supabase para personalizar as análises por cliente, aproveitando diagnósticos anteriores. Ver [ADR-006](decisions/006-adotar-rag-com-pgvector.md).

## Índice de ADRs

- [ADR-001: Usar Supabase como datastore](decisions/001-usar-supabase-como-datastore.md)
- [ADR-002: Usar Resend para envio de email](decisions/002-usar-resend-para-email.md)
- [ADR-003: Usar token de acesso único](decisions/003-usar-token-de-acesso-unico.md) *(superseded)*
- [ADR-004: Usar @react-pdf/renderer para o relatório PDF](decisions/004-usar-react-pdf-renderer.md)
- [ADR-006: Adotar RAG com pgvector](decisions/006-adotar-rag-com-pgvector.md)
- [ADR-007: Arquitetura em camadas no backend](decisions/007-arquitetura-em-camadas-backend.md)
- [ADR-008: Diagnóstico de maturidade de dados como lead-gen](decisions/008-diagnostico-maturidade-dados-como-lead-gen.md)
- [ADR-009: Pipeline de agentes e insights de mercado](decisions/009-pipeline-agentes-insights-de-mercado.md)
