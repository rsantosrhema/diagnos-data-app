# Data Validation Rules — Diagnos Data App

Detailed validation rules for development. Referenced by AGENTS.md section 9.

---

## 1. Zod at Every Trust Boundary

Every point where untrusted data enters the application MUST be validated with Zod.

| Boundary | Schema Location | Example |
|---|---|---|
| API route body | `src/lib/schemas/*.ts` | `screenerSubmissionSchema.safeParse(await req.json())` |
| API route params | Inline or `src/lib/schemas/*.ts` | `ParamsSchema.safeParse(params)` |
| Config/contract JSON | `src/lib/screener/contract.ts` | `screenerContractSchema.parse(snapshotJson)` at module load |
| Environment variables | `src/lib/env.ts` (create) | `EnvSchema.parse(process.env)` at startup |
| External API responses | Near the fetch call | `ResponseSchema.safeParse(await res.json())` |
| Search params | In the page/component | `SearchSchema.safeParse(searchParams)` |

---

## 2. Schema Conventions

### 2.1 Single Source of Truth

- Define the schema first, then infer the type. Never define a type manually that should come from a schema.

```typescript
// ✅ GOOD: schema is the source of truth
export const leadSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(160),
});
export type Lead = z.infer<typeof leadSchema>;

// ❌ BAD: type defined manually, schema may drift
export interface Lead {
  name: string;
  email: string;
}
export const leadSchema = z.object({ ... }); // could diverge
```

### 2.2 Use .strict() on Boundary Schemas

- Apply `.strict()` to all Zod objects at trust boundaries to reject unknown keys.
- This prevents mass-assignment attacks where an attacker adds unexpected fields.

```typescript
// ✅ GOOD: rejects unknown keys
const bodySchema = z.object({
  name: z.string(),
  email: z.string().email(),
}).strict();

// ❌ BAD: silently strips unknown keys (hides payload drift)
const bodySchema = z.object({
  name: z.string(),
  email: z.string().email(),
});
```

- Note: `.strict()` does NOT recurse into nested objects. Apply it to nested `z.object()` calls too.

### 2.3 Prefer safeParse Over parse at Boundaries

- Use `safeParse` at boundaries (returns `{ success, data }` or `{ success, error }`).
- Use `parse` only for trusted internal code where a thrown `ZodError` is acceptable.

```typescript
// ✅ GOOD: safeParse at boundary — you control the HTTP response
const result = bodySchema.safeParse(await req.json());
if (!result.success) {
  return NextResponse.json(
    { error: "Dados inválidos", details: result.error.flatten().fieldErrors },
    { status: 400 }
  );
}

// ❌ BAD: parse at boundary — throws, requires catch block
const data = bodySchema.parse(await req.json());
```

### 2.4 .optional() vs .nullable() vs .nullish()

- `.optional()` — key may be absent (`T | undefined`)
- `.nullable()` — value may be `null` (`T | null`)
- `.nullish()` — both allowed (`T | undefined | null`)

Choose the right one. Using `.nullable()` when the field is actually absent causes silent validation failures.

---

## 3. Validation Patterns

### 3.1 API Route Validation

Every API route handler MUST validate the request body with Zod before any business logic.

```typescript
export async function POST(req: Request) {
  // 1. Auth
  const session = await verifySession(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // 2. Parse + validate
  const result = CreateItemSchema.safeParse(await req.json());
  if (!result.success) {
    return NextResponse.json(
      { error: "Dados inválidos", details: result.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  // 3. Business logic with validated data
  const item = await createItem(result.data, session.userId);
  return NextResponse.json(item, { status: 201 });
}
```

### 3.2 Contract JSON Validation

Contract/config JSON (e.g. the screener questionnaire) is validated at module load and treated as reliable once typed. Resolve this schema using `parse` (fail fast at import), not `safeParse`:

```typescript
// src/lib/screener/contract.ts
function loadContract(): ScreenerContract {
  const result = screenerContractSchema.safeParse(snapshotJson);
  if (!result.success) {
    const issues = result.error.issues
      .map((i) => `${i.path.join(".")}: ${i.message}`)
      .join("; ");
    throw new Error(`Contrato JSON inválido: ${issues}`);
  }
  return result.data;
}
```

