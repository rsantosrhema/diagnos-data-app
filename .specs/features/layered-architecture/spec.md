# Layered Architecture (ADR-007) Specification

## Problem Statement

The application's route handlers contain inline business logic, direct Supabase queries, and return ad-hoc responses with internal fields (token_plain, lead_id UUIDs). ADR-007 mandates a layered architecture (Middleware → Route Handler → Service → Repository → DTOs) to enforce security, testability, and maintainability. The current monolithic handlers make auditing auth impossible, scatter Supabase access across 8 files, and expose sensitive fields to the client.

## Goals

- [x] Every route handler delegates to a Service layer (zero business logic in handlers)
- [x] All Supabase access goes through a Repository layer (single access point per entity)
- [x] Internal fields (token_plain, raw UUIDs) never reach the client via DTOs
- [x] The `/api/evaluate` endpoint requires session authentication
- [x] The chat page uses the proxy pattern instead of calling `/api/evaluate` directly
- [x] `.env.example` uses placeholder values (no real URLs or keys)
- [x] Rate limiting is centralized in Next.js middleware
- [x] All layers are covered by tests

## Out of Scope

| Feature | Reason |
|---------|--------|
| ORM migration (Prisma/Drizzle) | Current Supabase JS client is sufficient; ORM adds complexity without need now |
| RAG with pgvector | Future feature per ADR-006; not part of architecture reorganization |
| Logging/metrics infrastructure | Observability layer deferred to a future feature |
| Admin auth migration (Supabase Auth → custom) | Current Supabase Auth works; out of scope for this reorganization |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
|----------------------|---------------|-----------|------------|
| token_plain should not be stored in DB | Only returned in generate/regenerate response; admin must capture it at generation time | ADR-003: "o token em texto puro nunca é persistido" | y |
| Admin dashboard needs leadId/tokenId for operations | Include leadId and tokenId in admin DTOs despite being internal UUIDs | Admin needs to identify which lead/token to act on | y |
| Middleware handles rate limiting only | Auth checks remain in route handlers via verifyInternalApiKey | Token-based auth is per-endpoint, not suitable for middleware | y |

**Open questions:** none - all resolved or logged above.

---

## User Stories

### P1: Thin Route Handlers ⭐ MVP

**User Story**: As a developer, I want route handlers that only validate input and delegate to services, so that business logic is centralized and auditable.

**Why P1**: This is the core of ADR-007. Without this, all other improvements are surface-level.

**Acceptance Criteria**:

1. WHEN a route handler receives a request THEN it SHALL validate input with Zod and delegate to a Service method
2. The route handler SHALL NOT contain direct Supabase queries
3. The route handler SHALL NOT contain business logic (token lifecycle, session management, email orchestration)
4. IF the Service throws a typed error (TokenServiceError, LeadServiceError) THEN the handler SHALL map it to the appropriate HTTP status code

**Independent Test**: Every refactored handler has ≤15 lines of logic (verify + parse + delegate + catch).

---

### P1: Repository Layer

**User Story**: As a developer, I want all Supabase access encapsulated in Repository modules, so that database queries are centralized and replaceable.

**Why P1**: Without repository isolation, Supabase queries scatter across handlers and switching providers requires rewriting every endpoint.

**Acceptance Criteria**:

1. The Repository layer SHALL be the only code that calls `supabase.from(...)` or `supabase.rpc(...)`
2. Repository methods SHALL use domain names (e.g., `consume`, `cancelActiveByLeadId`) not raw SQL-like names
3. IF a repository operation fails THEN it SHALL throw a typed error that the Service can handle

**Independent Test**: `grep -r "getServiceClient\|supabase.from\|supabase.rpc" src/app/api/` returns zero results.

---

### P1: DTO Layer (No Internal Fields in Responses)

**User Story**: As a security-conscious developer, I want response DTOs that filter internal fields, so that token hashes, raw UUIDs, and connection details never reach the client.

