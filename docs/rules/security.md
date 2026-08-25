# Security Rules — Diagnos Data App

Detailed security rules for development. Referenced by AGENTS.md section 8.

---

## 1. Token Security

### 1.1 Token Generation

- Use `crypto.randomBytes` (CSPRNG) for all token generation. Never use `Math.random()`.
- Access tokens: minimum 128 bits of entropy for security-sensitive tokens.
- Session tokens: 256 bits (32 bytes) as hex string (see `src/lib/auth/token.ts`).
- Use unambiguous alphabets (no 0/O, 1/I/L) for human-readable tokens.

### 1.2 Token Storage

- NEVER store tokens in plaintext in the database.
- Hash with SHA-256 before storage: `createHash("sha256").update(token).digest("hex")`.
- Store only the hash; the plaintext token is returned once to the caller and never persisted.
- Single-use tokens must be marked as consumed immediately after first valid use.

### 1.3 Token Transmission

- NEVER send tokens in URL query strings (visible in logs, referrer headers, browser history).
- Use `Authorization: Bearer <token>` header for API tokens.
- Use `HttpOnly` cookies for session tokens (see section 1.4).
- NEVER return tokens in error responses or log messages.
- NEVER expose tokens via `console.log`, error messages, or analytics events.

### 1.4 Session Cookie Configuration

Every session cookie MUST have all four attributes:

```typescript
cookies().set("session", token, {
  httpOnly: true,    // JavaScript cannot read — prevents XSS token theft
  secure: true,      // HTTPS only — never sent over plaintext HTTP
  sameSite: "lax",   // blocks cross-site POST, allows top-level navigation
  path: "/",
  expires: expiresAt, // always set an expiry
});
```

- `httpOnly: true` is MANDATORY. No exceptions.
- `secure: true` is MANDATORY in production. Disable only for localhost dev.
- `sameSite: "lax"` is the default. Use `"strict"` only for high-security admin flows.
- NEVER use `sameSite: "none"` without explicit justification.

### 1.5 Token Comparison

- Use `crypto.timingSafeEqual` for comparing secret values. Never use `===`.
- Hash both values before comparison to handle different lengths (see `src/lib/auth/internal-key.ts`).

```typescript
// ✅ GOOD: timing-safe comparison
const provided = sha256(headerValue);
const expected = sha256(expectedKey);
if (provided.length !== expected.length) return false;
return timingSafeEqual(provided, expected);

// ❌ BAD: vulnerable to timing attacks
return headerValue === expectedKey;
```

### 1.6 Token Revocation

- On logout: delete the session from the database AND clear the cookie. Both.
- Single-use tokens: mark as consumed in the database on first valid use.
- Never allow reuse of consumed tokens.

---

## 2. Authentication Rules

### 2.1 Every Route Must Verify Auth

- Every API route and Server Action MUST verify authentication before any operation.
- NEVER rely solely on middleware/proxy.ts for auth — re-verify at the data boundary.
- Middleware can be bypassed (Next.js advisories: GHSA-267c-6grr-h53f, CVE-2025-29927).

```typescript
// ✅ GOOD: auth verified in the route handler
export async function POST(req: Request) {
  const session = await verifySession(req);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  // ... proceed with operation
}

// ❌ BAD: trusting middleware alone
export async function POST(req: Request) {
  // assumes middleware already checked auth — it can be bypassed
  await db.insert(data);
}
```

### 2.2 Auth Mechanisms in This Project

| Mechanism | Where | Verification |
|---|---|---|
| Session cookie (`diagnos_session`) | `/api/tokens/validate` (redirect), `/diagnostico` | Hash lookup in `sessions` table |
| Internal API key (`x-internal-api-key`) | All internal `/api/*` routes | `verifyInternalApiKey()` — timing-safe SHA-256 |
| Supabase Bearer JWT | Admin routes | `supabase.auth.getUser()` (server-verified) |
| Access token (6-char) | `/api/tokens/validate` | SHA-256 hash lookup + TTL check |

### 2.3 Frontend Never Handles Auth Directly

- Frontend code (`src/lib/api/client.ts`) calls ONLY proxy routes (`/api/public-proxy/*`, `/api/admin-proxy/*`).
- Frontend NEVER stores, reads, or manipulates `INTERNAL_API_KEY`.
- Frontend NEVER calls internal `/api/*` routes directly.
- The proxy (`src/lib/auth/proxy.ts`) injects the internal key server-side.

```typescript
// ✅ GOOD: frontend calls proxy
const result = await apiFetch("/public-proxy/tokens/validate", {
  method: "POST",
  body: { token },
});

// ❌ BAD: frontend calls internal route directly
const result = await fetch("/api/tokens/validate", {
  method: "POST",
  body: JSON.stringify({ token }),
});
```

### 2.4 Supabase Auth Verification

- Use `supabase.auth.getUser()` (server-verified) — NEVER `supabase.auth.getSession()` (client-parsed).
- `getUser()` calls the Supabase Auth server to verify the JWT. `getSession()` only decodes the cookie client-side and is not trustworthy for authorization.

---

## 3. Environment Variables

### 3.1 NEXT_PUBLIC_ Prefix

