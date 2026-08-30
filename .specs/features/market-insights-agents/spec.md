# Market Insights Agents — Slice 1 Specification

## Problem Statement

Após o score determinístico do diagnóstico de maturidade de dados (ADR-008), o time comercial recebe hoje um relatório puramente técnico. Para preparar a reunião com o lead, ele precisa de contexto de mercado: se a dor apontada no formulário também é dor do segmento, porte e faixa de faturamento daquela empresa, e quais problemas de dados são mais eminentes para esse perfil. Esta fatia implementa a primeira etapa do pipeline de agentes (ADR-009): pesquisa de mercado via Exa (pesquisador), correlação com os scores via LLM (analista) e persistência em `market_insights`. As fatias 2 (bullets priorizados + fallback) e 3 (radar no PDF + admin reprocessar) ficam fora deste escopo.

## Goals

- [ ] Após cada submit do formulário, enfileirar a análise na fila assíncrona sem bloquear a resposta do visitante
- [ ] Executar 3 agentes em orquestrador único que pesquisa no Exa, correlaciona com os scores via LLM e formata um brief de insights
- [ ] Persistir o resultado completo da análise em `market_insights` com status rastreável

## Out of Scope

| Feature | Reason |
| --- | --- |
| Bullets priorizados (Alta/Média/Baixa) com coloração no PDF | Fatia 2 (próxima) |
| Fallback com PDF básico quando o pipeline falhar | Fatia 2 |
| Radar de aranha no PDF | Fatia 3 |
| Admin reprocessar análise | Fatia 3 |
| Alteração do fluxo de e-mail / segundo PDF ao comercial | Fatia 2 |
| Skills markdown por segmento curadas em repositório | Fatia 2 (analista nesta fatia usa skill de segmento parametrizada) |
| Upload/edição de skills pelo admin | Fora do escopo do produto |
| Integração com CrewAI / plataforma externa de agentes | Decidido ADR-009: orquestração nativa TS |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --- | --- | --- | --- |
| Filas assíncronas | Supabase Queue (`supabase_queue` com worker HTTP protegido por INTERNAL_API_KEY) | Next é stateless em serverless; fila dá retry e evita perda. ADR-009 decidiu Supabase Queue. | y |
| Disparo | Assíncrono: submit responde `{ok:true}` imediato; worker processa em background | ADR-009. Visitante não espera pela análise. | y |
| Nome da empresa | Reusar `leads.company` (coletado no fluxo legado) ou `submission.company.name` (fluxo novo) | ADR-009: usar o nome do lead do cadastro. Precedência: body `company.name` > `leads.company` > null. | y |
| Exa | Chave `EXA_API_KEY` no `.env`; chamada direta via SDK `exa-js` | ADR-009. MCP é tool-calling interativo, não para prod server-side. | y |
| LLM | API Command Code / OllamaCloud via OpenAI-compat client | ADR-009 decidiu via API do Command Code ou OllamaCloud. Implementar com `@ai-sdk/openai` apontando para baseURL configurável. | y |
| Skills por segmento | 5 arquivos Markdown (indústria, varejo, serviços, saúde, finanças) + fallback genérico | ADR-009: híbrido. Segmento do contrato mapeia via `segmento → arquivo`; sem arquivo → fallback. | y |
| Idioma | Pesquisas Exa em pt + en; análise e respostas LLM em PT-BR | ADR-009. | y |
| Persistência | Nova tabela `market_insights` (jsonb), 1:1 com `diagnostics`/`leads` | ADR-009: payload dos 3 agentes + status + fontes. | y |
| `profile` ausente | Tratar como objeto vazio (`{}`) com defaults | Formulário pode enviar `profile` vazio; `buildAgentPayload` já trata `profile ?? {}`. | y |
| `commercialAnswer` vazio | Aceitar string vazia (schema atual já faz `.default("")`) | Não é usado nesta fatia; analista recebe o campo como contexto opcional. | y |
| Worker em serverless | Endpoint `/api/analysis-worker` roda como rota Next.js protegida por INTERNAL_API_KEY | Supabase Queue worker puxa jobs e executa in-place. Para prod, decidir (assumption) deploy com `maxDuration` suficiente. | y |
| Biblioteca LLM | `@ai-sdk/openai` (Vercel AI SDK) apontando para baseURL configurável (Command Code / OllamaCloud) | Decidido no grill; é o padrão do ecossistema e simplifica tool-calling e streaming. | y |
| Análise quando o lead não tem diagnóstico | Não analisar; a fila só recebe `lead_id` de leads com diagnóstico persistido | Evita orquestrar análise sem scores. | y |
| Reprocessamento | Fora do escopo (fatia 3); nesta fatia o worker grava status `falha` e relança na fila com backoff | ADR-009 fallback. | y |

