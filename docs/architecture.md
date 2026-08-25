# Arquitetura — Diagnos Data App

Visão de alto nível da aplicação de Diagnóstico de Maturidade de Dados. Este documento descreve o fluxo, as camadas, o modelo de dados e as decisões arquiteturais. Decisões detalhadas estão registradas como ADRs em `docs/decisions/`.

## Visão Geral

A aplicação é um **Next.js** (App Router) que executa um diagnóstico de maturidade de dados como **triagem de lead-gen**. O fluxo é:

1. **Landing page** — o visitante pede acesso a um diagnóstico.
2. **Time comercial** — entra em contato e gera um token de acesso único para o lead.
3. **Visitante** — valida o token e responde o formulário (2 contexto + 10 dimensões + 1 comercial + consentimento).
4. **Scoring determinístico** — as respostas são pontuadas com fórmula fixa (contrato JSON), sem LLM.
5. **Persistência + PDF + Email** — salva lead/diagnóstico (Supabase), gera PDF (`@react-pdf/renderer`) e envia ao time comercial (Resend).

## Camadas

```
┌─────────────────────────────────────────────────────────────┐
│  Next.js (src/) — App Router                                 │
│  Landing · /access (token) · /diagnostico (formulário screener)│
│  /api/public-proxy/* → (injeta INTERNAL_API_KEY) → /api/*   │
│  src/lib/report/ → gerador PDF (@react-pdf/renderer)         │
│  src/lib/email/  → envio via Resend                          │
│  Supabase client → leads, tokens, sessões, assessments       │
└──────────────────────────────────────────────────────────────┘
```

- **Routes** (thin): auth/`INTERNAL_API_KEY`, validação Zod, mapeamento de erro.
- **Services** (`src/lib/service/`): lógica de negócio (token, lead, screen, admin); lançam erros tipados.
- **Repositories** (`src/lib/repository/`): acesso a dados via Supabase, seleção explícita de colunas.
- **DTOs** (`src/lib/dto/`): formatos seguros retornados ao cliente.

## Fluxo de Processo

```
Cliente → Landing (pede acesso) → cria lead (Supabase) → notifica comercial
Comercial → gera token único (hash SHA-256) → envia ao cliente
Cliente → /access (valida token) → /diagnostico (formulário screener)
Submit → POST /api/public-proxy/screener → /api/screener
       → screenService.submitScreener:
           honeypot → cria lead → computa scores (contrato JSON)
           → persiste respostas + diagnóstico → gera PDF → email comercial (Resend)
Cliente → tela de sucesso
```

## Modelo de Dados (Supabase/PostgreSQL)

> **Documento vivo:** o modelo completo, com diagrama Mermaid e referência de todas as tabelas, está em [data-model.md](data-model.md). Atualize-o no mesmo commit de qualquer mudança de schema.

- **leads** — `id`, `name`, `email`, `company`, `role`, `status`, `created_at`
- **access_tokens** (tokens) — `id`, `token_hash` (SHA-256, nunca texto puro), `lead_id`, `status`, `expires_at`, `used_at`
- **sessions** — sessão do cliente (2h), `token_hash`, `lead_id`, `expires_at`
- **assessment_responses** — respostas do screener + payload do agente, `lead_id`
- **diagnostics** — `id`, `lead_id`, `overall_score`, `overall_level`, `dimension_scores` (jsonb), `narrative` (jsonb), `chart_data` (jsonb), `pdf_path`, `created_at`

## Integrações

| Integração | Tecnologia | ADR |
| --- | --- | --- |
| Banco de dados + Storage | Supabase (PostgreSQL gerenciado) | [ADR-001](decisions/001-usar-supabase-como-datastore.md) |
| Email (PDF) | Resend | [ADR-002](decisions/002-usar-resend-para-email.md) |
| Autenticação | Token de acesso único (hash) | [ADR-003](decisions/003-usar-token-de-acesso-unico.md) |
| Relatório PDF | @react-pdf/renderer | [ADR-004](decisions/004-usar-react-pdf-renderer.md) |
| Triagem (scoring) | Contrato JSON determinístico (sem LLM) | [ADR-008](decisions/008-diagnostico-maturidade-dados-como-lead-gen.md) |

## Roadmap Futuro

- **IA / agente LLM** no diagnóstico pago (Diagnóstico 360°), consumindo o `agent_payload` já montado no screener.
- **RAG com pgvector** no Supabase para personalizar as análises por cliente, aproveitando diagnósticos anteriores. Ver [ADR-006](decisions/006-adotar-rag-com-pgvector.md).

## Índice de ADRs

- [ADR-001: Usar Supabase como datastore](decisions/001-usar-supabase-como-datastore.md)
- [ADR-002: Usar Resend para envio de email](decisions/002-usar-resend-para-email.md)
- [ADR-003: Usar token de acesso único](decisions/003-usar-token-de-acesso-unico.md)
- [ADR-004: Usar @react-pdf/renderer para o relatório PDF](decisions/004-usar-react-pdf-renderer.md)
- [ADR-006: Adotar RAG com pgvector](decisions/006-adotar-rag-com-pgvector.md)
- [ADR-007: Arquitetura em camadas no backend](decisions/007-arquitetura-em-camadas-backend.md)
- [ADR-008: Diagnóstico de maturidade de dados como lead-gen](decisions/008-diagnostico-maturidade-dados-como-lead-gen.md)