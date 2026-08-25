# Layered Architecture (ADR-007) Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier, discrimination sensor).

**If the skill cannot be activated, STOP and tell the user - do not proceed without it.**

---

**Design**: `.specs/features/layered-architecture/design.md`
**Status**: Done

---

## Test Coverage Matrix

> Generated from codebase, project guidelines, and spec - confirm before Execute. Guidelines found: `AGENTS.md` (testing section), `vitest.config.ts`.

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| ---------- | ------------------ | -------------------- | ---------------- | ----------- |
| Service | unit | All branches; 1:1 to spec ACs; all listed edge cases | `src/lib/service/*.test.ts` | `npx vitest run` |
| Repository | unit | Key query paths + error handling | `src/lib/repository/*.test.ts` | `npx vitest run` |
| Route Handler | none | (tested via service layer) | - | build gate only |
| DTO | none | (pure types) | - | build gate only |
| Middleware | none | (Next.js built-in) | - | build gate only |

## Gate Check Commands

> Generated from codebase - confirm before Execute.

| Gate Level | When to Use | Command |
| ---------- | ----------- | ------- |
| Quick | After tasks with unit tests only | `npx vitest run` |
| Build | After phase completion or config/entity-only tasks | `npx tsc --noEmit && npx vitest run && npm run build` |

---

## Execution Plan

Phases are ordered and run sequentially - each phase completes before the next begins, and tasks within a phase execute in order.

### Phase 1: Foundation (DTOs + Repository)

T1, T2, T3 (independent)

### Phase 2: Service Layer

T4 (deps: T1, T2, T3), T5 (deps: T3), T6 (deps: T2, T3)

### Phase 3: Infrastructure (Middleware + Utilities)

T7, T8 (T8 deps: T7)

### Phase 4: Route Handler Refactor

T9 (deps: T4), T10 (deps: T5), T11 (deps: T6), T12 (deps: T4), T13 (deps: T4), T14 (deps: T4), T15 (deps: T4)

### Phase 5: Security Fixes

T16 (deps: T3), T17 (deps: T16), T18, T19 (deps: T6)

### Phase 6: Tests + Verification

T20 (deps: T4, T5, T6), T21, T22 (deps: all)

---

## Task Breakdown

### T1: Create DTO types

**What**: Create `src/lib/dto/admin.ts` and `src/lib/dto/token.ts` with response types that filter internal fields
**Where**: `src/lib/dto/admin.ts`, `src/lib/dto/token.ts`
**Depends on**: None
**Reuses**: None
**Requirement**: ARCH-03

**Done when**:

- [x] AdminLeadRowDTO has no tokenPlain field
- [x] GenerateTokenResponseDTO returns `{ token: string }` without id
- [x] Types exported correctly
- [x] No TypeScript errors

**Tests**: none
**Gate**: build

---

### T2: Create Repository layer for tokens

**What**: Create `src/lib/repository/token-repo.ts` with all token database operations
**Where**: `src/lib/repository/token-repo.ts`
**Depends on**: None
**Reuses**: `getServiceClient()` from `src/lib/supabase/server.ts`
**Requirement**: ARCH-02

**Done when**:

- [x] findByHash, findById, markExpired, consume, cancel, cancelActiveByLeadId, create, updateSentAt, markExpiredTokens, findAll implemented
- [x] create method does NOT store token_plain
- [x] No direct `getServiceClient()` usage outside this file in route handlers

**Tests**: none (build gate only)
**Gate**: build

---

### T3: Create Repository layer for leads + sessions

**What**: Create `src/lib/repository/lead-repo.ts` and `src/lib/repository/session-repo.ts`
**Where**: `src/lib/repository/lead-repo.ts`, `src/lib/repository/session-repo.ts`
**Depends on**: None
**Reuses**: `getServiceClient()` from `src/lib/supabase/server.ts`
**Requirement**: ARCH-02

**Done when**:

- [x] LeadRepository methods: findById, findByEmailAndStatus, create, updateStatus, findAll, findNameAndEmail
- [x] SessionRepository methods: create, findActiveByHash
- [x] No TypeScript errors

**Tests**: none (build gate only)
**Gate**: build

---

### T4: Create TokenService

**What**: Create `src/lib/service/token-service.ts` with all token business logic + tests
**Where**: `src/lib/service/token-service.ts`, `src/lib/service/token-service.test.ts`
**Depends on**: T1, T2, T3
**Reuses**: `generateToken()`, `hashToken()`, `createSessionToken()`, `hashSessionToken()` from `src/lib/auth/token.ts`
**Requirement**: ARCH-01, ARCH-03

**Done when**:

