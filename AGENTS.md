# AGENTS.md — Diagnos Data App

This file is the **system prompt** for any code agent (OpenCode, Claude Code, Cursor, etc.) working on this repository. Read it fully before making changes. It defines the product, the architecture, and the conventions every agent must follow.

---

## 1. Project Overview

**Diagnos Data App** is a Next.js web application that runs a **data maturity diagnostic** used as a **lead-generation screener**.

The product flow is:

1. **Landing page** - the visitor fills the lead form (name, company, phone, email, role) and is redirected straight to the screener. Duplicate emails reuse the existing pending lead; a completed email is rejected (409).
2. **Multi-step form** - the lead answers a contract-driven questionnaire (company profile + 10 DAMA-DMBOK dimensions + 1 commercial question + consent). Each dimension has 5 levels (CMMI-like).
3. **Deterministic scoring** - the answers are scored with a fixed formula (weighted aggregate), producing a score band and per-dimension levels. No LLM is involved in the screener.
4. **Persistence** - the lead, the raw answers, and the computed diagnostic are stored in **Supabase**. No PDF is generated at this point.
5. **On-demand report** - the **commercial manager**, via the admin panel (`/admin`), clicks "Gerar relatório" for a lead; the analysis pipeline (agents + PDF + email via Resend) runs in the background worker.

The questionnaire content is data-driven: it lives in `docs/snapshot-maturidade-dados.json` and is typed/loaded via a Zod-validated contract in `src/lib/screener/contract.ts`. Changing questions, weights, or score bands is a data change, not a redeploy.

---

## 2. Tech Stack

| Concern | Choice |
| --- | --- |
| Framework | **Next.js** (App Router) |
| Language | **TypeScript** (strict) |
| UI | React + Tailwind CSS |
| Form UI | Custom multi-step form (no heavy chatbot/metadata SDK) |
| Scoring | Deterministic engine (`src/lib/screener/scoring.ts`) from a JSON contract |
| Report generation | PDF (server-side) via **@react-pdf/renderer** |
| Database + Storage | **Supabase** (PostgreSQL gerenciado) |
| Email | **Resend** (envio do PDF ao time comercial) |
| Auth | **Supabase Auth** (painel admin do gerente) + **`INTERNAL_API_KEY`** para o proxy. Sem login de lead — cadastro direto na landing |

---

## 3. Repository Layout

```
diagnos-data-app/
├── AGENTS.md                     # This file - agent system prompt
├── .opencode/                    # OpenCode configuration
│   ├── opencode.json             # OpenCode project config
│   └── command/init.md           # /init command (bootstrap/onboard)
├── docs/
│   ├── decisions/                # ADRs (Architecture Decision Records)
│   ├── rules/                    # Detailed development rules
│   │   ├── security.md           # Security rules (auth, env vars, Supabase)
│   │   ├── validation.md         # Validation rules (Zod patterns, boundaries)
│   │   └── architecture.md       # Architecture rules (layers, server/client)
│   ├── snapshot-maturidade-dados.json  # Single source of truth for the questionnaire
│   ├── architecture.md           # High-level architecture notes
│   └── data-model.md             # Living schema reference (Supabase)
├── src/                          # Next.js application
│   ├── app/
│   │   ├── page.tsx              # Landing / lead registration (redirects to /diagnostico)
│   │   ├── diagnostico/          # Multi-step screener form
│   │   │   ├── page.tsx
│   │   │   └── page.test.tsx
│   │   ├── admin/                # Manager panel (lead list + report generation)
│   │   └── api/
│   │       ├── leads/            # (internal) create lead
│   │       ├── screener/         # (internal) screener submission
│   │       ├── analysis-worker/  # (internal) analysis queue worker (agents + PDF + email)
│   │       ├── public-proxy/     # proxy routes (screener, leads)
│   │       ├── admin/            # admin internal routes (analysis, scoring-config)
│   │       └── admin-proxy/      # admin proxy routes
│   ├── components/               # shared React components (logo, wave divider)
│   ├── lib/
│   │   ├── api/                  # typed client functions (submitLead, submitScreener, ...)
│   │   ├── auth/                 # internal-key verification, proxy, manager guard
│   │   ├── dto/                  # safe response shapes
│   │   ├── email/                # Resend email sending (report)
│   │   ├── http/                 # client IP helpers
│   │   ├── report/               # concrete PDF generator (@react-pdf/renderer)
│   │   ├── repository/           # Supabase data access (lead, assessment, insights, queue)
│   │   ├── schemas/              # Zod schemas (boundaries)
│   │   ├── screener/             # contract type; scoring; agent payload builder
│   │   ├── service/              # business logic (lead, screen, admin, analysis)
│   │   └── supabase/             # server/client Supabase clients
│   └── middleware.ts             # rate limiting for public-proxy endpoints
├── supabase/                     # SQL migrations + validation scripts
├── .env.example                  # Environment variable template
├── package.json
└── tsconfig.json
```

