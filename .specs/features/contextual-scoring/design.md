# Contextual Scoring Design

**Spec**: `.specs/features/contextual-scoring/spec.md`
**Status**: Draft

---

## Architecture Overview

### Approach Selection

Three viable approaches for calibration config storage:

| Approach | Description | Pros | Cons |
|----------|-------------|------|------|
| **A: Pure JSON** | All config in `docs/scoring-calibration.json`, loaded at startup | Simple, no DB dependency, testable, version-controlled | Requires redeploy to change weights |
| **B: Hybrid (JSON seed + Supabase runtime)** ⭐ | JSON as seed/fallback, Supabase as runtime source. Service merges both (DB priority) | Hotfix without redeploy, reproducible seed, graceful fallback | More complex, Supabase dependency |
| **C: Full Supabase** | All config in Supabase, no JSON file | Fully dynamic | No fallback, harder to test, no git-tracked config |

**Recommendation: Approach B (Hybrid)**. It gives the operador hotfix capability via Supabase while keeping the JSON as reproducible seed and test fixture. If Supabase is down, scoring degrades gracefully to the JSON seed.

**Confirmed.**

---

### Data Flow

```mermaid
graph TD
    A[Client submits screener] --> B[/api/public-proxy/screener]
    B --> C[/api/screener route]
    C --> D[screenService.submitScreener]
    D --> E[loadCalibrationConfig]
    E --> F{Supabase has active version?}
    F -->|Yes| G[Use DB config]
    F -->|No| H[Use JSON seed]
    G --> I[computeContextualScores]
    H --> I
    I --> J[Normalize weights to 100]
    J --> K[Compute score with adjusted weights]
    K --> L[Map to recalibrated bands]
    L --> M[Persist diagnostic]
    M --> N[Generate PDF with adjusted weights]
    N --> O[Send email]

    P[Admin API] --> Q[scoring-config-service]
    Q --> R[scoring-config-repo]
    R --> S[(Supabase scoring_versions)]

    T[JSON seed] --> E
```

---

## Code Reuse Analysis

### Existing Components to Leverage

| Component | Location | How to Use |
|-----------|----------|------------|
| `SCREENER_CONTRACT` | `src/lib/screener/contract.ts` | Reuse `dimensoes` for base weights and dimension metadata |
| `computeScores` | `src/lib/screener/scoring.ts` | Extend with `computeContextualScores` that accepts adjusted weights |
| `screenerContractSchema` pattern | `src/lib/screener/contract.ts` | Same Zod-at-module-load pattern for calibration config |
| `createAssessmentRepository` | `src/lib/repository/assessment-repo.ts` | Same Supabase repository pattern for scoring-config-repo |
| `ScreenServiceError` | `src/lib/service/screen-service.ts` | Reuse typed error pattern |
| `getServiceClient` | `src/lib/supabase/server.ts` | Reuse for scoring-config-repo |
| `screenerSubmissionSchema.profile` | `src/lib/schemas/screener.ts` | Already captures `perfil_01`, `perfil_02`, `perfil_03` |

### Integration Points

| System | Integration Method |
|--------|-------------------|
| Supabase | New table `scoring_versions` via existing `getServiceClient()` |
| Scoring engine | New `computeContextualScores` wraps existing `computeScores` |
| PDF generator | `GeneratePdfInput.dimensionScores[].peso` already passed — just uses adjusted value |
| Admin API | New routes under `/api/admin/scoring-config` following existing admin proxy pattern |

---

## Components

### 1. Calibration Config Module

- **Purpose**: Load, validate, and export the scoring calibration configuration
- **Location**: `src/lib/screener/scoring-calibration.ts`
- **Interfaces**:
  - `scoringCalibrationSchema` — Zod schema for the full calibration JSON
  - `ScoringCalibration` — inferred type from schema
  - `ProfileFactor` — type for a single profile factor (segmento, porte_funcionarios, etc.)
  - `RecalibratedBand` — type for a single score band
  - `SCORING_CALIBRATION` — loaded constant (from JSON seed)
  - `loadCalibrationFromSeed(): ScoringCalibration` — loads and validates JSON
