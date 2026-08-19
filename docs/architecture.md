# Arquitetura — Diagnos Data App

Visão de alto nível da aplicação de Diagnóstico de Maturidade de Dados. Este documento descreve o fluxo, as camadas, o modelo de dados e as decisões arquiteturais. Decisões detalhadas estão registradas como ADRs em `docs/decisions/`.

## Visão Geral

A aplicação é um **Next.js** (App Router) que executa um diagnóstico de maturidade de dados baseado no **DAMA-DMBOK**. O fluxo é:

1. **Landing page** — o cliente pede acesso ao diagnóstico.
2. **Time comercial** — entra em contato e gera um token de acesso único.
3. **Cliente** — abre a aplicação, valida o token e responde o formulário (8–12 perguntas).
4. **Harness** — valida as respostas, chama o LLM (Ollama Cloud) e gera o relatório PDF.
5. **Email** — o relatório é enviado ao time comercial.

## Camadas

```
┌─────────────────────────────────────────────────────────────┐
│  Next.js (src/)                                             │
│  Landing · /access (token) · /chat (formulário)             │
│  /api/evaluate → harness.runDiagnostic                      │
│  src/lib/report/  → gerador PDF (@react-pdf/renderer)       │
│  src/lib/email/   → envio via Resend                        │
│  Supabase client → leads, tokens, diagnósticos, storage     │
└──────────────────────────────┬──────────────────────────────┘
                               │ injeta ReportGenerator
┌──────────────────────────────▼──────────────────────────────┐
│  Harness (harness/) — núcleo framework-agnóstico            │
│  runDiagnostic(input) → DiagnosticResult                    │
│  pipeline: validate → evaluate → report                     │
│  providers/ollama → HTTP → Ollama Cloud                     │
└─────────────────────────────────────────────────────────────┘
```

### Fronteira de pureza do harness

`harness/**` **não importa** de `src/**` nem de módulos React/Next. O harness define a interface `ReportGenerator` e o contrato `DiagnosticResult`. A implementação concreta do PDF (`@react-pdf/renderer`) vive em `src/lib/report/` e é injetada no pipeline via `PipelineDeps`. Ver [ADR-005](decisions/005-preservar-pureza-do-harness.md).

## Fluxo de Processo

```
Cliente → Landing (pede acesso) → cria lead (Supabase) → notifica comercial
Comercial → gera token único (hash) → envia ao cliente
Cliente → /access (valida token) → /chat (formulário 8–12 perguntas)
Submit → POST /api/evaluate → harness.runDiagnostic → PDF + resultado
       → marca token usado → salva diagnóstico + PDF (Supabase Storage)
       → envia PDF ao comercial (Resend)
```

## Modelo de Dados (Supabase/PostgreSQL)

- **leads** — `id`, `name`, `email`, `company`, `industry`, `size`, `status`, `created_at`
- **access_tokens** — `id`, `token_hash` (SHA-256, nunca texto puro), `lead_id`, `status` (unused/used/expired), `expires_at`, `used_at`
- **diagnostics** — `id`, `lead_id`, `overall_score`, `overall_level`, `dimension_scores` (jsonb), `narrative` (jsonb), `chart_data` (jsonb), `pdf_path`, `created_at`

## Integrações

| Integração | Tecnologia | ADR |
| --- | --- | --- |
| Banco de dados + Storage | Supabase (PostgreSQL gerenciado) | [ADR-001](decisions/001-usar-supabase-como-datastore.md) |
| Email (PDF) | Resend | [ADR-002](decisions/002-usar-resend-para-email.md) |
| Autenticação | Token de acesso único (hash) | [ADR-003](decisions/003-usar-token-de-acesso-unico.md) |
| Relatório PDF | @react-pdf/renderer | [ADR-004](decisions/004-usar-react-pdf-renderer.md) |
| LLM | Ollama Cloud (HTTP API) | — |

## Roadmap Futuro

- **RAG com pgvector** no Supabase para personalizar as análises por cliente, aproveitando diagnósticos anteriores. Ver [ADR-006](decisions/006-adotar-rag-com-pgvector.md).

## Índice de ADRs

- [ADR-001: Usar Supabase como datastore](decisions/001-usar-supabase-como-datastore.md)
- [ADR-002: Usar Resend para envio de email](decisions/002-usar-resend-para-email.md)
- [ADR-003: Usar token de acesso único](decisions/003-usar-token-de-acesso-unico.md)
- [ADR-004: Usar @react-pdf/renderer para o relatório PDF](decisions/004-usar-react-pdf-renderer.md)
- [ADR-005: Preservar a pureza do harness](decisions/005-preservar-pureza-do-harness.md)
- [ADR-006: Adotar RAG com pgvector](decisions/006-adotar-rag-com-pgvector.md)