---

## 4. The Screener Flow

The screener is the heart of the system. It is fully deterministic and lives under `src/lib/screener/` + `src/app/diagnostico/`.

### 4.1 Contract-driven questionnaire

- **Source of truth:** `docs/snapshot-maturidade-dados.json`
- **Typed loading:** `src/lib/screener/contract.ts` validates it with Zod at module load (`screenerContractSchema`) and exports `SCREENER_CONTRACT`, `DIMENSION_IDS`, `CONTEXT_IDS`.
- Content: 2 context questions, 10 dimensions (each with `id`, `nome`, `peso`, `area_dmbok`, `pergunta`, 5 `opcoes`), 1 commercial question, and a scoring config with score bands.

### 4.2 Public entry (`src/app/diagnostico/page.tsx`)

- Multi-step wizard: info (company profile) → dimensions (10) → commercial (1) → consent.
- Lead identity (name/email/company/leadId) is hydrated from `sessionStorage` (`diagnos_lead`, written by the landing form via `src/lib/lead-storage.ts`); answers are persisted to `localStorage` as draft (anti-abandonment).
- On submit it calls `submitScreener` (`src/lib/api/client.ts`) which POSTs to `/api/public-proxy/screener`.

### 4.3 Submission pipeline (`src/app/api/screener/route.ts` + `src/lib/service/screen-service.ts`)

```
client → /api/public-proxy/screener → (injects x-internal-api-key) → /api/screener
  → validate body (screenerSubmissionSchema, Zod)
  → screenService.submitScreener:
      1. honeypot check   (website filled → silently ok)
      2. resolve lead (by leadId from sessionStorage, fallback by email)
      3. block resubmission (existing assessment → 409)
      4. compute scores (src/lib/screener/scoring.ts)
      5. build agent payload (src/lib/screener/agent-payload.ts)   [consumed later by analysis agents]
      6. persist assessment response + diagnostic (Supabase), lead → status `concluido`
      → { ok: true }   (no PDF, no email — report is generated on demand)
```

### 4.4 Report generation (on demand, manager-driven)

- Manager logs into `/admin` (Supabase Auth) and clicks "Gerar relatório" on a lead row.
- `POST /api/admin-proxy/analysis/reprocess` → `/api/admin/analysis/reprocess` → `adminService.generateReport` validates the lead (status `concluido`/`analisado`/`falha`/`analise_pendente` + has diagnostic) and enqueues a job in the pgmq queue `analysis_jobs`.
- The worker (`/api/analysis-worker`, triggered by Vercel cron every 5 min with `CRON_SECRET`) pops the job, runs the agent pipeline (`src/lib/agents/`: researcher via Exa, analyst + writer via LLM), persists to `market_insights`, generates the enriched PDF (`src/lib/report/report-generator.ts`) and emails it to the manager (`src/lib/email/send-report.ts`, Resend).

---

## 5. Domain Model (DAMA-DMBOK)

Maturity is assessed across **10 dimensions** defined in `docs/snapshot-maturidade-dados.json` (mapped to DAMA-DMBOK knowledge areas / DCAM / DMBOK), e.g.: Governança e Responsabilidade, Arquitetura e Integração, Qualidade de Dados, Metadados e Rastreabilidade, Dados Mestres e Cadastros, Segurança e Conformidade (LGPD), Consumo e Autonomia Analítica, IA/Modelos/Analytics Avançado, Time e Capacidade.

- **Levels** per dimension (1–5, CMMI-like): Inexistente → Ad hoc → Definido → Gerenciado → Otimizado (labels defined per question in the JSON).
- **Score**: `score_final = Σ(nivel_dimensão × peso_dimensão) / 100` (weights in the JSON).
- **Bands** (from `scoring.faixas`): Inicial, Emergente, Estruturado, Gerenciado, Otimizado.
- **Reporting rules**: report the band not a precise decimal; highlight the lowest dimension as the top risk; flag imbalance when >3 levels separate max vs min; flag C-level optimism internally.