- **Dependencies**: `zod`, `docs/scoring-calibration.json`
- **Reuses**: Same pattern as `src/lib/screener/contract.ts` (Zod parse at module load)

### 2. Weight Calculator

- **Purpose**: Compute adjusted dimension weights based on company profile
- **Location**: `src/lib/screener/weight-calculator.ts`
- **Interfaces**:
  - `computeAdjustedWeights(params: { calibration: ScoringCalibration; profile: Record<string, string> }): AdjustedWeight[]` — returns array of `{ dimensionId, baseWeight, adjustedWeight, multiplier }`
  - `normalizeWeights(weights: number[], targetTotal: number): number[]` — proportional normalization
  - `clampWeight(adjusted: number, base: number, maxChangePercent: number): number` — clamp to ±40%
  - `getRecalibratedBands(calibration: ScoringCalibration, segmento: string): RecalibratedBand[]` — returns bands for segment or fallback
- **Dependencies**: `ScoringCalibration` type
- **Reuses**: None (new pure-function module)

### 3. Scoring Config Repository

- **Purpose**: CRUD for calibration versions in Supabase
- **Location**: `src/lib/repository/scoring-config-repo.ts`
- **Interfaces**:
  - `createVersion(params: { version: string; config: ScoringCalibration; createdBy: string }): Promise<ScoringConfigRow>`
  - `listVersions(): Promise<ScoringConfigRow[]>`
  - `getActiveVersion(): Promise<ScoringConfigRow | null>`
  - `activateVersion(id: string): Promise<void>` — sets `is_active=true`, deactivates others
- **Dependencies**: `SupabaseClient` from `getServiceClient()`
- **Reuses**: Same pattern as `createAssessmentRepository`

### 4. Scoring Config Service

- **Purpose**: Business logic for calibration management + config loading with fallback
- **Location**: `src/lib/service/scoring-config-service.ts`
- **Interfaces**:
  - `loadActiveCalibration(): Promise<ScoringCalibration>` — tries Supabase, falls back to JSON seed
  - `createCalibrationVersion(version: string, config: unknown): Promise<ScoringConfigRow>` — validates + persists
  - `activateCalibrationVersion(id: string): Promise<void>` — activates + deactivates others
- **Dependencies**: `scoring-config-repo`, `scoringCalibrationSchema`, `SCORING_CALIBRATION`
- **Reuses**: `ScreenServiceError` pattern for typed errors

### 5. Contextual Scoring Function

- **Purpose**: Compute scores with adjusted weights and recalibrated bands
- **Location**: `src/lib/screener/scoring.ts` (new export alongside existing `computeScores`)
- **Interfaces**:
  - `computeContextualScores(params: { contract: ScreenerContract; calibration: ScoringCalibration; answers: DimensionAnswer[]; contextAnswers: Record<string, string>; profile: Record<string, string>; role?: string }): ScreenerResult` — computes adjusted weights, then delegates to existing `computeScores` with adjusted weights
- **Dependencies**: `computeScores`, `computeAdjustedWeights`, `getRecalibratedBands`
- **Reuses**: Existing `computeScores` (wraps it, passing adjusted weights)

### 6. Admin API Routes

- **Purpose**: HTTP endpoints for calibration version management
- **Location**: `src/app/api/admin/scoring-config/route.ts` (GET, POST), `src/app/api/admin/scoring-config/[id]/activate/route.ts` (PATCH)
- **Interfaces**:
  - `GET /api/admin/scoring-config` — list versions
  - `POST /api/admin/scoring-config` — create version
  - `PATCH /api/admin/scoring-config/:id/activate` — activate version
- **Dependencies**: `scoring-config-service`, `verifySession` (admin auth)
- **Reuses**: Same route pattern as existing admin routes

---

## Data Models

### ScoringCalibration (Zod-inferred)

```typescript
interface ScoringCalibration {
  version: string;
  effective_from: string;
  dimensions: Record<string, {
    base_weight: number;
    min: number;
    max: number;
    description: string;
  }>;
  profile_factors: Record<string, {
    type: "categorical" | "ordinal";
    source_field: string;
    weight?: number; // only for ordinal factors in combination
    multipliers: Record<string, Record<string, number>>;
  }>;
  normalization: {
    method: "proportional";
    target_total: number;
    rounding: "nearest_integer";
  };
  constraints: {
    max_weight_change_percent: number;
    min_score: number;
    max_score: number;
  };
  recalibrated_bands: Record<string, Array<{
    min: number;
    max: number;
    rotulo: string;
    descricao: string;
  }>>;
}
```

