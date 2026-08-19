---
description: Scaffold the harness and bootstrap the Diagnos Data App project.
agent: build
---

You are bootstrapping the **Diagnos Data App** project. Follow the conventions in `AGENTS.md` strictly.

## Goal

Scaffold the framework-agnostic **harness** and bootstrap the Next.js application so the project is ready for iterative development.

## Steps

1. **Read `AGENTS.md`** and the existing repository layout. Do not overwrite `AGENTS.md` or `.opencode/**`.

2. **Scaffold the harness** (pure TypeScript, no React/Next imports). Create these files if they do not exist:
   - `harness/index.ts` — public API: `runDiagnostic(input: DiagnosticInput): Promise<DiagnosticResult>`.
   - `harness/core/types.ts` — domain types (`Question`, `Answer`, `DiagnosticInput`, `DiagnosticResult`, `DimensionScore`, `MaturityLevel`).
   - `harness/core/schema.ts` — Zod schemas for `DiagnosticInput` and the LLM structured output.
   - `harness/core/errors.ts` — `ValidationError`, `ProviderError`, `ReportError`.
   - `harness/core/pipeline.ts` — orchestrates validate → evaluate → report.
   - `harness/config/questionnaire.ts` — 8–12 questions mapped to DAMA-DMBOK dimensions with weights.
   - `harness/config/maturity-model.ts` — dimensions, maturity levels (0–5), weighted aggregate.
   - `harness/prompts/system.ts` and `harness/prompts/user.ts` — evaluator prompts.
   - `harness/providers/ollama/client.ts` and `harness/providers/ollama/types.ts` — Ollama Cloud HTTP client (env-driven, typed errors, timeout/retry).
   - `harness/evaluator/evaluator.ts` — runs the LLM evaluation and parses structured JSON output.
   - `harness/report/generator.ts` and `harness/report/charts.ts` — PDF report + chart data prep (stub the PDF library; document the choice).
   - `harness/README.md` — harness documentation.

3. **Bootstrap the Next.js app** (App Router, TypeScript strict, Tailwind):
   - `src/app/page.tsx` (landing), `src/app/chat/page.tsx` (chatbot questionnaire), `src/app/api/evaluate/route.ts` (POST → harness → report).
   - `src/components/` for chat/question/report components.
   - `package.json`, `tsconfig.json`, `next.config.*`, Tailwind config, `.env.example`, `.gitignore`.

4. **Add a test runner** (e.g. Vitest) and unit tests for the harness core (pipeline, evaluator parsing, scoring). Mock the Ollama client — never hit the real API.

5. **Verify**:
   - `npm install`
   - `npm run lint`
   - `npm run build`
   - `npm run test`

6. **Report** a concise summary of what was created, the PDF/chart library chosen (and why), and any env vars the user must set in `.env`.

## Constraints

- `harness/**` must never import from `src/**` or any React/Next module.
- No `any` unless justified. No secrets committed. All env vars documented in `.env.example`.
- Keep the questionnaire between 8 and 12 questions.
