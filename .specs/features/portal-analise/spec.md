# Portal Resultado da Análise Specification

## Problem Statement

O time comercial hoje só recebe o resultado da pesquisa dos agentes como PDF anexado por email. Não existe uma visão interativa, navegável e compartilhável do diagnóstico por cliente. O gerente precisa de um portal por pesquisa com dashboard visual (radar, barras CMMI, estágio, respostas, concorrentes, insights) e de um link compartilhável com o cliente.

## Goals

- [ ] Gerente abre o portal do lead em menos de 2 segundos com hero, radar, barras e respostas.
- [ ] Análise parcial nunca bloqueia os scores: estados pendente, processando e falha mostram placeholder sem esconder o diagnóstico.
- [ ] Link cliente `/r/[token]` válido por 90 dias, revogável, sem PII sensível.
- [ ] Schemas dos agentes evoluídos de forma aditiva: worker, PDF e fila continuam passando sem migração de dados.

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
| ------- | ------ |
| Edição de insights no portal | Conteúdo dos agentes é somente leitura na v1; edição seria outro fluxo com auditoria |
| Benchmark agregado entre leads | Requer agregação e privacidade entre clientes; feature separada |
| Internacionalização (i18n) | Produto opera em pt-BR na v1 |
| Exportar PDF dentro do portal | PDF continua gerado pelo fluxo atual; export no portal fica para v1.1 |
| Modo offline ou PWA | Portal é online e autenticado por token ou sessão de gerente |

---

## Assumptions & Open Questions

Every ambiguity is resolved or recorded here - nothing is left silently unclear.

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --------------------- | -------------- | --------- | ---------- |
| Acesso ao portal | Rota gerente `/admin/leads/[leadId]` mais rota pública `/r/[token]` | Gerente precisa visão completa interna e link compartilhável com cliente | y |
| Destino do PDF e email atuais | Portal é aditivo; `POST reprocess`, PDF e email continuam inalterados | Evita regressão no fluxo comercial já funcionando | y |
| Estado sem análise pronta | Mostra parcial: scores, radar e respostas sempre; análise com placeholder | Diagnóstico determinístico já existe em `diagnostics`; análise é assíncrona | y |
| Escopo visual da v1 | Todas as 6 seções na v1: hero, radar, barras, respostas, concorrentes, insights | Decisão explícita do solicitante na fase de Specify | y |
| TTL do link cliente | 90 dias, revogável, um token ativo por lead; novo token invalida o anterior | Equilíbrio entre praticidade comercial e exposição; invalidação limita vazamento | y |
| PII na visão pública | Nome e empresa visíveis; email e telefone ocultos | Suficiente para personalizar sem expor contato | y |
| Biblioteca de gráficos | SVG próprio portado de `radar-chart.ts`, sem nova dependência | Evita peso de lib e mantém paridade visual com o PDF | y |
| Compatibilidade de dados antigos | Campos novos dos agentes são opcionais; portal renderiza fallback textual quando ausentes | Leads já analisados não passam por backfill | y |
| Rate limiting do token público | `GET /api/portal/[token]` com throttle no `middleware.ts` | Token opaco é segredo de baixa entropia percebida; throttle mitiga força bruta | y |
| Resposta para token inválido | 404 genérico sem distinguir inexistente, expirado ou revogado | Não vazar existência do lead | y |

**Open questions:** none - all resolved or logged above (required before the spec is confirmed).

---

## User Stories

### P1: Portal do gerente ⭐ MVP

**User Story**: As a gerente comercial, I want abrir o portal do lead a partir do admin so that vejo todo o painel do cliente em uma página.

**Why P1**: É o coração da feature — sem a página não há portal.

**Acceptance Criteria** (each line is one EARS pattern):

1. WHEN o gerente autenticado clica em Ver resultado na linha do lead THEN the portal page SHALL abrir `/admin/leads/[leadId]` com hero, radar, barras e respostas em menos de 2 segundos com dados em cache quente (PORTAL-01).
2. WHILE o `market_insights.status` for diferente de analisado the portal SHALL exibir as seções de análise como placeholder de estado sem esconder scores, radar e respostas (PORTAL-02).
3. IF o gerente não estiver autenticado THEN the portal admin SHALL responder 401 e redirecionar para o login sem expor dados do lead (PORTAL-03).

**Independent Test**: Abrir um lead analisado e um lead pendente; ambos mostram scores e radar, só o primeiro mostra insights.

---

### P1: Link compartilhável do cliente ⭐ MVP

**User Story**: As a gerente comercial, I want gerar e copiar um link público do portal so that envio ao cliente sem expor o admin.

**Why P1**: Compartilhamento com o cliente é o valor central pedido.

**Acceptance Criteria**:

1. WHEN o gerente clica em Copiar link cliente THEN the system SHALL gerar um token opaco de 256 bits, persistir somente o hash SHA-256 com expiração de 90 dias e exibir `/r/[token]` (PORTAL-04).
2. WHEN um novo link é gerado para o mesmo lead THEN the system SHALL invalidar o token ativo anterior (PORTAL-05).
3. IF o token estiver inválido, expirado ou revogado THEN the system SHALL responder 404 genérico sem distinguir o motivo (PORTAL-06).

**Independent Test**: Gerar link, abrir em janela anônima, revogar, confirmar 404; gerar segundo link e confirmar que o primeiro invalida.

---

