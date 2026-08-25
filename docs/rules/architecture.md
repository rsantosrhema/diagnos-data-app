# Architecture Enforcement Rules — Diagnos Data App

Detailed architecture rules for development. Referenced by AGENTS.md section 10.

---

## 1. Layered Backend (ADR-007)

The backend follows a strict layered architecture:

```
Route (thin) → Service (logic) → Repository (data) → DTO (safe shape)
```

### 1.1 Layer Responsibilities

| Layer | Responsibility | What it does NOT do |
|---|---|---|
| **Route** (`src/app/api/*/route.ts`) | Auth verification, input validation (Zod), error mapping to HTTP status | Business logic, direct DB queries |
| **Service** (`src/lib/service/*.ts`) | Business logic, orchestration, error throwing | HTTP concerns, DB queries |
| **Repository** (`src/lib/repository/*.ts`) | Data access via Supabase client, CRUD operations | Business logic, HTTP concerns |
| **DTO** (`src/lib/dto/*.ts`) | Safe data shapes returned to client | Raw DB rows, internal fields |

### 1.2 Route Handler Pattern

```typescript
// src/app/api/example/route.ts
export async function POST(req: Request) {
  // 1. Auth
  const session = await verifySession(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // 2. Input validation
  const result = CreateSchema.safeParse(await req.json());
  if (!result.success) {
    return NextResponse.json({ error: "Dados inválidos", details: result.error.flatten().fieldErrors }, { status: 400 });
  }

  // 3. Service call
  try {
    const service = createService({ repo: createRepo(getServiceClient()) });
    const item = await service.create(result.data, session.userId);
    return NextResponse.json(item, { status: 201 });
  } catch (err) {
    if (err instanceof ServiceError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("[req-id] Error:", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
```

### 1.3 Service Pattern

```typescript
// src/lib/service/example-service.ts
export class ExampleServiceError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "ExampleServiceError";
    this.status = status;
  }
}

export function createExampleService(deps: { repo: ExampleRepo }) {
  return {
    async create(input: CreateInput, userId: string) {
      // Business logic here
      const existing = await deps.repo.findByUser(userId);
      if (existing) throw new ExampleServiceError("Already exists", 409);
      return deps.repo.create({ ...input, userId });
    },
  };
}
```

### 1.4 Repository Pattern

```typescript
// src/lib/repository/example-repo.ts
export function createExampleRepo(supabase: SupabaseClient) {
  return {
    async findByUser(userId: string) {
      const { data, error } = await supabase
        .from("examples")
        .select("id, name, created_at")  // explicit columns, never SELECT *
        .eq("user_id", userId)
        .single();
      if (error && error.code !== "PGRST116") throw error;
      return data;
    },

    async create(input: NewExample) {
      const { data, error } = await supabase
        .from("examples")
        .insert(input)
        .select("id, name, created_at")  // return safe columns only
        .single();
      if (error) throw error;
      return data;
    },
  };
}

export type ExampleRepo = ReturnType<typeof createExampleRepo>;
```

---

## 2. Proxy Pattern (ADR-007)

The application uses a two-tier API architecture:

```
Browser → /api/public-proxy/* → (injects INTERNAL_API_KEY) → /api/*
Browser → /api/admin-proxy/* → (injects INTERNAL_API_KEY) → /api/*
```

### 2.1 Rules

- Client code (`src/lib/api/client.ts`) calls ONLY proxy routes.
- Proxy routes (`src/app/api/public-proxy/*`, `src/app/api/admin-proxy/*`) inject the internal key and forward.
- Internal routes (`src/app/api/*`) verify the internal key + session/manager auth.
- NEVER expose internal routes to the client directly.

### 2.2 Adding a New Endpoint

1. Create the internal route at `src/app/api/<name>/route.ts` with full auth + validation.
2. Create the proxy route at `src/app/api/public-proxy/<name>/route.ts` that calls `proxyToInternal`.
3. Add the client function in `src/lib/api/client.ts` that calls the proxy route.
4. Add rate limiting in `src/middleware.ts` if the route is public-facing.

---

## 3. Server/Client Component Boundary

### 3.1 Default: Server Component

Every component is a Server Component by default in App Router. Add `"use client"` ONLY when needed.

### 3.2 What Needs "use client"

- `useState`, `useEffect`, `useRef`, `useReducer`
- Event handlers (`onClick`, `onChange`, `onSubmit`)
- Browser APIs (`localStorage`, `IntersectionObserver`, `navigator`)
- Third-party hooks that require client context

### 3.3 What Does NOT Need "use client"

- Components that render HTML from props
- Components that fetch data via `async/await`
- Layout components that only wrap children
- SEO components (JSON-LD, metadata)

### 3.4 Never Import Server-Only Modules in Client Components

