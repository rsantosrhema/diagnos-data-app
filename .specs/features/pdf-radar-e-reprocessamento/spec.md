# PDF Radar de Aranha + Admin Reprocessar — Fatia 3 Specification

## Problem Statement

As fatias 1 (pipeline de agentes) e 2 (PDF com análise + bullets priorizados) já entregam ao comercial um relatório enriquecido, e o fallback marca o lead como `analise_pendente` quando o pipeline falha. A Fatia 3 fecha o ADR-009: (a) o PDF ganha o **radar de aranha** (10 eixos DAMA-DMBOK) prometido no ADR-009 §PDF final, desenhado com SVG manual no `@react-pdf/renderer`; e (b) o time comercial passa a poder **reprocessar** uma análise pelo admin (via enfileiramento), cobrindo o fallback (`analise_pendente`/`falha`) e a regeração de análises já concluídas.

## Goals

- [ ] O PDF gerado conter o radar de aranha (10 eixos, um por dimensão, com polígono dos níveis 1–5) desenhado via SVG no `@react-pdf/renderer`, sem lib extra
- [ ] O admin poder reprocessar a análise de um lead via endpoint (enfileira e responde imediatamente), para leads com diagnóstico já analisado ou pendente de análise

## Out of Scope

| Feature | Reason |
| --- | --- |
| Alterar o fluxo de e-mail / timing do PDF | Entregue na Fatia 2 |
| Reprocessamento agendado automático (retry com backoff) | O fallback atual é manual via admin; retry automático é ops follow-up |
| UI dedicada no admin além da ação de reprocessar | A página já existe; adicionar apenas o botão + integração |
| Mostrar o radar ao visitante no front | O PDF e o e-mail são internos ao comercial |
| Alteração do contrato de dimensões / pesos | O radar usa o contrato atual (`SCREENER_CONTRACT`) |
| Persistir nova coluna/tabela | Não há mudança de schema: reusa `leads.status`, `market_insights` e a fila existente |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --- | --- | --- | --- |
| Endpoint de reprocessar | Síncrono: valida o lead + chama `analysisService.enqueue(leadId)` e responde `{ ok: true }` imediatamente | ADR-009: submit não espera a análise; o worker processa em background. Escolha do usuário (grill) | y |
| Leads aceitos para reprocessar | Somente leads com diagnóstico existente E status `analisado`/`falha`/`analise_pendente`; demais → 400 | ADR-009 §Fallback/reprocessamento: re-dispara para lead analisado ou com análise pendente. Lead sem diagnóstico não tem o que reprocessar | y |
| Estrutura do radar | Componente `<RadarChart>` puro (SVG via `createElement`), exportado e testado via `buildReportChildren`, como as demais seções | Segue o padrão atual do gerador (h=createElement) e permite assert via children. Escolha do usuário (grill) | y |
| Fonte dos 10 eixos/labels | `SCREENER_CONTRACT.dimensoes` (ordem do contrato) via `getDimensionById`; `dimensionScores` no input trazem os níveis | Uma única fonte de verdade do contrato; o input já carrega `{name, nivel, peso}` | y |
| Níveis no radar | Eixos de 1 a 5 (grid de 5 anéis) | Escala do formulário (CMMI-like, 1–5) | y |
| Clamp de nível fora de 1–5 | Nível < 1 → 1; nível > 5 → 5 | `GeneratePdfInput.dimensionScores` já é tipado `number`; clampa para não estourar o polígono | y |
| `dimensionScores` sem os 10 itens | Renderiza o radar com os itens presentes | Contrato tem 10 dimensões fixas; o input é construído a partir delas (buildPdfInput) | y |
| Erro em dimensão sem label | Eixo sem label não é desenhado; polígono usa apenas eixos com valor | Defensivo contra contratos parciais | y |
| E-mail após reprocessar | O enfileiramento apenas enfileira; o e-mail sai no worker quando a análise (re)concluir | Mesma semântica da Fatia 2 (worker envia o e-mail) | y |
| Endpoint de reprocessar retorna erro de validação | `{ error: "..." }` com 400/404 | Padrão dos demais endpoints admin (schemas `.strict()`, mensagens genéricas) | y |

**Open questions:** none — todos resolvidos por decisão na tabela.

---

## User Stories

### P1: Radar de aranha (10 eixos DAMA-DMBOK) no PDF ⭐ MVP

**User Story**: Como time comercial, quero ver no PDF um radar de aranha com os 10 eixos DAMA-DMBOK e o polígono dos níveis, para ler de forma visual as valências/deficiências por dimensão.

**Why P1**: É um entregável explícito do ADR-009 §PDF final; dá leitura visual imediata ao closer.

**Acceptance Criteria**:

1. WHEN `buildReportChildren` recebe `GeneratePdfInput` com `dimensionScores` THEN o sistema SHALL incluir uma seção "Radar de Maturidade" contendo um `<Svg>` do `@react-pdf/renderer`.
2. WHEN a seção Radar é renderizada THEN o sistema SHALL desenhar um grid de 5 anéis (níveis 1–5) com eixos para cada dimensão de `dimensionScores`.
3. WHEN a seção Radar é renderizada THEN o sistema SHALL desenhar o polígono do nível de cada dimensão (coordenadas angulares interpoladas entre 1 e 5).
4. WHEN uma dimensão tiver `nivel` fora do intervalo 1–5 THEN o sistema SHALL aplicar clamp (min 1, max 5) antes de calcular a coordenada.
5. WHEN a seção Radar é renderizada THEN o sistema SHALL desenhar os labels das dimensões junto aos eixos.
6. The system SHALL NÃO adicionar dependência externa (lib) para o radar.

**Independent Test**: Chamar `buildReportChildren` com `dimensionScores` variados e assertar presença da seção Radar, de N anéis, de N eixos e dos labels; `generateScreenerPdf` gera buffer.

---

### P2: Admin reprocessar análise (enfileira e responde imediatamente) ⭐ MVP

**User Story**: Como time comercial (admin), quero reprocessar a análise de um lead com status `analise_pendente`/`falha` (ou já analisado, para regenerar), para que um pipeline que falhou seja recuperado sem deploy.

**Why P2**: É o fechamento do fallback do ADR-009; sem ele, análises falhas ficam retidas.

**Acceptance Criteria**:

1. WHEN o admin chama `POST /api/admin-proxy/analysis/reprocess` com um `leadId` válido de um lead que possui diagnóstico E status `analisado`/`falha`/`analise_pendente` THEN o sistema SHALL enfileirar o job via `analysisService.enqueue(leadId)` e SHALL responder `{ ok: true }` com status 200.
2. WHEN o `leadId` não existir ou o lead não tiver diagnóstico THEN o sistema SHALL responder `{ error: "Lead não encontrado ou sem diagnóstico" }` com status 400.
3. WHEN o lead existir com diagnóstico mas sem status elegível (ex.: `pendente`/`token_gerado`) THEN o sistema SHALL responder `{ error: "Lead sem análise reprocessável" }` com status 400.
4. WHEN o enfileiramento falhar (fila indisponível) THEN o sistema SHALL responder `{ error: "Erro interno" }` com status 500 (o admin vê a falha para tentar de novo).
5. The system SHALL exigir autenticação de gerente (Bearer + `INTERNAL_API_KEY`) antes de qualquer operação.
6. The system SHALL validar o body com schema Zod `.strict()` (rejeitando campos desconhecidos).

**Independent Test**: Testes de rota (auth 401, body inválido 400, sem diagnóstico 400, status inelegível 400, sucesso 200 com `{ ok: true }`); teste de serviço confirma que enfileira.

---

## Edge Cases

- IF `dimensionScores` estiver vazio THEN o sistema SHALL renderizar o radar sem polígono (grid + labels omitidos).
- IF uma dimensão tiver `nivel` 0 ou 6 THEN o sistema SHALL clamp para 1/5 (coordenadas dentro do grid).
- IF o `leadId` for `uuid` malformado THEN o sistema SHALL responder 400 (schema).
- IF `leads.status` não existir na lista elegível THEN o sistema SHALL responder 400 (não enfileira).
- IF o admin enviar campos extras no body THEN o sistema SHALL rejeitar com 400 (`.strict()`).
- IF o worker reprocessar um lead já `analisado` THEN o sistema SHALL upsertar `market_insights` e reenviar o e-mail (fluxo existente da Fatia 2).

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| --- | --- | --- | --- |
| RADAR-01 | P1: Seção "Radar de Maturidade" com `<Svg>` no PDF | Design | ✅ Verified |
| RADAR-02 | P1: Grid de 5 anéis (níveis 1–5) | Design | ✅ Verified |
| RADAR-03 | P1: Polígono do nível por dimensão | Design | ✅ Verified |
| RADAR-04 | P1: Clamp de nível fora de 1–5 | Design | ✅ Verified |
| RADAR-05 | P1: Labels das dimensões nos eixos | Design | ✅ Verified |
| RADAR-06 | P1: Sem dependência externa (lib) | Design | ✅ Verified |
| REPRO-01 | P2: Enfileira e responde `{ ok: true }` para lead elegível | Design | ✅ Verified |
| REPRO-02 | P2: 400 quando lead sem diagnóstico | Design | ✅ Verified |
| REPRO-03 | P2: 400 quando status inelegível | Design | ✅ Verified |
| REPRO-04 | P2: 500 quando enfileiramento falha | Design | ✅ Verified |
| REPRO-05 | P2: Auth de gerente + `INTERNAL_API_KEY` em toda rota | Design | ✅ Verified |
| REPRO-06 | P2: Schema `.strict()` no body | Design | ✅ Verified |

**Coverage:** 12 total, 12 mapped to tasks, 0 unmapped

---

## Success Criteria

- [x] O PDF de um lead analisado contém o radar de aranha (10 eixos, grid 1–5, polígono dos níveis, labels), sem dependência extra
- [x] Um admin consegue reprocessar a análise de um lead com status `analise_pendente`/`falha`/`analisado` via endpoint, e o worker a regenera em background
- [x] Leads sem diagnóstico ou com status não-elegível são rejeitados com 400; enfileiramento falho retorna 500 para o admin
