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
| AD-011 | Portal do diagnóstico renderizado por um único componente (`DiagnosticPortal`) com `mode: public \| manager`; as rotas mantêm só fetch, estados e ações do gerente | active | 2026-11-13 | As duas telas já compartilhavam DTO e componentes, mas duplicavam ~200 linhas de layout; unificar evita divergência visual e correção em dobro |
| AD-012 | DAMA-DMBOK2 (cap. 15) como base metodológica única; faixas de estágio sempre as do contrato (1.8 / 2.6 / 3.4 / 4.2) para todo segmento, com diferenciação setorial só pelos pesos da calibração | active | 2026-11-24 | Híbrido DMBOK + DCAM + "CMMI-like" e faixas por segmento contradiziam o score no portal; decisão detalhada no ADR-011 |
| AD-013 | O Arsenal Comercial é material interno do gerente: aparece só no PDF (download do admin e e-mail ao comercial); nunca no portal `/r`, em `portal-service` nem em rota pública | active | 2026-11-24 | Contém estratégia de venda e objeções prováveis; versão cliente do PDF e worker em outro container ficam fora de escopo (feature arsenal-comercial) |
| AD-014 | O Arsenal é gerado por uma etapa do worker depois do writer e persistido em `market_insights.arsenal` (jsonb); falha do agente comercial é isolada (log `arsenal_failed`, `arsenal = null`, PDF sai sem Arsenal, sem retry de job); o `GeneratePdfInput` nasce de um único `buildPdfInput` | active | 2026-11-24 | PDF é gerado em dois pontos (worker e download); persistir garante o mesmo conteúdo e evita LLM a cada "Exportar PDF"; o Arsenal é extra e não pode derrubar o relatório |

## Handoff

- **Feature**: arsenal-comercial (.specs/features/arsenal-comercial) — **T1–T27 e F1 concluídos; Verifier independente rodou em 2026-11-24: FAIL**
- **Phase / Task**: validação (iteração 1 de no máximo 3 do fix→re-verify)
- **Completed**: gates verdes (lint, typecheck, 884 testes passed / 5 skipped); 44/46 ACs Verified; sensor 22/24 mutantes mortos; `validation.md` escrito; lessons L-002..L-005 registradas
- **In-progress** (file:line): none
- **Next step**: rotear os fix tasks de `validation.md` (Ranked Gaps): (1) Major: teto do schema gera 5 páginas de Arsenal, spec diz 3 (ARS-27/ARS-37, `src/lib/report/arsenal-pages.ts`, `ARSENAL_LIMITS`), decisão do dono entre reduzir limites/layout ou emendar a spec; (2) teste do status composto do catálogo (M15, `catalog.ts:94`); (3) teste de pipeline com `bullets` vazio (M20, `analysis-service.ts:128`); depois re-dispatch do Verifier
- **Blockers**: decisão do dono sobre o gap 1; catálogo real de serviços e objeções ainda não enviado (seed em rascunho)
- **Uncommitted files**: none
- **Branch**: feat/arsenal-comercial (commits locais; sem push)
