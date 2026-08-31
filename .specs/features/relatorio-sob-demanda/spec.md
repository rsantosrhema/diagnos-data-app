# Relatório Sob Demanda (On-Demand Report) Specification

## Problem Statement

O pipeline de relatórios (agentes de mercado + PDF + e-mail) é processado por um **worker assíncrono** drenado por um **cron** (Vercel ou pg_cron). No deploy atual da Vercel (plano Hobby) não há cron ativo: o job fica preso na fila pgmq e o gerente, ao clicar "Gerar relatório", nunca recebe o relatório. O gatilho de processamento precisa deixar de depender de agendamento externo e passar a ser **imediato e por demanda**: o clique do gerente dispara os agentes na hora.

## Goals

- [ ] Ao clicar "Gerar relatório", os agentes (researcher → analyst → writer → PDF → email) começam a rodar **imediatamente**, sem cron.
- [ ] A resposta HTTP ao admin volta rápido (não bloqueia ~50s dos agentes), mantendo o estado "processando" visível no dashboard.
- [ ] O pipeline continua resiliente: retry, dedup e estado por job preservados (nada do ADR-008 é regredido).

## Out of Scope

| Feature | Reason |
| ------- | ------ |
| Remover a fila pgmq / RPCs existentes | A fila é a trilha de estado, dedup e retry (ADR-008). Mantida. |
| Cron Vercel ou pg_cron | O propósito desta feature é **eliminar** a dependência de agendador. |
| Front-end do admin (toasts, polling UI) | Já existe auto-refresh; nenhuma mudança de UI é necessária. |
| Plano Pro / upgrade Vercel | Fora do escopo; a solução deve funcionar no Hobby. |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --------------------- | -------------- | --------- | ---------- |
| Disparo imediato = fire-and-forget | O endpoint de reprocess enfileira e dispara `POST /api/analysis-worker` em background (fetch não-await), retornando `{ok, queued}` na hora | Evita timeout Hobby (~10s/300s); agentes levam ~50s | y |
| Destino do fire-and-forget | Mesmo host da requisição (`NEXT_PUBLIC_APP_URL` em prod / origin em dev), rota `/api/analysis-worker`, header `x-internal-api-key` | Reusa a rota já testada; evita loop infinito (a rota drena a fila, não re-enfileira) | y |
| Fallback síncrono | Se o fetch do worker falhar (rede/erro), o endpoint ainda retorna sucesso; o job fica na fila para retry manual/worker | Não falha o clique por problema de background | y |
| Autenticação | O fire-and-forget usa a INTERNAL_API_KEY (server-side); nenhuma credencial exposta ao cliente | Consistente com ADR-007 proxy | y |
| Timeout do fetch | 0 (sem timeout) — o worker roda até o fim e responde 200 | O admin não espera; o fetch é desconectado | y |
| `NEXT_PUBLIC_APP_URL` apontando para o domínio custom | Em prod a URL base vem de `NEXT_PUBLIC_APP_URL` (já = `https://diagnosdata.rhemadata.com`) | Base da rota worker em produção | y |

**Open questions:** none - all resolved or logged above (required before the spec is confirmed).

---

## User Stories

### P1: Disparo imediato ao clicar "Gerar relatório" ⭐ MVP

**User Story**: As a gerente comercial, I want o relatório começar a ser gerado na hora em que eu clico, para não depender de cron.

**Why P1**: É o coração da feature — sem isso o pipeline continua travado.

**Acceptance Criteria**:

1. WHEN o gerente chama `POST /api/admin/analysis/reprocess` com um `leadId` válido e enfileirável THEN o endpoint SHALL enfileirar o job E disparar em background `POST /api/analysis-worker` com a `INTERNAL_API_KEY` (REL-01).
2. WHEN o disparo em background é bem-sucedido THEN o endpoint SHALL responder `200` com `{ ok: true, queued: true }` imediatamente (REL-02).
3. WHILE o job está `pendente` ou `processando` o dashboard SHALL continuar mostrando o status e o auto-refresh existente SHALL refletir o progresso (REL-03).
4. The endpoint SHALL reutilizar o `analysis-service.processNext()` existente para o pipeline (sem duplicar a lógica dos agentes) (REL-04).

**Independent Test**: Clicar "Gerar relatório" → ver `analysis_job_logs` ganhar eventos `started`/`researcher`/`analyst`/`writer`/`pdf`/`email`/`completed` em segundos, sem cron.

### P1: Resposta imediata sem depender do fim dos agentes

**User Story**: As a gerente, I want o clique retornar rápido mesmo com os agentes levando ~50s.

**Why P1**: Timeout Hobby; não bloquear a UI.

**Acceptance Criteria**:

1. WHEN o endpoint dispara o worker em background THEN ele SHALL NÃO aguardar a conclusão do pipeline para responder (REL-05).
2. IF o disparo em background falha (ex.: rede) THEN o endpoint SHALL ainda responder `200 { ok: true, queued: true }` (o job fica na fila para retry) (REL-06).
3. IF o lead já está `pendente`/`processando` THEN o endpoint SHALL responder `409 { error: "Relatório já está na fila ou em processamento" }` (dedup, REL-07).

**Independent Test**: Clicar em um lead; a resposta chega em <1s; o log continua aparecendo nos segundos seguintes.

---

## Edge Cases

- IF o `leadId` não existe ou não tem diagnóstico THEN o endpoint SHALL responder `400` (comportamento atual preservado).
- IF `INTERNAL_API_KEY` não está configurada no ambiente THEN o fire-and-forget SHALL ser pulado (o job permanece na fila) sem quebrar a resposta.
- IF o worker já está processando o mesmo lead (dedup) THEN o fire-and-forget SHALL não causar processamento duplicado (o `analysis_queue_enqueue` já deduplica; `processNext` não re-lê job em VT).

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| -------------- | ----- | ----- | ------ |
| REL-01 | P1: Disparo imediato | Design | Verified |
| REL-02 | P1: Disparo imediato | Design | Verified |
| REL-03 | P1: Disparo imediato | Design | Verified |
| REL-04 | P1: Disparo imediato | Design | Verified |
| REL-05 | P1: Resposta imediata | Design | Verified |
| REL-06 | P1: Resposta imediata | Design | Verified |
| REL-07 | P1: Resposta imediata | Design | Verified |

**ID format:** `REL-[NUMBER]`

**Status values:** Pending → In Design → In Tasks → Implementing → Verified

**Coverage:** 7 total, 7 mapped to tasks, 0 unmapped ✅

---

## Success Criteria

- [ ] Gerente clica "Gerar relatório" → resposta `{ ok: true }` em <1s.
- [ ] `analysis_job_logs` mostra o pipeline completo (started→researcher→analyst→writer→pdf→email→completed) em menos de ~60s após o clique, sem cron ativo.
- [ ] `market_insights.status` transita para `analisado` e o e-mail com PDF chega ao gerente.
- [ ] Dedup preservado: cliques repetidos no mesmo lead enquanto processa retornam 409.