**Why P1**: Exposing `token_plain` to the admin UI is a security violation. If the browser stores it, it can leak.

**Acceptance Criteria**:

1. API responses SHALL use DTO types that explicitly exclude internal fields (token_plain, raw connection strings)
2. The admin dashboard response SHALL NOT contain tokenPlain
3. The generate/regenerate response SHALL contain the plaintext token only once (in the response body), never stored in DB

**Independent Test**: The AdminLeadRowDTO type does not have a tokenPlain field. The generate endpoint returns `{ token: string }` without an `id` field.

---

### P1: Secure /api/evaluate

**User Story**: As a user, I want the diagnostic evaluation endpoint to require authentication, so that unauthenticated users cannot abuse the LLM evaluation.

**Why P1**: The evaluate endpoint was completely unauthenticated — anyone could POST and consume Ollama credits.

**Acceptance Criteria**:

1. WHEN a request to `/api/evaluate` lacks a valid session cookie THEN the system SHALL return 401
2. WHEN the session is expired THEN the system SHALL return 401
3. The chat page SHALL call `/api/public-proxy/evaluate` instead of `/api/evaluate` directly

**Independent Test**: `curl -X POST /api/evaluate` without cookie returns 401. Chat page source references `/api/public-proxy/evaluate`.

---

### P2: Centralized Rate Limiting

**User Story**: As a developer, I want rate limiting in Next.js middleware, so that all public endpoints are protected without duplicating rate-limit logic in each handler.

**Why P2**: Rate limiting was duplicated across 2 handlers and absent from others.

**Acceptance Criteria**:

1. Next.js middleware SHALL apply rate limiting to all `/api/public-proxy/*` routes
2. Each public-proxy route SHALL have its own rate limit configuration
3. WHEN rate limit is exceeded THEN the system SHALL return 429 with Retry-After header

**Independent Test**: Middleware config matches `/api/public-proxy/:path*`. Rate limit config exists for each public route.

---

### P2: Security Hygiene

**User Story**: As a developer, I want `.env.example` to use placeholder values and no secrets committed to the repo.

**Why P2**: The committed `.env.example` contained a real Supabase URL and anon key.

**Acceptance Criteria**:

1. `.env.example` SHALL use placeholder values for all variables
2. No file tracked by git SHALL contain real Supabase URLs, API keys, or tokens

**Independent Test**: `grep -r "utpamkyttlgffziegomp" . --include="*.ts" --include="*.tsx" --include="*.env*"` returns zero results (excluding `.env.local`).

---

## Edge Cases

- IF a token hash collides (unique constraint violation) THEN the service SHALL retry up to 5 times before failing
- IF the lead is not found during token generation THEN the service SHALL return 404
- IF the token status is not "disponivel" during send THEN the service SHALL return 409
- IF the token is expired during validation THEN the service SHALL mark it as expired and return 401
- IF the email send fails THEN the service SHALL return a mailto fallback link

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
|---------------|-------|-------|--------|
| ARCH-01 | P1: Thin Route Handlers | Service + DTO | Verified |
| ARCH-02 | P1: Repository Layer | Repository | Verified |
| ARCH-03 | P1: DTO Layer | DTO | Verified |
| ARCH-04 | P1: Secure /api/evaluate | Security | Verified |
| ARCH-05 | P2: Centralized Rate Limiting | Middleware | Verified |
| ARCH-06 | P2: Security Hygiene | Config | Verified |

**Coverage**: 6 total, 6 mapped to tasks, 0 unmapped

---

## Success Criteria

- [x] `grep -r "getServiceClient\|supabase.from" src/app/api/` returns zero results (all queries go through repository)
- [x] `grep -r "tokenPlain" src/lib/dto/` returns zero results (no internal fields in DTOs)
- [x] All 41 tests pass
- [x] `tsc --noEmit` exits clean
- [x] `next build` succeeds
- [x] `/api/evaluate` returns 401 without session cookie