- Variables prefixed with `NEXT_PUBLIC_` are bundled into client JavaScript. They are visible to everyone.
- NEVER prefix secrets with `NEXT_PUBLIC_`:
  - `SUPABASE_SERVICE_ROLE_KEY` — no prefix (correct)
  - `INTERNAL_API_KEY` — no prefix (correct)
  - `RESEND_API_KEY` — no prefix (correct)
  - `NEXT_PUBLIC_SUPABASE_URL` — prefix OK (public, not a secret)
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY` — prefix OK (designed to be public)

### 3.2 Audit Checklist

Before every deploy, verify:

```bash
# These should NEVER exist
grep -r "NEXT_PUBLIC_SUPABASE_SERVICE_ROLE" .
grep -r "NEXT_PUBLIC_INTERNAL_API_KEY" .
grep -r "NEXT_PUBLIC_RESEND_API_KEY" .
```

### 3.3 Access Pattern

- Only `src/lib/supabase/server.ts` and repository modules access `process.env` for secrets.
- Client components should NEVER access `process.env` directly — use `NEXT_PUBLIC_*` constants or fetch from server.
- Validate env vars at startup with Zod (fail fast if misconfigured).

---

## 4. Error Handling Security

### 4.1 Never Leak Internals

- NEVER return stack traces, internal error messages, or database errors to the client.
- NEVER expose `String(err)` in production responses (can leak hostnames, ports, paths).
- Log detailed errors server-side with correlation IDs for debugging.
- Return generic messages to the client.

```typescript
// ✅ GOOD
catch (err) {
  console.error("[req-abc123] Transaction failed:", err);
  return NextResponse.json({ error: "Erro interno" }, { status: 500 });
}

// ❌ BAD: leaks internal details
catch (err) {
  return NextResponse.json(
    { error: "Falha ao chamar API interna", detail: String(err) },
    { status: 502 }
  );
}
```

### 4.2 Error Mapping

| Error Type | HTTP Status | Client Message |
|---|---|---|
| Invalid JSON body | 400 | "JSON inválido" |
| Zod validation failure | 400 | "Dados inválidos" + structured issues |
| `ValidationError` | 400 | "Dados inválidos" |
| `TokenServiceError` | `err.status` | Service-specific message |
| `ProviderError` | 502 | "Erro ao processar diagnóstico" |
| `ReportError` | 500 | "Erro ao gerar relatório" |
| Unknown | 500 | "Erro interno" |

---

## 5. Rate Limiting

### 5.1 Current Configuration

All public-facing routes have rate limiting via `src/middleware.ts`:

| Route | Limit | Window |
|---|---|---|
| `/api/public-proxy/leads` | 5 req | 10 min |
| `/api/public-proxy/tokens/validate` | 10 req | 10 min |
| `/api/public-proxy/screener` | 5 req | 10 min |

### 5.2 Rules

- Every new public-facing API route MUST have rate limiting.
- Rate limit by IP for anonymous requests, by userId for authenticated requests.
- Return 429 with `Retry-After` header when limit exceeded.
- Log rate limit violations for monitoring.

---

## 6. Supabase Security

### 6.1 Client Separation

| Client | File | Key | Usage |
|---|---|---|---|
| Service role | `src/lib/supabase/server.ts` | `SUPABASE_SERVICE_ROLE_KEY` | Server-only: bypasses RLS |
| Browser (anon) | `src/lib/supabase/browser.ts` | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Auth flows only, never for data queries |

### 6.2 Rules

- Service role client MUST only be imported in server-side modules.
- Add `import "server-only"` to `src/lib/supabase/server.ts` to enforce at build time.
- NEVER use user-provided IDs as privileged query parameters — always use the authenticated session's userId.
- RLS enabled on all tables as defense-in-depth (even if authorization is checked in code).

### 6.3 Query Pattern

```typescript
// ✅ GOOD: userId from authenticated session
const session = await verifySession(req);
const { data } = await supabase
  .from("assessments")
  .select("*")
  .eq("user_id", session.userId);

// ❌ BAD: userId from request body (IDOR vulnerability)
const { userId } = await req.json();
const { data } = await supabase
  .from("assessments")
  .select("*")
  .eq("user_id", userId);
```

---

## 7. Input Sanitization

### 7.1 XSS Prevention

- Sanitize all user-provided text before storage (see `sanitizeText` in `src/lib/schemas/lead.ts`).
- Never use `dangerouslySetInnerHTML` without explicit sanitization (DOMPurify).
- Zod `.transform()` can sanitize on parse:

```typescript
const nameSchema = z.string()
  .trim()
  .min(2)
  .max(120)
  .transform(sanitizeText);
```

### 7.2 Honeypot Pattern

- Forms include a hidden `website` field as a honeypot.
- If `website` is non-empty, the request is from a bot — return silently without processing.
- See `leadSchema` and `screenerSubmissionSchema` for implementation.

### 7.3 Prototype Pollution

- Use `.strict()` on Zod boundary schemas to reject unknown keys.
- Never merge user input directly into objects without validation.

---

## 8. Dependency Security

- Run `npm audit` regularly and before deploys.
- Pin dependency versions in `package.json` (use exact versions or `^` with caution).
- Never commit `package-lock.json` changes without reviewing the diff.
- Keep `next` patched to the latest security version.

---

## 9. Pre-Deploy Security Checklist

- [ ] No `NEXT_PUBLIC_` prefix on secret env vars
- [ ] All API routes have auth verification
- [ ] All inputs validated with Zod at the boundary
- [ ] Error responses never leak stack traces or internal details
- [ ] Rate limiting on all public-facing endpoints
- [ ] Session cookies have `httpOnly`, `secure`, `sameSite`, `expires`
- [ ] Tokens never appear in logs, error messages, or client code
- [ ] `npm audit` passes with no critical vulnerabilities
- [ ] `import "server-only"` on server-only modules
- [ ] Supabase service role never imported in client components
