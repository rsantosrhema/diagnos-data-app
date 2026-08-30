# Market Insights — Smoke E2E (real services)

**Date**: 2026-08-29
**Spec**: `.specs/features/market-insights-agents/spec.md`
**Status**: Draft

---

## Problem Statement

A fatia 1 (pipeline de agentes) foi validada com testes unitários e mocks. Falta provar o **fluxo real de ponta a ponta** em ambiente de produção (Supabase remoto + Resend + Exa + LLM reais): desde o submit do formulário de uma empresa de teste até o e-mail chegar ao time comercial e o `market_insights` ficar `analisado`.

## Goals

- [ ] Validar o pipeline completo com serviços reais: submit → PDF → e-mail (Resend) → worker → Exa/LLM → `market_insights.status = 'analisado'`
- [ ] Provar que o e-mail comercial real é enviado com anexo PDF
- [ ] Provar que o worker processa o job da fila e persiste a análise

## Out of Scope

| Feature | Reason |
| --- | --- |
| Testar chamadas HTTP via navegador (UI) | O fluxo é backend; testa-se os serviços/rotas diretamente |
| Rodar em Supabase local (Docker) | Foco é o ambiente real já configurado |
| Testar fatia 2/3 (bullets no PDF, radar) | Não implementadas ainda |

## Smoke Test

O teste roda em `src/lib/service/e2e-flow.smoke.test.ts` (opcional, ver Tasks) e:

1. Lê `.env.local` (dotenv) para `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `INTERNAL_API_KEY`, `MANAGER_NOTIFICATION_EMAIL`, `RESEND_*`, `LLM_*`, `EXA_API_KEY`.
2. Cria um lead de teste único (uuid em `email`/nome).
3. Gera token, valida, cria sessão.
4. Submete o screener com respostas completas (10 dimensões, profile Indústria/51-200/R$ 5-50M).
5. Dispara o worker `/api/analysis-worker` com `x-internal-api-key`.
6. Consulta `market_insights` por `lead_id`; aguarda status `analisado` (polling com timeout).
7. Asserta que `research.sources` tem URLs, `analysis.dores` não vazio, `insights.bullets` ≥ 1.

O e-mail real do Resend é **disparado pelo `submitScreener`**; o teste não precisa esperá-lo (o Resend entrega assíncrono), mas pode consultar o painel/logs.

## Resultado esperado

- `submitScreener` retorna `{ ok: true }`
- `lead.status = 'concluido'`
- e-mail comercial recebido com PDF (`Diagnóstico de Maturidade — <nome>`)
- `market_insights.status = 'analisado'` (após worker), com research/analysis/insights preenchidos
- worker retorna `{ ok: true, processed: ≥1 }`

## Acceptance Criteria

1. WHEN o smoke test executa com as envs reais THEN o `submitScreener` SHALL retornar `{ ok: true }`.
2. WHEN o submit termina THEN o e-mail comercial SHALL ser enviado via Resend com anexo PDF.
3. WHEN o worker roda THEN o `market_insights` do lead SHALL ficar `status='analisado'` com `research`, `analysis` e `insights` não vazios.
4. IF o pipeline falhar (Exa/LLM/email) THEN o teste SHALL reportar o erro de forma legível e falhar (sem mascarar).