### AdjustedWeight (computed)

```typescript
interface AdjustedWeight {
  dimensionId: string;
  baseWeight: number;
  adjustedWeight: number;
  multiplier: number; // combined multiplier before normalization
}
```

### ScoringConfigRow (Supabase)

```typescript
interface ScoringConfigRow {
  id: string;
  version: string;
  config: ScoringCalibration; // jsonb
  is_active: boolean;
  created_at: string;
  created_by: string;
}
```

### Supabase Table: `scoring_versions`

```sql
CREATE TABLE scoring_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version TEXT NOT NULL UNIQUE,
  config JSONB NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by TEXT NOT NULL
);

CREATE INDEX idx_scoring_versions_active ON scoring_versions (is_active) WHERE is_active = true;
CREATE INDEX idx_scoring_versions_created ON scoring_versions (created_at DESC);
```

---

## Error Handling Strategy

| Error Scenario | Handling | User Impact |
|---------------|----------|-------------|
| JSON seed invalid on startup | Fail fast at module load (throw) | App won't start — caught in build |
| Supabase unavailable for config | Fallback to JSON seed + log warning | Scoring works with seed weights |
| Multiple active versions | Use most recent by `created_at` + log warning | Transparent to user |
| Profile field missing | Use neutral multiplier (1.0) for that factor | Score uses remaining factors |
| Weight exceeds ±40% after normalization | Clamp and renormalize | Transparent to user |
| Score outside recalibrated bands | Throw `ScoringError` | 500 to client (should never happen) |
| Admin API called without auth | HTTP 401 | Admin sees "Unauthorized" |
| Config fails Zod validation | HTTP 400 with flattened issues | Admin sees validation errors |

---

## Risks & Concerns

| Concern | Location | Impact | Mitigation |
|---------|----------|--------|------------|
| Weight normalization rounding errors | `weight-calculator.ts` | Sum ≠ 100 after rounding | Use largest-remainder method for integer distribution |
| Supabase latency on every submission | `scoring-config-service.ts` | Added ~50ms per submission | In-memory cache with TTL (60s) or module-level cache |
| JSON seed and DB config drift | `scoring-config-service.ts` | Confusion about which is active | Log clearly which source was used; admin API shows active version |
| `computeScores` currently uses `contract.dimensoes[].peso` | `scoring.ts:64` | Need to pass adjusted weights without breaking existing API | New function wraps existing one, passing adjusted weights as parameter |

---

## Tech Decisions (only non-obvious ones)

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Cache strategy for active calibration | Module-level cache with 60s TTL | Avoids Supabase hit on every submission; stale for max 60s |
| Weight normalization method | Largest-remainder (Hamilton) | Guarantees integer weights summing exactly to 100 |
| Where to inject adjusted weights | New `computeContextualScores` wraps `computeScores` | Preserves existing API; backward compatible |
| Admin API auth | Reuse existing admin session verification | Consistent with current admin routes |
| JSON schema strictness | `.strict()` on all Zod schemas | Reject unknown fields early (SCORE-01, SCORE-02) |

---

## Implementation Order

1. **JSON seed file** (`docs/scoring-calibration.json`) — data foundation
2. **Calibration config module** (`scoring-calibration.ts`) — schema + loader
3. **Weight calculator** (`weight-calculator.ts`) — pure functions
4. **Scoring config repository** (`scoring-config-repo.ts`) — Supabase CRUD
5. **Scoring config service** (`scoring-config-service.ts`) — business logic + fallback
6. **Contextual scoring function** (update `scoring.ts`) — integrate with scoring engine
7. **Screen service update** (`screen-service.ts`) — use contextual scoring
8. **Report generator update** (`report-generator.ts`) — show adjusted weights
9. **Supabase migration** — `scoring_versions` table
10. **Admin API routes** — CRUD endpoints
11. **Tests** — unit + integration
