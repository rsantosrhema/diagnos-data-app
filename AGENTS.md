# AGENTS.md — Diagnos Data App

This file is the **system prompt** for any code agent (OpenCode, Claude Code, Cursor, etc.) working on this repository. Read it fully before making changes. It defines the product, the architecture, the harness contract, and the conventions every agent must follow.

---

## 1. Project Overview

**Diagnos Data App** is a Next.js web application that runs a **data maturity diagnostic** for companies.

The product flow is:

1. **Chatbot questionnaire** — The user answers **8 to 12 questions** presented as a conversational chat form. Questions assess data management & governance maturity, modeled on the **DAMA-DMBOK** framework and other leading data governance/management frameworks.
2. **Harness processing** — The answers are sent to a well-defined **agent harness** that orchestrates an LLM evaluation.
3. **LLM inference** — The harness calls **Ollama Cloud** via its HTTP API to run the evaluation.
4. **PDF report** — The harness produces a **PDF report** with diagnostic analysis, charts, metrics, and an overall data maturity assessment for the company.

---

## 2. Tech Stack

| Concern | Choice |
| --- | --- |
| Framework | **Next.js** (App Router) |
| Language | **TypeScript** (strict) |
| UI | React + Tailwind CSS |
| Chat UI | Custom conversational form (no heavy chatbot SDK unless justified) |
| LLM provider | **Ollama Cloud** (HTTP API) |
| Report generation | PDF (server-side) via **@react-pdf/renderer** |
| Charts | SVG rendered into the PDF via `@react-pdf/renderer` |
| Database + Storage | **Supabase** (PostgreSQL gerenciado, `pgvector` para futura RAG) |
| Email | **Resend** (envio do PDF ao time comercial) |
| Auth | **Token de acesso único** (hash SHA-256, consumido no primeiro uso) |

> **Note:** The PDF library (`@react-pdf/renderer`) is React-based. To preserve harness purity, the concrete PDF implementation lives in `src/lib/report/` and is injected into the pipeline via the `ReportGenerator` interface — `harness/**` never imports React/Next. See `docs/decisions/`.

---

## 3. Repository Layout

```
diagnos-data-app/
├── AGENTS.md                     # This file — agent system prompt
├── .opencode/                    # OpenCode harness configuration
│   ├── opencode.json             # OpenCode project config
│   └── command/init.md           # /init command (scaffold + bootstrap)
├── harness/                      # The agent harness (framework-agnostic core)
│   ├── README.md                 # Harness documentation
│   ├── config/
│   │   ├── questionnaire.ts      # Question definitions (8–12 items)
│   │   └── maturity-model.ts     # DAMA-DMBOK scoring model & levels
│   ├── prompts/
│   │   ├── system.ts             # System prompt for the evaluator LLM
│   │   └── user.ts               # User prompt builder (injects answers)
│   ├── core/
│   │   ├── types.ts              # Shared domain types (Question, Answer, Result…)
│   │   ├── schema.ts             # Zod schemas for validation
│   │   ├── pipeline.ts           # Orchestrates: validate → evaluate → report
│   │   └── errors.ts             # Typed error classes
│   ├── providers/
│   │   └── ollama/
│   │       ├── client.ts         # Ollama Cloud HTTP client
│   │       └── types.ts          # Ollama API request/response types
│   ├── evaluator/
│   │   └── evaluator.ts          # Runs the LLM evaluation, parses structured output
│   ├── report/
│   │   ├── generator.ts          # Builds the PDF report
│   │   └── charts.ts             # Chart data preparation
│   └── index.ts                  # Public harness API (single entry point)
├── src/                          # Next.js application
│   ├── app/
│   │   ├── page.tsx              # Landing / start screen
│   │   ├── access/               # Token validation route
│   │   ├── chat/                # Chatbot questionnaire route
│   │   │   └── page.tsx
│   │   └── api/
│   │       └── evaluate/route.ts # POST answers → harness → report
│   ├── components/               # React components (chat, question, report)
│   ├── lib/
│   │   ├── report/               # Concrete PDF generator (@react-pdf/renderer)
│   │   ├── email/                # Resend email sending
│   │   └── supabase/             # Supabase client + data access
│   └── styles/
├── docs/
│   ├── decisions/                # ADRs (Architecture Decision Records)
│   └── architecture.md           # High-level architecture notes
├── .env.example                  # Environment variable template
├── package.json
└── tsconfig.json
```

---

## 4. The Harness Contract

The **harness** is the heart of the system. It is **framework-agnostic** (pure TypeScript, no React/Next imports) so it can be tested and reused independently. The Next.js app only calls the harness through its public API.

### 4.1 Public API (`harness/index.ts`)

```ts
export async function runDiagnostic(input: DiagnosticInput): Promise<DiagnosticResult>
```

