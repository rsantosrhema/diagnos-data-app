---
description: Bootstrap and document the Diagnos Data App project.
agent: build
---

You are bootstrapping/onboarding for the **Diagnos Data App** project. Follow the conventions in `AGENTS.md` strictly.

## Goal

Bootstrap an understanding of the project so it is ready for iterative development. The product is a **data maturity diagnostic** run as a lead-gen screener: a contract-driven questionnaire plus deterministic scoring, persisted to Supabase; the commercial manager triggers the analysis pipeline (agents + PDF + email) on demand from the admin panel.

## Steps

1. **Read `AGENTS.md`** and the existing repository layout. Do not overwrite `AGENTS.md` or `.opencode/**`.

2. **Understand the screener flow** (the current implementation lives under `src/`):
   - `src/lib/screener/contract.ts` — typed contract loaded from `docs/snapshot-maturidade-dados.json` (questions, dimensions, weights, score bands). This is the single source of truth for the questionnaire.
   - `src/lib/screener/scoring.ts` — deterministic scoring engine.
   - `src/lib/screener/agent-payload.ts` — builds a payload for a future LLM agent.
   - `src/app/diagnostico/page.tsx` — the public multi-step form (info → context → dimensions → commercial → consent).
   - `src/app/api/screener/route.ts` (internal) and `src/app/api/public-proxy/screener/route.ts` (proxy) — submission endpoints.
   - `src/lib/service/screen-service.ts` — orchestrates lead resolution, scoring, and persistence (no PDF at submit; report is generated on demand by the manager).
   - `src/lib/report/report-generator.ts` — PDF generator using `@react-pdf/renderer` (called by the analysis worker).
   - `src/lib/email/send-report.ts` — sends the PDF to the commercial team via Resend.
   - `src/lib/service/admin-service.ts` + `src/app/admin/page.tsx` — manager panel: lead list with diagnostic/analysis status and the "Gerar relatório" action (enqueues the pgmq job).
   - `src/app/api/analysis-worker/route.ts` — cron-triggered worker running the agent pipeline (Exa + LLM → insights → PDF → email).

3. **Know the auth flow**:
   - `src/lib/auth/internal-key.ts` — timing-safe `INTERNAL_API_KEY` verification on internal routes.
   - `src/lib/auth/proxy.ts` — proxies public routes to internal routes, injecting `INTERNAL_API_KEY` server-side.
   - `src/lib/auth/guard.ts` — `requireManager()` (Supabase Auth Bearer) protecting admin routes; the lead flow itself has no login.
   - `src/lib/lead-storage.ts` — lead handoff from the landing form to `/diagnostico` via `sessionStorage` (no token/session).

4. **Add a test runner** (currently Vitest) and keep unit tests for services, scoring, and the contract. Mock external calls (email, Supabase) in tests — never hit real services.

5. **Verify**:
   - `npm install`
   - `npm run lint`
   - `npm run build`
   - `npm run test`

6. **Report** a concise summary of the flow, and any env vars the user must set in `.env` (see `.env.example`).

## Constraints

- Follow the layered backend (Route → Service → Repository → DTO) as in AGENTS.md.
- No `any` unless justified. No secrets committed. All env vars documented in `.env.example`.
- Keep the questionnaire (in `docs/snapshot-maturidade-dados.json`) to 10 dimensions.