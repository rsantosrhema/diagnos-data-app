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

**Last session:** 2026-08-29
**Feature:** market-insights-agents (slice 1: research/orchestrator/persistence) — **DONE**
**Phase:** Execute complete — 14 commits (T1-T12 + follow-ups), Verifier PASS, validation.md written
**Next step:** Fatia 2 (bullets priorizados + fallback PDF básico) ou Fatia 3 (radar + admin reprocessar)
**Branch:** main
**Uncommitted changes:** .specs/STATE.md (modified), .specs/features/market-insights-agents/{spec,design,validation}.md (untracked), docs/decisions/009-pipeline-agentes-insights-de-mercado.md (untracked), .opencode/skills/grill-with-docs/ (untracked)