- [x] validateAndCreateSession handles all token statuses (disponivel, usado, cancelado, expirado)
- [x] generateForLead cancels active tokens before creating new one
- [x] sendTokenEmail requires plaintext token in body (no DB fallback)
- [x] TokenServiceError maps to correct HTTP status codes
- [x] All unit tests pass

**Tests**: unit - all branches covered; edge cases (hash collision, expired token, not found)
**Gate**: quick

---

### T5: Create LeadService

**What**: Create `src/lib/service/lead-service.ts` with lead registration logic + tests
**Where**: `src/lib/service/lead-service.ts`, `src/lib/service/lead-service.test.ts`
**Depends on**: T3
**Reuses**: `sanitizeText()` from `src/lib/schemas/lead.ts`
**Requirement**: ARCH-01

**Done when**:

- [x] createLead checks for duplicate pending leads
- [x] createLead normalizes email to lowercase
- [x] createLead handles unique constraint violation (23505)
- [x] All unit tests pass

**Tests**: unit - duplicate check, email normalization, constraint violation
**Gate**: quick

---

### T6: Create AdminService

**What**: Create `src/lib/service/admin-service.ts` with admin dashboard logic + tests
**Where**: `src/lib/service/admin-service.ts`, `src/lib/service/admin-service.test.ts`
**Depends on**: T2, T3
**Reuses**: TokenRepository, LeadRepository
**Requirement**: ARCH-01, ARCH-03

**Done when**:

- [x] getTokensDashboard runs lazy expiry
- [x] Response uses DTOs (no tokenPlain in response)
- [x] KPIs computed correctly
- [x] All unit tests pass

**Tests**: unit - KPI computation, no tokenPlain in response
**Gate**: quick

---

### T7: Create client-ip utility

**What**: Create `src/lib/http/client-ip.ts` to deduplicate getClientIp across handlers
**Where**: `src/lib/http/client-ip.ts`
**Depends on**: None
**Reuses**: None
**Requirement**: ARCH-05

**Done when**:

- [x] getClientIp extracts IP from x-forwarded-for or x-real-ip
- [x] Exported and importable

**Tests**: none
**Gate**: build

---

### T8: Create Next.js middleware for rate limiting

**What**: Create `src/middleware.ts` with centralized rate limiting for public-proxy routes
**Where**: `src/middleware.ts`
**Depends on**: T7
**Reuses**: `checkRateLimit()` from `src/lib/rate-limit.ts`
**Requirement**: ARCH-05

**Done when**:

- [x] Middleware matches `/api/public-proxy/:path*`
- [x] Each public-proxy route has its own rate limit config
- [x] Returns 429 with Retry-After when exceeded

**Tests**: none (Next.js middleware)
**Gate**: build

---

### T9: Refactor tokens/validate route handler

**What**: Refactor `src/app/api/tokens/validate/route.ts` to thin handler
**Where**: `src/app/api/tokens/validate/route.ts`
**Depends on**: T4
**Reuses**: TokenService, Repository
**Requirement**: ARCH-01

**Done when**:

- [x] Handler only does: verifyInternalApiKey → Zod → delegate to service → catch errors
- [x] No direct Supabase calls
- [x] No business logic inline

**Tests**: none (tested via service)
**Gate**: build

---

### T10: Refactor leads route handler

**What**: Refactor `src/app/api/leads/route.ts` to thin handler
**Where**: `src/app/api/leads/route.ts`
**Depends on**: T5
**Reuses**: LeadService
**Requirement**: ARCH-01

**Done when**:

- [x] Handler only does: verifyInternalApiKey → Zod → honeypot check → delegate to service
- [x] No direct Supabase calls

**Tests**: none
**Gate**: build

---

### T11: Refactor admin/tokens route handler

**What**: Refactor `src/app/api/admin/tokens/route.ts` to thin handler
**Where**: `src/app/api/admin/tokens/route.ts`
**Depends on**: T6
**Reuses**: AdminService
**Requirement**: ARCH-01

**Done when**:

- [x] Handler delegates to adminService.getTokensDashboard()
- [x] No direct Supabase calls

**Tests**: none
**Gate**: build

---

### T12: Refactor admin/tokens/generate route handler

**What**: Refactor `src/app/api/admin/tokens/generate/route.ts` to thin handler
**Where**: `src/app/api/admin/tokens/generate/route.ts`
**Depends on**: T4
**Reuses**: TokenService
**Requirement**: ARCH-01

**Done when**:

- [x] Handler delegates to tokenService.generateForLead()
- [x] No direct Supabase calls

**Tests**: none
**Gate**: build

---

### T13: Refactor admin/tokens/[id]/send route handler

