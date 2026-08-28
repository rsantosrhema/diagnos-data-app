# STATE.md — Project Memory

## Decisions

| ID | Decision | Status | Date | Rationale |
|----|----------|--------|------|-----------|
| AD-001 | Hybrid calibration config (JSON seed + Supabase runtime) | active | 2025-08-25 | Hotfix capability without redeploy; reproducible seed; graceful fallback if Supabase down |
| AD-002 | Weight normalization via largest-remainder (Hamilton) method | active | 2025-08-25 | Guarantees integer weights summing exactly to 100; avoids rounding drift |
| AD-003 | Module-level cache with 60s TTL for active calibration | active | 2025-08-25 | Avoids Supabase hit on every submission; acceptable staleness window |
| AD-004 | `computeContextualScores` wraps existing `computeScores` | active | 2025-08-25 | Preserves backward compatibility; new function is additive, not replacement |

## Handoff

**Last session:** 2025-08-25
**Feature:** contextual-scoring
**Phase:** Execute (completed — all 11 tasks done)
**Next step:** Feature-level validation (Verifier) or commit
**Branch:** (current)
**Uncommitted changes:** All files from contextual-scoring feature (see git status)
