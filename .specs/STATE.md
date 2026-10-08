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

| AD-009 | Relatório sob demanda (sem cron): endpoint de reprocess enfileira e dispara fire-and-forget `POST /api/analysis-worker` com `x-internal-api-key`; resposta imediata `{ok,queued}`; sem depender de agendador externo | active | 2026-08-31 | Cron Hobby da Vercel bloqueado/removido; pipeline dos agentes (~50s) roda em background no clique do gerente |
| AD-010 | Links públicos compartilháveis usam token opaco 256-bit com somente hash SHA-256 persistido, TTL 90 dias, um ativo por lead (novo invalida anterior), comparação com timingSafeEqual e 404 genérico idêntico para inválido/expirado/revogado | active | 2026-10-08 | Portal-analise: link do cliente /r/[token]; não distinguir motivo evita enumeração; revogação é delete lógico |

## Handoff

- **Feature**: portal-analise (.specs/features/portal-analise) — **DONE**
- **Phase / Task**: Execute complete — T1–T18 commitados (c286ae3..41ee30e) + Fix 1 PORTAL-09 (middleware.test.ts) + Verifier PASS (14/14 ACs com evidência, sensor 4/4 mutants killed), validation.md atualizado para PASS
- **Completed**: migration 0016 share_tokens, share-token-repo, schemas de agentes enriquecidos (aditivos), portal service/DTO, rotas admin/public + proxies + rate-limit, componentes UI (StageHero, RadarSpider, MaturityBars, AnswersAccordion, CompetitorsGrid, InsightsBoard, SourcesList, AnalysisPlaceholder), páginas /admin/leads/[leadId] e /r/[token], suite 459 testes
- **Next step**: aplicar migration 0016 no Supabase (share_tokens) e fazer deploy (Coolify importa do git após push); botão Ver resultado + Copiar link já na tabela admin
- **Blockers**: migration 0016 deve rodar antes do primeiro uso do "Copiar link" (tabela nova); campos novos dos agentes só aparecem em análises geradas após o deploy (back-fill não exigido)
- **Uncommitted files**: none (fix + specs commitados juntos)
- **Branch**: main
