# STATE.md — Project Memory

## Decisions

| ID | Decision | Status | Date | Rationale |
|----|----------|--------|------|-----------|
| AD-001 | Hybrid calibration config (JSON seed + Supabase runtime) | active | 2025-08-25 | Hotfix capability without redeploy; reproducible seed; graceful fallback if Supabase down |
| AD-002 | Weight normalization via largest-remainder (Hamilton) method | active | 2025-08-25 | Guarantees integer weights summing exactly to 100; avoids rounding drift |
| AD-003 | Module-level cache with 60s TTL for active calibration | active | 2025-08-25 | Avoids Supabase hit on every submission; acceptable staleness window |
| AD-004 | `computeContextualScores` wraps existing `computeScores` | active | 2025-08-25 | Preserves backward compatibility; new function is additive, not replacement |
| AD-005 | LLM/Exa providers configurados via env server-side (LLM_BASE_URL, LLM_API_KEY, LLM_MODEL, EXA_API_KEY); nunca em cliente | active | 2026-08-29 | Pipeline de agentes (ADR-009); credenciais nunca no bundle |
| AD-006 | Radar de aranha no PDF desenhado com SVG nativo do @react-pdf/renderer (sem lib extra); reprocessamento de análise via enfileiramento reutilizando analysis-service.enqueue | active | 2026-08-30 | Fatia 3 (ADR-009): radar + admin reprocessar |
| AD-007 | Reprocessamento admin aceita somente leads com diagnóstico E status analisado/falha/analise_pendente | active | 2026-08-30 | ADR-009 fallback/reprocessamento; evita reprocessar leads sem pipeline |
| AD-008 | Observabilidade do pipeline de relatórios: fila pgmq com read()+ack/archive (VT 600s) e log por etapa em analysis_job_logs | active | 2026-08-31 | Relatórios assíncronos invisíveis; fila com pop() perdia jobs; painel admin ganha Fila + Log |

## Handoff

- **Feature**: report-observability (.specs/features/report-observability) — **DONE**
- **Phase / Task**: Execute complete — 6 feature commits (T1-T8 agrupados) + Verifier PASS (13/13 ACs, 3/3 mutants), validation.md escrito + traceability OBS-01..13 → Verified
- **Completed**: T1-T8; baseline 0008 commitado como `6b9de6d`
- **Next step**: aplicar a migration `supabase/migrations/0009_report_observability.sql` no Supabase remoto (gate manual via supabase-mcp/psql) e rodar `validate_data_model.sql`; UAT opcional das seções Fila/Log no admin
- **Blockers**: none
- **Uncommitted files**: `validation.md` + `spec.md` traceability + `LESSONS.md`/`lessons.json` + `.specs/STATE.md` (a commitar pelo orquestrador)
- **Branch**: main