**What**: Refactor `src/app/api/admin/tokens/[id]/send/route.ts` to thin handler
**Where**: `src/app/api/admin/tokens/[id]/send/route.ts`
**Depends on**: T4
**Reuses**: TokenService, sendTokenEmail, buildMailtoFallback
**Requirement**: ARCH-01

**Done when**:

- [x] Handler delegates to tokenService.sendTokenEmail()
- [x] No direct Supabase calls

**Tests**: none
**Gate**: build

---

### T14: Refactor admin/tokens/[id]/regenerate route handler

**What**: Refactor `src/app/api/admin/tokens/[id]/regenerate/route.ts` to thin handler
**Where**: `src/app/api/admin/tokens/[id]/regenerate/route.ts`
**Depends on**: T4
**Reuses**: TokenService
**Requirement**: ARCH-01

**Done when**:

- [x] Handler delegates to tokenService.regenerate()
- [x] No direct Supabase calls

**Tests**: none
**Gate**: build

---

### T15: Refactor admin/tokens/[id]/cancel route handler

**What**: Refactor `src/app/api/admin/tokens/[id]/cancel/route.ts` to thin handler
**Where**: `src/app/api/admin/tokens/[id]/cancel/route.ts`
**Depends on**: T4
**Reuses**: TokenService
**Requirement**: ARCH-01

**Done when**:

- [x] Handler delegates to tokenService.cancel()
- [x] No direct Supabase calls

**Tests**: none
**Gate**: build

---

### T16: Secure /api/evaluate with session validation

**What**: Add session cookie validation to `src/app/api/evaluate/route.ts`
**Where**: `src/app/api/evaluate/route.ts`
**Depends on**: T3
**Reuses**: SessionRepository, hashSessionToken
**Requirement**: ARCH-04

**Done when**:

- [x] Returns 401 if no session cookie
- [x] Returns 401 if session expired/invalid
- [x] Delegates to harness only after session validated

**Tests**: none
**Gate**: build

---

### T17: Create public-proxy/evaluate route

**What**: Create `src/app/api/public-proxy/evaluate/route.ts` proxy route
**Where**: `src/app/api/public-proxy/evaluate/route.ts`
**Depends on**: T16
**Reuses**: `proxyToInternal()` from `src/lib/auth/proxy.ts`
**Requirement**: ARCH-04

**Done when**:

- [x] Proxy forwards to /api/evaluate with internal API key
- [x] Chat page calls `/api/public-proxy/evaluate`

**Tests**: none
**Gate**: build

---

### T18: Fix .env.example with placeholders

**What**: Replace real Supabase URL and key in `.env.example` with placeholders
**Where**: `.env.example`
**Depends on**: None
**Reuses**: None
**Requirement**: ARCH-06

**Done when**:

- [x] NEXT_PUBLIC_SUPABASE_URL is a placeholder
- [x] NEXT_PUBLIC_SUPABASE_ANON_KEY is a placeholder
- [x] No real URLs or keys in the file

**Tests**: none
**Gate**: build

---

### T19: Update admin UI and API client to remove tokenPlain

**What**: Update `src/lib/api/client.ts` and `src/app/admin/page.tsx` to work without tokenPlain
**Where**: `src/lib/api/client.ts`, `src/app/admin/page.tsx`
**Depends on**: T6
**Reuses**: AdminLeadRowDTO
**Requirement**: ARCH-03

**Done when**:

- [x] AdminLeadRow type has no tokenPlain field
- [x] Admin page uses generatedTokens[leadId] instead of row.tokenPlain
- [x] generateToken returns `{ token: string }` without id

**Tests**: none
**Gate**: build

---

### T20: Write service layer unit tests

**What**: Create `src/lib/service/token-service.test.ts`, `lead-service.test.ts`, `admin-service.test.ts`
**Where**: `src/lib/service/*.test.ts`
**Depends on**: T4, T5, T6
**Reuses**: Mock repositories
**Requirement**: ARCH-01, ARCH-02, ARCH-03

**Done when**:

- [x] TokenService tests: validateAndCreateSession (all statuses), generateForLead (with retry), cancel, sendTokenEmail
- [x] LeadService tests: createLead (success, duplicate, constraint violation, email normalization)
- [x] AdminService tests: getTokensDashboard (KPIs, no tokenPlain)
- [x] All 41 tests pass

**Tests**: unit
**Gate**: quick

---

### T21: Fix vitest config for path aliases

**What**: Add `resolve.alias` to `vitest.config.ts` so `@/` imports resolve correctly
**Where**: `vitest.config.ts`
**Depends on**: None
**Reuses**: None
**Requirement**: N/A (infra fix)

**Done when**:

- [x] Tests using `@/lib/...` imports pass
- [x] `npx vitest run` exits clean

**Tests**: none
**Gate**: build

---

### T22: Full build + test verification