---

## 6. Environment Variables

See `.env.example`. Key variables:

```
# Supabase (only src/lib/supabase/server.ts & repositories access secrets)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Resend
RESEND_API_KEY=
RESEND_FROM_EMAIL=Diagnos <no-reply@your-domain.com>
MANAGER_NOTIFICATION_EMAIL=comercial@example.com

# Internal key (server-only) used by the proxy to authenticate internal calls. 32+ random chars. NEVER expose to client.
INTERNAL_API_KEY=

# Vercel Cron secret sent by the scheduler to /api/analysis-worker.
CRON_SECRET=
```

`NEXT_PUBLIC_*` vars are bundled into client JS — NEVER put secrets there.

---

## 7. Conventions

### Code style
- **TypeScript strict mode.** No `any` unless explicitly justified.
- **No comments unless they explain *why*.** Prefer self-documenting code.
- Use **named exports** for functions/types; default exports only for React pages/components.
- Use `import type` for type-only imports.
- Prefer `satisfies` over type assertions.
- Follow existing patterns in the file you are editing.

### Layered backend (ADR-007)
- **Route (thin)** → **Service (logic)** → **Repository (data)** → **DTO (safe shape)**.
- Routes: auth, validation, error mapping only. No business logic.
- Services: business logic, orchestration, throw typed errors.
- Repositories: Supabase data access with explicit column selection.
- DTOs: safe shapes returned to client. Never raw DB rows.

### Validation
- Use **Zod** for all runtime validation (request bodies, config, contract).
- Validate at the boundary: API route → service input.
- Use `.strict()` on all boundary Zod schemas to reject unknown keys.
- Prefer `safeParse` over `parse` at boundaries (you control the HTTP response).
- Infer types from schemas (`z.infer<typeof schema>`), never define types manually that should come from a schema.

### Errors
- Services throw typed errors (e.g. `AdminServiceError`, `ScreenServiceError`, `LeadServiceError`) carrying an HTTP status.
- Map errors to proper HTTP status codes in the API route.
- Never leak stack traces or internal messages to the client — return generic messages (`{ error: "Erro interno" }`).

### Testing
- Unit tests for services, scoring, contract, schemas in `*.test.ts`.
- Component tests for the screener page in `*.test.tsx` (Vitest + Testing Library).
- Mock external calls (Supabase, email) in tests — never hit real services.
- Run tests with `npm run test` (Vitest).

### Commands
- `npm run dev` — start Next.js dev server.
- `npm run build` — production build.
- `npm run lint` — lint.
- `npm run test` — run tests.
- `npm run typecheck` — run `tsc --noEmit`.

---

## 8. Security Rules

> Full details: `docs/rules/security.md`

### 8.1 Auth Verification — Every Route, Every Action

Every API route and Server Action MUST verify authentication before any operation. Never rely solely on middleware/proxy.ts for auth — re-verify at the data boundary (middleware can be bypassed: GHSA-267c-6grr-h53f, CVE-2025-29927).

```typescript
// ✅ GOOD
export async function POST(req: Request) {
  const session = await verifySession(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const result = CreateSchema.safeParse(await req.json());
  if (!result.success) return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
  // ... proceed
}

// ❌ BAD: no auth check
export async function POST(req: Request) {
  const body = await req.json();
  await db.insert(body);
}
```

### 8.2 Secret Comparison & Rotation

- Use `crypto.timingSafeEqual` for comparing secret values (internal key, cron secret). Never use `===`.
- Hash both values before comparison to handle different lengths (see `src/lib/auth/internal-key.ts`).
- If a future feature needs one-time tokens or secrets, hash with SHA-256 before storage and never persist plaintext.

### 8.3 Frontend Never Handles Auth Directly

- Frontend calls ONLY proxy routes (`/api/public-proxy/*`, `/api/admin-proxy/*`).
- Frontend NEVER stores, reads, or manipulates `INTERNAL_API_KEY`.
- Frontend NEVER calls internal `/api/*` routes directly.
- The proxy injects the internal key server-side.

### 8.4 Environment Variables