```typescript
// ❌ BAD: importing server module in client component
// components/MyClientComponent.tsx
"use client";
import { getServiceClient } from "@/lib/supabase/server"; // CRITICAL: exposes service role key

// ✅ GOOD: server component fetches data, passes as props
// app/page.tsx (Server Component)
import { getServiceClient } from "@/lib/supabase/server";
export default async function Page() {
  const data = await getServiceClient().from("items").select();
  return <ClientComponent items={data} />;
}
```

### 3.5 Use "server-only" Package

Add `import "server-only"` to modules that must never reach the browser:

```typescript
// src/lib/supabase/server.ts
import "server-only";
import { createClient } from "@supabase/supabase-js";
// ...
```

This causes a build error if a client component tries to import it.

### 3.6 Props Must Be Serializable

Props passed from Server to Client Components must be serializable (JSON-safe):

```typescript
// ❌ BAD: passing functions or non-serializable data
<ClientComponent onSubmit={async (data) => await save(data)} />

// ✅ GOOD: pass data, handle actions in server actions or route handlers
<ClientComponent initialData={serializedData} />
```

---

## 4. Screener Contract as Source of Truth (ADR-008)

### 4.1 The Rule

The public screener is driven by the contract in `docs/snapshot-maturidade-dados.json`, loaded and typed via `src/lib/screener/contract.ts` (Zod-validated at module load). Do NOT hardcode the questionnaire in components.

- Question/option/dimension/weight/band content must come from `SCREENER_CONTRACT`.
- Scoring is deterministic (`src/lib/screener/scoring.ts`) — no LLM in the public triage.
- The `agent_payload` (built in `src/lib/screener/agent-payload.ts`) is reserved for a future paid LLM diagnostic (Diagnóstico 360°); the public screener itself never calls an LLM.

### 4.2 Changing the Questionnaire

Edit `docs/snapshot-maturidade-dados.json` and keep it under `profile.bpm`/the Zod `screenerContractSchema`. A content change is a data change, not a redeploy.

---

## 5. File Organization

### 5.1 Where to Put New Files

| Type | Location | Example |
|---|---|---|
| Zod schema | `src/lib/schemas/` | `src/lib/schemas/invoice.ts` |
| Service | `src/lib/service/` | `src/lib/service/invoice-service.ts` |
| Repository | `src/lib/repository/` | `src/lib/repository/invoice-repo.ts` |
| DTO | `src/lib/dto/` | `src/lib/dto/invoice.ts` |
| API route | `src/app/api/<name>/route.ts` | `src/app/api/invoices/route.ts` |
| Proxy route | `src/app/api/public-proxy/<name>/route.ts` | `src/app/api/public-proxy/invoices/route.ts` |
| React component | `src/components/` | `src/components/InvoiceForm.tsx` |
| Screener contract | `docs/snapshot-maturidade-dados.json` | source of truth |
| Screener helpers | `src/lib/screener/` | `src/lib/screener/scoring.ts` |
| Test file | Colocated with source | `src/lib/service/invoice-service.test.ts` |

### 5.2 Naming Conventions

| Type | Convention | Example |
|---|---|---|
| Schema file | kebab-case | `lead-schema.ts` |
| Service file | kebab-case + `-service` | `token-service.ts` |
| Repository file | kebab-case + `-repo` | `token-repo.ts` |
| DTO file | kebab-case | `admin.ts` |
| Test file | Same as source + `.test.ts` | `token-service.test.ts` |
| Component file | PascalCase | `RhemaLogo.tsx` |
| Route file | `route.ts` | `src/app/api/leads/route.ts` |

---

## 6. Error Hierarchy

### 6.1 Service Errors (in `src/lib/service/`)

Each service defines its own error class:

```
Error
├── TokenServiceError    — status: number
├── ScreenServiceError   — status: number
├── LeadServiceError     — status: number
└── ScoringError         — (in screener/scoring.ts)
```

### 6.2 Client Error

```
ApiError extends Error — status: number, data: unknown
```

### 6.3 Rules

- Use typed errors, never throw plain strings.
- Include a `status` field in service errors for HTTP mapping.
- Map errors to HTTP status codes in the route handler (see section 1.2).
- NEVER expose error internals to the client.

---

## 7. Dependency Injection Pattern

Services use factory functions with typed dependencies:

```typescript
// Define the service
export function createTokenService(deps: {
  tokenRepo: TokenRepo;
  leadRepo: LeadRepo;
  sessionRepo: SessionRepo;
}) {
  return {
    async validate(token: string) { /* uses deps.tokenRepo */ },
    async generate(leadId: string) { /* uses deps.leadRepo, deps.tokenRepo */ },
  };
}

export type TokenService = ReturnType<typeof createTokenService>;

// Use in route handler
const service = createTokenService({
  tokenRepo: createTokenRepo(supabase),
  leadRepo: createLeadRepo(supabase),
  sessionRepo: createSessionRepo(supabase),
});
```

This pattern enables:
- Easy testing (mock individual deps)
- Clear dependency graph
- No global state