### P1: Visão pública sem PII sensível ⭐ MVP

**User Story**: As a visitante com link válido, I want ver o portal do meu diagnóstico so that entendo minha maturidade sem ver dados de outros clientes.

**Why P1**: Sem visão pública o link não tem utilidade.

**Acceptance Criteria**:

1. WHEN um visitante abre `/r/[token]` válido THEN the portal SHALL exibir as 6 seções sem email, sem telefone e sem ações de admin (PORTAL-07).
2. The public portal SHALL nunca expor `INTERNAL_API_KEY`, linhas brutas do banco ou campos fora do `PortalDTO` (PORTAL-08).
3. WHILE o visitante navegar pelo link público the system SHALL aplicar rate limiting no endpoint do token (PORTAL-09).

**Independent Test**: Abrir link válido em anônimo e inspecionar payload: contém nome e empresa, não contém email nem telefone.

---

### P1: Seções do dashboard ⭐ MVP

**User Story**: As a gerente comercial, I want ver estágio CMMI, radar, barras, respostas, concorrentes e insights so that conduzo a reunião comercial com material visual.

**Why P1**: São as 6 seções pedidas para a v1.

**Acceptance Criteria**:

1. The portal SHALL exibir as 6 seções: hero do estágio CMMI, radar teia de aranha, barras verticais por dimensão, respostas do formulário, concorrentes e insights com fontes (PORTAL-10).
2. WHERE o campo `dores[].dimensao_id` estiver presente the portal SHALL vincular a dor à barra correspondente por hover ou filtro (PORTAL-11).
3. IF os campos enriquecidos dos agentes estiverem ausentes em análises antigas THEN the portal SHALL renderizar fallback textual sem quebrar a página (PORTAL-12).

**Independent Test**: Abrir lead com análise nova completa e lead com análise antiga; ambos renderizam sem erro, o antigo mostra fallbacks.

---

### P1: Compatibilidade com pipeline existente ⭐ MVP

**User Story**: As a engenheiro, I want o portal sem regredir worker, PDF e fila so that o fluxo atual continua operando.

**Why P1**: Portal é aditivo; regressão no pipeline seria falha crítica.

**Acceptance Criteria**:

1. The system SHALL manter `POST /api/admin/analysis/reprocess`, geração de PDF e envio de email com comportamento inalterado (PORTAL-13).
2. IF o pipeline dos agentes receber o payload enriquecido THEN the worker SHALL validar com `safeParse` e persistir sem exigir os campos novos (PORTAL-14).

**Independent Test**: Rodar suite existente do worker e do PDF após a mudança de schemas; tudo passa sem alterar fixtures antigas.

---

## Edge Cases

Edge cases are usually unwanted-behavior (IF/THEN) or boundary (WHEN) criteria:

- IF o lead não tem diagnóstico THEN the portal admin SHALL responder 404 e a ação Ver resultado SHALL ficar desabilitada na tabela.
- IF o `market_insights.status` for falha THEN the portal SHALL mostrar o placeholder de falha com botão Reprocessar visível.
- WHEN o token expira exatamente durante a navegação THEN the próxima chamada de API SHALL retornar 404 e a página SHALL exibir estado expirado.
- IF o `research.sources` estiver vazio THEN the seção de fontes SHALL exibir mensagem de ausência em vez de lista vazia.
- WHEN a dimensão de menor nível empatar entre duas dimensões THEN the risco principal SHALL seguir o critério atual do scoring sem mudança.

---

## Requirement Traceability

Each requirement gets a unique ID for tracking across design, tasks, and validation.

| Requirement ID | Story | Phase | Status |
| -------------- | ----- | ----- | ------ |
| PORTAL-01 | P1: Portal do gerente | Design | Implementing |
| PORTAL-02 | P1: Portal do gerente | Design | Implementing |
| PORTAL-03 | P1: Portal do gerente | Design | Implementing |
| PORTAL-04 | P1: Link compartilhável | Design | Implementing |
| PORTAL-05 | P1: Link compartilhável | Design | Implementing |
| PORTAL-06 | P1: Link compartilhável | Design | Implementing |
| PORTAL-07 | P1: Visão pública | Design | In Design |
| PORTAL-08 | P1: Visão pública | Design | In Design |
| PORTAL-09 | P1: Visão pública | Design | In Design |
| PORTAL-10 | P1: Seções do dashboard | Design | Implementing |
| PORTAL-11 | P1: Seções do dashboard | Design | Implementing |
| PORTAL-12 | P1: Seções do dashboard | Design | Implementing |
| PORTAL-13 | P1: Compatibilidade | Design | In Design |
| PORTAL-14 | P1: Compatibilidade | Design | In Design |

**ID format:** `PORTAL-[NUMBER]`

**Status values:** Pending → In Design → In Tasks → Implementing → Verified

**Coverage:** 14 total, 0 mapped to tasks, 14 unmapped

---

## Success Criteria

How we know the feature is successful:

- [ ] Gerente abre o portal de um lead analisado e vê as 6 seções em menos de 2 segundos.
- [ ] Lead com análise pendente ou falha mostra scores e radar com placeholder de análise e botão de reprocesso.
- [ ] Link `/r/[token]` abre em janela anônima sem email nem telefone, expira em 90 dias e revoga sob comando.
- [ ] Suite existente de worker, PDF e fila passa sem alteração de fixtures antigas.
