---
description: Bootstrap and document the Diagnos Data App project.
agent: build
---

You are bootstrapping/onboarding for the **Diagnos Data App** project. Follow the conventions in `AGENTS.md` strictly.

## Goal

Bootstrap an understanding of the project so it is ready for iterative development. The product is a **data maturity diagnostic** run as a lead-gen screener: a contract-driven questionnaire plus deterministic scoring, persisted to Supabase, with a PDF report emailed to the commercial team.

## Steps

1. **Read `AGENTS.md`** and the existing repository layout. Do not overwrite `AGENTS.md` or `.opencode/**`.

2. **Understand the screener flow** (the current implementation lives under `src/`):
   - `src/lib/screener/contract.ts` — typed contract loaded from `docs/snapshot-maturidade-dados.json` (questions, dimensions, weights, score bands). This is the single source of truth for the questionnaire.
   - `src/lib/screener/scoring.ts` — deterministic scoring engine.
   - `src/lib/screener/agent-payload.ts` — builds a payload for a future LLM agent.
   - `src/app/diagnostico/page.tsx` — the public multi-step form (info → context → dimensions → commercial → consent).
   - `src/app/api/screener/route.ts` (internal) and `src/app/api/public-proxy/screener/route.ts` (proxy) — submission endpoints.
   - `src/lib/service/screen-service.ts` — orchestrates lead creation, scoring, persistence, PDF generation, and email.
   - `src/lib/report/report-generator.ts` — PDF generator using `@react-pdf/renderer`.
   - `src/lib/email/send-report.ts` — sends the PDF to the commercial team via Resend.

3. **Know the auth & token flow**:
   - `src/app/access/page.tsx` — token entry that validates and redirects to `/diagnostico`.
   - `src/app/api/tokens/validate/route.ts` + `src/lib/service/token-service.ts` — one-time SHA-256-hashed tokens, creates a 2h session cookie.
   - `src/lib/auth/proxy.ts` — proxies public routes to internal routes, injecting `INTERNAL_API_KEY` server-side.

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