### 3.3 Environment Variable Validation

Validate env vars at module load time. Fail fast if misconfigured.

```typescript
// src/lib/env.ts
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  INTERNAL_API_KEY: z.string().min(32),
  RESEND_API_KEY: z.string().min(1),
  INTERNAL_API_KEY: z.string().min(32),
});

export const env = envSchema.parse(process.env);
```

### 3.4 Search Params Validation

Search params arrive as strings. Use `z.coerce` for type conversion.

```typescript
const searchSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  query: z.string().optional(),
});

// In a Server Component
export default async function Page({ searchParams }: Props) {
  const params = await searchParams;
  const result = searchSchema.safeParse(params);
  if (!result.success) redirect("/?page=1");
  const { page, limit, query } = result.data;
}
```

---

## 4. Error Response Format

### 4.1 Validation Error Structure

Return structured validation errors so clients can display field-level messages.

```typescript
// ✅ GOOD: structured validation error
if (!result.success) {
  return NextResponse.json(
    {
      error: "Dados inválidos",
      details: result.error.issues.map(issue => ({
        path: issue.path.join("."),
        message: issue.message,
      })),
    },
    { status: 400 }
  );
}
```

### 4.2 HTTP Status Codes

| Code | When to Use |
|---|---|
| 400 | Malformed JSON, missing required headers, validation failure |
| 401 | No valid authentication |
| 403 | Authenticated but not authorized |
| 404 | Resource not found |
| 409 | Conflict (duplicate, already consumed) |
| 429 | Rate limit exceeded |
| 500 | Internal server error (never for validation) |
| 502 | Upstream provider error |

### 4.3 Never Expose Raw ZodError

- Use `error.flatten()` or `error.issues` for structured output.
- Never send the raw `ZodError` object to the client — it contains internal schema details.

---

## 5. Common Zod Pitfalls

### 5.1 .strict() Not Recursing

`.strict()` only seals the object it's called on. For nested objects, apply `.strict()` to each.

```typescript
// ✅ GOOD: strict on nested objects
const schema = z.object({
  user: z.object({
    name: z.string(),
  }).strict(),
}).strict();

// ❌ BAD: only top-level is strict
const schema = z.object({
  user: z.object({
    name: z.string(),
  }), // nested object accepts unknown keys
}).strict();
```

### 5.2 Async Refinements

If a schema has async `.refine()` or `.transform()`, you MUST use `safeParseAsync` instead of `safeParse`.

```typescript
// If refinement is async:
const schema = z.object({
  email: z.string().email().refine(async (val) => {
    return await isEmailUnique(val); // async check
  }),
});

// ✅ MUST use safeParseAsync
const result = await schema.safeParseAsync(data);

// ❌ safeParse throws on async schemas
const result = schema.safeParse(data); // runtime error
```

### 5.3 Coercion for Query Strings

Query strings are always strings. Use `z.coerce` for automatic conversion.

```typescript
// ✅ GOOD: coerces string to number
const pageSchema = z.coerce.number().int().positive().default(1);

// ❌ BAD: expects number, receives string
const pageSchema = z.number().int().positive().default(1);
```

---

## 6. Testing Validation

### 6.1 Test Schema Edge Cases

Every schema should have tests for:
- Valid input (happy path)
- Missing required fields
- Invalid types (string where number expected)
- Boundary values (min/max length, empty strings)
- Unknown keys (with `.strict()`)
- Transform/sanitize behavior

```typescript
describe("leadSchema", () => {
  it("accepts valid lead", () => {
    const result = leadSchema.safeParse({
      name: "João Silva",
      company: "Acme",
      phone: "+55 11 99999-0000",
      email: "joao@acme.com",
      role: "CTO",
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing required fields", () => {
    const result = leadSchema.safeParse({ name: "João" });
    expect(result.success).toBe(false);
  });

  it("rejects invalid email", () => {
    const result = leadSchema.safeParse({ ...validLead, email: "not-an-email" });
    expect(result.success).toBe(false);
  });

  it("sanitizes text fields", () => {
    const result = leadSchema.safeParse({ ...validLead, name: "  João  " });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.name).toBe("João");
  });
});
```
