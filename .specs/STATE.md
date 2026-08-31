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
| AD-009 | Relatório sob demanda (sem cron): endpoint de reprocess enfileira e dispara fire-and-forget `POST /api/analysis-worker` com `x-internal-api-key`; resposta imediata `{ok,queued}`; sem depender de agendador externo | active | 2026-08-31 | Cron Hobby da Vercel bloqueado/removido; pipeline dos agentes (~50s) roda em background no clique do gerente |

## Handoff

- **Feature**: relatorio-sob-demanda (.specs/features/relatorio-sob-demanda) — **DONE**
- **Phase / Task**: Execute complete — T1 commitado como `ab204e2` + Verifier PASS (5/7 ACs com asserção no diff, 3/3 mutants killed), validation.md escrito + traceability REL-01..07 → Verified
- **Completed**: T1 (fire-and-forget no reprocess + 11 testes co-locados); AD-009 registrado
- **Next step**: aplicar o código no ambiente Vercel (redeploy via API — autorização pendente); DNS do subdomínio `diagnosdata.rhemadata.com` na Hostinger (bloqueio externo); opcional: rodar a suite completa em CI
- **Blockers**: none
- **Uncommitted files**: `validation.md` + `tasks.md` status + `.specs/STATE.md` (a commitar pelo orquestrador)
- **Branch**: main