**What**: Run complete build and test suite to verify all changes
**Where**: N/A (verification)
**Depends on**: T1-T21
**Reuses**: None
**Requirement**: All

**Done when**:

- [x] `npx tsc --noEmit` exits clean
- [x] `npx vitest run` - all tests pass
- [x] `npm run build` succeeds
- [x] `grep -r "getServiceClient\|supabase.from" src/app/api/` returns zero results

**Tests**: none
**Gate**: build

---

## Phase Execution Map

Phases run sequentially. Tasks within a phase run in order. Dependencies are declared in each task's `Depends on` field and validated in the cross-check table below.

- Phase 1: T1, T2, T3 (independent foundation)
- Phase 2: T4, T5, T6 (services, depend on Phase 1)
- Phase 3: T7, T8 (middleware infra)
- Phase 4: T9-T15 (route handler refactors, depend on Phase 2)
- Phase 5: T16-T19 (security fixes)
- Phase 6: T20-T22 (tests + verification, depend on all)

---

## Task Granularity Check

| Task | Scope | Status |
|------|-------|--------|
| T1: Create DTO types | 2 files | ✅ Granular |
| T2: Create token repo | 1 file | ✅ Granular |
| T3: Create lead + session repo | 2 files (cohesive) | ✅ Granular |
| T4: Create TokenService + tests | 2 files | ✅ Granular |
| T5: Create LeadService + tests | 2 files | ✅ Granular |
| T6: Create AdminService + tests | 2 files | ✅ Granular |
| T7: Create client-ip utility | 1 file | ✅ Granular |
| T8: Create middleware | 1 file | ✅ Granular |
| T9-T15: Refactor handlers | 1 file each | ✅ Granular |
| T16: Secure evaluate | 1 file | ✅ Granular |
| T17: Create proxy route | 1 file | ✅ Granular |
| T18: Fix .env.example | 1 file | ✅ Granular |
| T19: Update admin UI + client | 2 files (cohesive) | ✅ Granular |
| T20: Write tests | 3 files | ✅ Granular |
| T21: Fix vitest config | 1 file | ✅ Granular |
| T22: Full verification | N/A | ✅ Granular |

---

## Diagram-Definition Cross-Check

| Task | Depends On (task body) | Diagram Shows | Status |
|------|----------------------|---------------|--------|
| T1 | None | None | ✅ Match |
| T2 | None | None | ✅ Match |
| T3 | None | None | ✅ Match |
| T4 | T1, T2, T3 | T1→T4, T2→T4, T3→T4 | ✅ Match |
| T5 | T3 | T3→T5 | ✅ Match |
| T6 | T2, T3 | T2→T6, T3→T6 | ✅ Match |
| T7 | None | None | ✅ Match |
| T8 | T7 | T7→T8 | ✅ Match |
| T9 | T4 | T4→T9 | ✅ Match |
| T10 | T5 | T5→T10 | ✅ Match |
| T11 | T6 | T6→T11 | ✅ Match |
| T12 | T4 | T4→T12 | ✅ Match |
| T13 | T4 | T4→T13 | ✅ Match |
| T14 | T4 | T4→T14 | ✅ Match |
| T15 | T4 | T4→T15 | ✅ Match |
| T16 | T3 | T3→T16 | ✅ Match |
| T17 | T16 | T16→T17 | ✅ Match |
| T18 | None | None | ✅ Match |
| T19 | T6 | T6→T19 | ✅ Match |
| T20 | T4, T5, T6 | T4→T20, T5→T20, T6→T20 | ✅ Match |
| T21 | None | None | ✅ Match |
| T22 | T1-T21 | All→T22 | ✅ Match |

---

## Test Co-location Validation

| Task | Code Layer Created/Modified | Matrix Requires | Task Says | Status |
|------|---------------------------|----------------|-----------|--------|
| T1 | DTO | none | none | ✅ OK |
| T2 | Repository | none | none | ✅ OK |
| T3 | Repository | none | none | ✅ OK |
| T4 | Service | unit | unit | ✅ OK |
| T5 | Service | unit | unit | ✅ OK |
| T6 | Service | unit | unit | ✅ OK |
| T7 | Utility | none | none | ✅ OK |
| T8 | Middleware | none | none | ✅ OK |
| T9-T15 | Route Handler | none | none | ✅ OK |
| T16 | Route Handler | none | none | ✅ OK |
| T17 | Route Handler | none | none | ✅ OK |
| T18 | Config | none | none | ✅ OK |
| T19 | UI + Client | none | none | ✅ OK |
| T20 | Tests | unit | unit | ✅ OK |
| T21 | Config | none | none | ✅ OK |
| T22 | Verification | none | none | ✅ OK |
