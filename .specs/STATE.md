# STATE.md — Project Memory

## Decisions

| ID | Decision | Status | Date | Rationale |
|----|----------|--------|------|-----------|
| AD-001 | Hybrid calibration config (JSON seed + Supabase runtime) | active | 2025-08-25 | Hotfix capability without redeploy; reproducible seed; graceful fallback if Supabase down |
| AD-002 | Weight normalization via largest-remainder (Hamilton) method | active | 2025-08-25 | Guarantees integer weights summing exactly to 100; avoids rounding drift |
| AD-003 | Module-level cache with 60s TTL for active calibration | active | 2025-08-25 | Avoids Supabase hit on every submission; acceptable staleness window |
| AD-004 | `computeContextualScores` wraps existing `computeScores` | active | 2025-08-25 | Preserves backward compatibility; new function is additive, not replacement |
| AD-005 | LLM/Exa providers configurados via env server-side (LLM_BASE_URL, LLM_API_KEY, LLM_MODEL, EXA_API_KEY); nunca em cliente | active | 2026-08-29 | Pipeline de agentes (ADR-009); credenciais nunca no bundle |

## Handoff

**Last session:** 2026-08-30
**Feature:** market-insights-pdf (slice 2: bullets priorizados + análise no PDF + e-mail pós-análise) — **DONE**
**Phase:** Execute complete — 8 commits (T1-T6 + verifier fixes), Verifier PASS (9/9 ACs, 3/3 mutants), validation.md written
**Next step:** Fatia 3 (radar de aranha no PDF + admin reprocessar `analise_pendente`) — ver ADR-009
**Branch:** main
**Uncommitted changes:** `.specs/features/market-insights-pdf/tasks.md` (status → Done, pendente de commit), `.specs/STATE.md` (este handoff)