- `DiagnosticInput` — validated questionnaire answers + company context.
- `DiagnosticResult` — the full evaluation: per-dimension scores, overall maturity level, narrative analysis, and chart data.

### 4.2 Pipeline stages (`harness/core/pipeline.ts`)

1. **Validate** — validate `DiagnosticInput` against Zod schemas.
2. **Evaluate** — call the evaluator (LLM via Ollama) to score dimensions and produce narrative.
3. **Report** — generate the PDF report from the structured result.

### 4.3 Data flow

```
Next.js (src/app/api/evaluate/route.ts)
        │  POST { answers, company }
        ▼
harness.runDiagnostic(input)
        │
        ├─ core/pipeline.ts  (validate → evaluate → report)
        │        │
        │        ├─ providers/ollama/client.ts  (HTTP → Ollama Cloud)
        │        │
        │        └─ report/generator.ts  (PDF)
        ▼
DiagnosticResult  →  PDF file + JSON payload returned to the client
```

---

## 5. Domain Model (DAMA-DMBOK)

Maturity is assessed across **DAMA-DMBOK knowledge areas** (dimensions). The model lives in `harness/config/maturity-model.ts`.

- **Dimensions** (subset of DAMA-DMBOK knowledge areas): Data Governance, Data Architecture, Data Quality, Data Modeling & Design, Data Storage & Operations, Data Security, Data Integration & Interoperability, Data & Analytics, Metadata, Reference & Master Data.
- **Maturity levels** (0–5, CMMI-style):
  - `0` Non-existent
  - `1` Initial / Ad hoc
  - `2` Repeatable
  - `3` Defined
  - `4` Managed
  - `5` Optimized
- **Overall maturity** = weighted aggregate of dimension scores.

The questionnaire (`harness/config/questionnaire.ts`) maps each question to a dimension and a weight. Keep the question count between **8 and 12**.

---

## 6. Ollama Cloud Integration

- Provider client: `harness/providers/ollama/client.ts`.
- Base URL and model are configured via environment variables (see `.env.example`).
- The client must:
  - Send the system + user prompts (from `harness/prompts/`).
  - Request **structured JSON output** (the evaluator parses it).
  - Handle timeouts, retries, and non-2xx responses with typed errors.
- **Never hardcode secrets.** Read them from `process.env`.

### Environment variables

```
OLLAMA_BASE_URL=https://ollama.example.com/api
OLLAMA_MODEL=your-model-name
OLLAMA_API_KEY=your-api-key
```

---

## 7. Conventions

### Code style
- **TypeScript strict mode.** No `any` unless explicitly justified.
- **No comments unless they explain *why*.** Prefer self-documenting code.
- Use **named exports** for functions/types; default exports only for React pages/components.
- Follow existing patterns in the file you are editing.

### Harness purity
- `harness/**` must **not** import from `src/**` or any React/Next module.
- All I/O (HTTP, filesystem, PDF) happens inside the harness's own modules, behind clear boundaries.
- The concrete PDF generator (`@react-pdf/renderer`) lives in `src/lib/report/` and is injected into the pipeline via the `ReportGenerator` interface (`PipelineDeps`). `harness/**` only defines the interface and contract.

### Validation
- Use **Zod** for all runtime validation (request bodies, LLM output, config).
- Validate at the boundary: API route → harness input; LLM output → structured result.

### Errors
- Use the typed errors in `harness/core/errors.ts` (`ValidationError`, `ProviderError`, `ReportError`).
- Map errors to proper HTTP status codes in the API route.

### Testing
- Unit tests for the harness core (pipeline, evaluator parsing, scoring).
- Mock the Ollama client in tests — never hit the real API.
- Run tests with the project's test runner (add one if not present; document it).

### Commands
- `npm run dev` — start Next.js dev server.
- `npm run build` — production build.
- `npm run lint` — lint (add ESLint config if missing).
- `npm run test` — run tests (add a runner if missing).

---

## 8. Working with OpenCode

- OpenCode config lives in `.opencode/opencode.json`.
- The `/init` command (`.opencode/command/init.md`) scaffolds the harness and bootstraps the project. Run it when starting fresh.
- After editing any `.opencode/**` file, **restart OpenCode** for changes to take effect.

---

## 9. Definition of Done

A task is done when:
- [ ] Code follows the conventions in section 7.
- [ ] Harness purity is preserved (`harness/**` has no app imports).
- [ ] Inputs and LLM output are validated with Zod.
- [ ] Errors are typed and mapped to HTTP status codes.
- [ ] Tests pass (if tests exist for the touched area).
- [ ] `npm run lint` and `npm run build` pass.
- [ ] No secrets are committed; env vars are documented in `.env.example`.
