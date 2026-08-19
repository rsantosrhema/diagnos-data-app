# Diagnos Data App — Harness

The **framework-agnostic core** of the Diagnos Data App. It orchestrates the
data maturity diagnostic: validate answers → evaluate with an LLM (Ollama
Cloud) → generate a PDF report.

The harness is **pure TypeScript**. It must never import from `src/**` or any
React/Next module. The Next.js app only calls it through the public API in
`harness/index.ts`.

## Public API

```ts
import { runDiagnostic } from "./harness";

const result = await runDiagnostic({
  company: { name: "Acme Corp", industry: "Retail" },
  answers: [
    { questionId: "q-governance", optionValue: 3 },
    // ... 8–12 answers
  ],
});
```

`runDiagnostic` returns a `DiagnosticResult` with per-dimension scores, the
overall maturity level, narrative analysis, chart data, and the generated PDF.

## Pipeline

`harness/core/pipeline.ts` orchestrates three stages:

1. **Validate** — `DiagnosticInput` is validated against Zod schemas.
2. **Evaluate** — the evaluator calls Ollama Cloud and parses structured JSON.
3. **Report** — the PDF report is generated from the structured result.

## Layout

```
harness/
├── index.ts                  # Public API (single entry point)
├── config/
│   ├── questionnaire.ts      # 8–12 questions mapped to dimensions
│   └── maturity-model.ts     # DAMA-DMBOK dimensions, levels 0–5, scoring
├── prompts/
│   ├── system.ts             # Evaluator system prompt
│   └── user.ts               # User prompt builder (injects answers)
├── core/
│   ├── types.ts              # Domain types
│   ├── schema.ts             # Zod schemas
│   ├── pipeline.ts           # validate → evaluate → report
│   └── errors.ts             # Typed errors
├── providers/ollama/
│   ├── client.ts             # Ollama Cloud HTTP client
│   └── types.ts              # Ollama API types
├── evaluator/
│   └── evaluator.ts          # LLM evaluation + structured output parsing
└── report/
    ├── generator.ts          # PDF report generator
    └── charts.ts             # Chart data preparation
```

## Configuration

The Ollama client reads from environment variables (see `.env.example`):

- `OLLAMA_BASE_URL` — Ollama Cloud API base URL.
- `OLLAMA_MODEL` — model name.
- `OLLAMA_API_KEY` — API key (optional).
- `OLLAMA_TIMEOUT_MS` — request timeout (default 60000).
- `OLLAMA_MAX_RETRIES` — retry count (default 2).

## Errors

Typed errors in `harness/core/errors.ts`:

- `ValidationError` — invalid input or LLM output.
- `ProviderError` — Ollama HTTP/network failures.
- `ReportError` — PDF generation failures.

## Testing

Unit tests cover the harness core (pipeline, evaluator parsing, scoring). The
Ollama client is mocked in tests — never hit the real API.

## PDF Report

The PDF generator is currently a **placeholder** (`PlaceholderReportGenerator`).
The PDF library is not yet installed. When implementing, prefer a
server-compatible library (e.g. `pdfkit` or `@react-pdf/renderer`) and record
the decision in `docs/decisions/`.