**Open questions:** none — both items above (worker em serverless e reprocessamento) foram resolvidos por assumption na tabela; a primeira marca `Confirmed = n` para validar antes de produção.

---

## User Stories

### P1: Enfileirar análise após o submit ⭐ MVP

**User Story**: Como sistema de backend, quero enfileirar a análise de cada diagnóstico assim que o score for persistido, para que o pipeline de agentes rode em background sem fazer o visitante esperar.

**Why P1**: É o disparo do pipeline inteiro. Sem ele, nada roda.

**Acceptance Criteria**:

1. WHEN `screenService.submitScreener` concluir a persistência do diagnóstico THEN o sistema SHALL enfileirar um job na fila `analysis_jobs` com o `lead_id` do diagnóstico recém-criado.
2. The system SHALL responder ao visitante com `{ ok: true }` imediatamente após o enfileiramento, sem aguardar a análise dos agentes.
3. IF o enfileiramento falhar (fila indisponível) THEN o sistema SHALL logar o erro e continuar retornando sucesso ao visitante, sem lançar erro para o cliente.
4. The system SHALL aceitar múltiplos jobs por lead na fila (dedup controlado pelo worker).

**Independent Test**: Ao chamar `submitScreener` com mocks, verificar que o job foi enfileirado com `lead_id` correto e que a resposta é `{ ok: true }` mesmo quando o enfileiramento falha.

---

### P2: Pesquisar mercado via Exa

**User Story**: Como analista comercial, quero que o sistema pesquise no Exa problemas de dados do segmento, porte e faturamento da empresa do lead, para que eu tenha evidências de mercado para a reunião.

**Why P2**: Sem as evidências, o analista correlaciona no escuro.

**Acceptance Criteria**:

1. WHEN o worker processa um job THEN o sistema SHALL montar 4 queries do Exa (segmento, faturamento, porte de funcionários, concorrentes quando houver nome da empresa) com base no `agent_payload`.
2. WHEN as 4 queries do Exa terminam THEN o sistema SHALL consolidar os resultados em um payload `MarketResearch` contendo as seções por query e a lista de sources (URLs).
3. WHEN uma query do Exa falhar (timeout/erro da API) THEN o sistema SHALL registrar a seção como vazia com status de erro, sem abortar o pipeline inteiro.
4. WHEN o segmento do lead for um dos 5 segmentos com skill THEN o sistema SHALL carregar a skill de segmento correspondente para passar ao analista.

**Independent Test**: Mock do Exa; verificar que `MarketResearch` é montado com as 4 seções e que uma falha isolada não aborta.

---

### P3: Correlacionar scores com o mercado via LLM (analista)

**User Story**: Como time comercial, quero que o sistema correlacione os scores do formulário com as evidências de mercado e produza uma análise criteriosa da dor, para que eu entenda a profundidade do problema do lead.

**Why P3**: É o coração analítico do pipeline (ADR-009).

**Acceptance Criteria**:

1. WHEN o `MarketResearch` está disponível THEN o sistema SHALL enviar ao LLM um prompt do analista com os scores (por dimensão, peso, faixa e risco) e as evidências de mercado.
2. WHEN o prompt é enviado THEN o sistema SHALL usar a skill de segmento (arquivo Markdown ou fallback genérico) como parte do contexto do prompt.
3. IF o LLM devolver JSON inválido THEN o sistema SHALL retornar um erro tipado `AnalystError` (sem lançar crash do worker).
4. The system SHALL validar a saída do analista com schema Zod estrito antes de persistir.

**Independent Test**: Mock do LLM; verificar que o prompt contém scores + skill, e que JSON inválido vira `AnalystError`.

---

### P4: Formatar brief de insights (writer)

**User Story**: Como time comercial, quero um brief de insights em linguagem clara e humana (até 10 bullets), para que eu tenha material objetivo para a reunião com o lead.

**Why P4**: É a saída utilizável pelo closer (não-técnico).

**Acceptance Criteria**:

1. WHEN a análise do analista está disponível THEN o sistema SHALL formatar via LLM um brief com até 10 bullets em PT-BR.
2. The system SHALL classificar cada bullet com uma prioridade (alta/média/baixa) baseada em dor da empresa + dor de mercado.
3. IF o LLM devolver mais de 10 bullets THEN o sistema SHALL truncar para 10 mantendo a ordem de prioridade.

**Independent Test**: Mock do LLM; verificar que o brief tem no máximo 10 bullets e cada um tem prioridade.

---

### P5: Persistir análise em `market_insights` ⭐ MVP

**User Story**: Como sistema, quero persistir o resultado completo da análise (research, analysis, insights + fontes) em `market_insights` com status, para auditoria e reprocessamento.

**Why P5**: É o contrato de dados do pipeline (ADR-009) e habilita reprocessamento.

**Acceptance Criteria**:

1. WHEN o worker concluir a análise THEN o sistema SHALL persistir o payload completo (research, analysis, insights, sources) em `market_insights` na linha do `lead_id`.
2. WHEN a persistência ocorre THEN o sistema SHALL marcar o `status` como `analisado`.
3. IF o pipeline falhar THEN o sistema SHALL marcar o `status` como `falha` e registrar o erro.
4. IF já existir uma análise para o `lead_id` THEN o sistema SHALL atualizar a linha existente (upsert por `lead_id`).

**Independent Test**: Mock do repo; verificar upsert por `lead_id`, status `analisado`/`falha` e campos persistidos.

---

## Edge Cases

- IF `profile` vazio THEN o sistema SHALL usar objeto vazio e seguir com o pipeline (P1).
- IF `company` ausente THEN o sistema SHALL montar as queries de concorrentes com nome null (omitir seção concorrentes).
- IF o Exa devolver zero resultados THEN o sistema SHALL seguir com seções vazias (analista trata ausência de evidência).
- IF o Exa devolver erro em uma query THEN o sistema SHALL marcar a seção como erro e seguir (P2-3).
- IF o LLM exceder o contexto THEN o sistema SHALL retornar erro tipado e o worker marca `falha`.
- IF o worker receber job duplicado (mesmo `lead_id` já processado) THEN o sistema SHALL re-processar e upsertar (P5-4), sem duplicar linha.
- IF a tabela `market_insights` não existir (migration não aplicada) THEN o worker deverá marcar `falha` (o pipeline não deve assumir schema inexistente).

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| --- | --- | --- | --- |
| INS-01 | P1: Enfileirar análise após o submit | Design | Pending |
| INS-02 | P1: Resposta imediata ao visitante | Design | Pending |
| INS-03 | P1: Falha de enfileiramento não quebra resposta | Design | Pending |
| INS-04 | P1: Múltiplos jobs por lead | Design | Pending |
| INS-05 | P2: Montar 4 queries Exa | Design | Pending |
| INS-06 | P2: Consolidar `MarketResearch` | Design | Pending |
| INS-07 | P2: Falha de query não aborta | Design | Pending |
| INS-08 | P2: Carregar skill de segmento | Design | Pending |
| INS-09 | P3: Enviar prompt com scores + evidências | Design | Pending |
| INS-10 | P3: Usar skill de segmento no prompt | Design | Pending |
| INS-11 | P3: JSON inválido → `AnalystError` | Design | Pending |
| INS-12 | P3: Validar saída com Zod estrito | Design | Pending |
| INS-13 | P4: Brief com até 10 bullets em PT-BR | Design | Pending |
| INS-14 | P4: Prioridade por bullet | Design | Pending |
| INS-15 | P4: Truncar para 10 | Design | Pending |
| INS-16 | P5: Persistir payload em `market_insights` | Design | Pending |
| INS-17 | P5: Status `analisado` ao persistir | Design | Pending |
| INS-18 | P5: Status `falha` ao falhar | Design | Pending |
| INS-19 | P5: Upsert por `lead_id` | Design | Pending |

**Coverage:** 19 total, 0 mapped to tasks, 19 unmapped

---

## Success Criteria

- [ ] Um submit de diagnóstico gera, em background, um job processado com `market_insights` preenchido (status `analisado`) sem o visitante esperar
- [ ] O payload persistido contém research (4 seções + fontes), analysis e insights (até 10 bullets com prioridade)
- [ ] Nenhuma falha de Exa/LLM derruba o submit nem o worker (fallback = status `falha`)