- `NEXT_PUBLIC_*` vars are bundled into client JS — NEVER put secrets there.
- Only `src/lib/supabase/server.ts` and repository modules access `process.env` for secrets.
- Validate env vars at startup with Zod (fail fast if misconfigured).

### 8.5 Error Handling — Never Leak Internals

- NEVER return stack traces, internal error messages, or `String(err)` to the client.
- Log detailed errors server-side with correlation IDs.
- Return generic messages: `{ error: "Erro interno" }`.
- Map typed errors to HTTP status codes (→ 400, 401, 409, 500, 502, …).

### 8.6 Supabase Security

- Service role client ONLY in server-side modules. Add `import "server-only"` to enforce.
- Use `supabase.auth.getUser()` (server-verified), NEVER `supabase.auth.getSession()` (client-parsed).
- Never use user-provided IDs as privileged query params — always use the session's userId.
- RLS enabled on all tables as defense-in-depth.

---

## 9. Data Validation Rules

> Full details: `docs/rules/validation.md`

### 9.1 Zod at Every Trust Boundary

Every point where untrusted data enters the application MUST be validated with Zod:

- API route bodies → `safeParse` before any logic.
- Config/contract JSON → `parse` at module load (fail fast).
- Environment variables → `parse` at module load (fail fast).
- External API responses → `safeParse` before consuming.

### 9.2 Schema Conventions

- Define schemas in `src/lib/schemas/` (app) or in `src/lib/screener/contract.ts` (contract).
- Infer types from schemas: `type MyType = z.infer<typeof mySchema>;`
- Use `.strict()` on all boundary schemas to reject unknown keys (prevents mass-assignment).
- Use `safeParse` (returns result) not `parse` (throws) at boundaries.

### 9.3 Validation Error Responses

- Return 400 for validation failures with structured errors.
- Format: `{ error: "Dados inválidos", issues: { field: [...] } }`
- Use `error.flatten()` or `error.issues` for structured output.
- Never expose raw `ZodError` to client — flatten first.

---

## 10. Architecture Enforcement

> Full details: `docs/rules/architecture.md`

### 10.1 Layered Backend (ADR-007)

```
Route (thin) → Service (logic) → Repository (data) → DTO (safe shape)
```

- **Routes**: auth, validation, error mapping only. No business logic.
- **Services**: business logic, orchestration. Throw typed errors.
- **Repositories**: data access via Supabase client. Explicit column selection.
- **DTOs**: safe data shapes returned to client. Never raw DB rows.

### 10.2 Server/Client Boundary

- Default: Server Component. Add `"use client"` only for interactivity/hooks/browser APIs.
- Never import server-only modules (`supabase/server.ts`, `process.env` secrets) into client components.
- Use `import "server-only"` on modules that must never reach the browser.
- Props passed to Client Components must be serializable — no functions, no secrets.

### 10.3 Proxy Pattern (ADR-007)

- Client → `/api/public-proxy/*` → (injects `INTERNAL_API_KEY`) → `/api/*`
- Adding a new endpoint: internal route → proxy route → client function → rate limiting.

---

## 11. Working with OpenCode

- OpenCode config lives in `.opencode/opencode.json`.
- The `/init` command (`.opencode/command/init.md`) bootstraps and onboards the project. Run it when starting fresh.
- After editing any `.opencode/**` file, **restart OpenCode** for changes to take effect.

---

## 12. Definition of Done

A task is done when:
- [ ] Code follows the conventions in section 7.
- [ ] Inputs and config are validated with Zod at the boundary.
- [ ] Zod schemas use `.strict()` at boundaries.
- [ ] Types inferred from schemas, not manually duplicated.
- [ ] Business logic lives in services behind the layered backend (Route → Service → Repository → DTO).
- [ ] Errors are typed and mapped to HTTP status codes.
- [ ] Error responses never leak stack traces or internal details.
- [ ] Auth/`INTERNAL_API_KEY` verified in every API route (per section 8.1).
- [ ] No `NEXT_PUBLIC_*` prefix on secret env vars.
- [ ] Rate limiting on new public-facing endpoints.
- [ ] `import "server-only"` on server-only modules.
- [ ] The questionnaire source of truth (`docs/snapshot-maturidade-dados.json`) + contract are in sync.
- [ ] Tests pass (if tests exist for the touched area).
- [ ] `npm run lint` and `npm run build` pass.
- [ ] No secrets are committed; env vars are documented in `.env.example`.