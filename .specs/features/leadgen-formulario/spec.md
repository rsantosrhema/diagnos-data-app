# Formulário Público de Diagnóstico (Lead-gen) Specification

## Problem Statement

A Rhema Data precisa gerar leads qualificados através de um formulário público de autoavaliação no site rhemadata.com (ADR-008). O visitante responde 12 perguntas (2 de contexto + 10 pontuadas), informa nome, cargo e email com consentimento LGPD, recebe um score reportado como faixa, e se torna um lead qualificado com as respostas persistidas para benchmark futuro. Falta o fluxo público completo: renderizar o formulário a partir do contrato JSON (`docs/snapshot-maturidade-dados.json`), coletar nome/cargo/email com consentimento, calcular o score determinístico, persistir as respostas como um documento JSON estruturado e enviar o relatório em PDF ao time comercial. As respostas persistidas serão posteriormente enviadas a um agente de análise (Ollama) que gera os 10 pontos críticos e seu impacto por área — o agente fica para uma rodada futura.

## Goals

- [ ] Visitante responde as 12 perguntas renderizadas a partir de `docs/snapshot-maturidade-dados.json` (0 perguntas hardcoded) e informa nome, cargo e email com consentimento.
- [ ] Score calculado de forma determinística (`soma(nivel * peso) / 100`) e reportado **sempre como faixa**, nunca como decimal.
- [ ] Respostas (contexto + pontuadas + comercial + consentimento) persistidas no Supabase como documento JSON estruturado, pronto para envio ao agente de análise (futuro).
- [ ] Relatório em PDF com identidade Rhema Data enviado por email ao comercial@rhemadata.com (via `MANAGER_NOTIFICATION_EMAIL`).
- [ ] Consentimento explícito para coleta do email (LGPD), anti-abandono via localStorage, e proteção contra bots via honeypot.

## Out of Scope

| Feature | Reason |
| --- | --- |
| Integração com o agente de análise (Ollama) | O agente que analisa o formulário e gera os 10 pontos críticos + impacto por área **não será desenvolvido nesta rodada** (decisão do usuário). As respostas já são persistidas como JSON pronto para envio. |
| Login/autenticação do respondente | Fluxo público sem token; o formulário é acessível sem sessão. |
| Página de resultado no site (pós-submit) | Decisão do usuário: confirmação simples; o relatório vai para o comercial. |
| Enviar relatório ao email do respondente | Decisão do usuário: o relatório vai apenas para o comercial. |
| RAG / pgvector | Roadmap futuro (ADR-006). |
| Calibrar pesos/fontes das faixas | Hipóteses de negócio a revisar após 50+ respostas; fora desta entrega. |
| Persistência de draft server-side (`session_drafts`) | Anti-abandono via localStorage nesta entrega; draft server-side fica para outra feature. |
| Revisão do fluxo token/chat existente | Fora do escopo desta entrega. |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --- | --- | --- | --- |
| Fonte da verdade do conteúdo | `docs/snapshot-maturidade-dados.json` importado como módulo | ADR-008: "o formulário deve ser renderizado a partir dele, sem perguntas hardcoded". | y |
| Coleta de nome e cargo | O formulário coleta `nome` (→ `leads.name`) e `cargo` (→ `leads.role`), campos já existentes e armazenados quando o usuário solicita o diagnóstico na página inicial | Decisão do usuário; reutiliza o cadastro existente do lead. | y |
| `leads.company` / `leads.phone` | Nullable — o formulário não os coleta | O lead do fluxo público não tem empresa/telefone. | y |
| Agente de análise (Ollama) | Fora desta rodada; o agente (treinado com skill de análise) receberá o JSON das respostas e gerará os 10 pontos críticos + impacto por área | Decisão do usuário: agente não será desenvolvido agora; respostas persistidas como JSON pronto. | y |
| Cálculo do score | `score = soma(nivel * peso) / 100` (nível da opção selecionada × peso da dimensão) | ADR-008 / `scoring.formula` no JSON. Pesos somam 100. | y |
| Reportar como faixa | Sempre faixa via `scoring.faixas` (ranges de `min` a `max`), nunca decimal | ADR-008 / `regras_de_relatorio`. | y |
| Destaque de risco | Dimensão de menor nível é a principal exposição de risco | ADR-008 / `regras_de_relatorio`. | y |
| Sinalização de desequilíbrio | Quando `maior_nivel - menor_nivel > 3`, sinalizar desequilíbrio | ADR-008 / `regras_de_relatorio`. | y |
| Sinalização C-level | Respondente com papel C-level (`ctx_01`) marca score como otimista (interno; não bloqueia) | ADR-008 / `regras_de_relatorio`. | y |
| Relatório | PDF via `@react-pdf/renderer` enviado por email ao comercial | Decisão do usuário: "PDF enviado por email". | y |
| Destino do relatório | `MANAGER_NOTIFICATION_EMAIL` (padrão `comercial@rhemadata.com`); respondente não recebe cópia | Decisão do usuário; reusa padrão existente do projeto. | y |
| Persistência | Nova tabela `assessment_responses` (jsonb, inclui `agent_payload`) + `diagnostics` para o score; migration ajusta `leads` | Decisão do usuário: "Nova tabela + ajustar leads". | y |
| Anti-abandono | localStorage por pergunta; ao voltar, restaurar respostas respondidas | Decisão do usuário; sem server-side nesta entrega. | y |
| Pós-submit | Confirmação simples na tela; relatório via email ao comercial | Decisão do usuário. | y |
| Pergunta comercial | `cta_01` (custo/impacto de problemas com dados) não pontua; valor persistido | `pergunta_comercial` no JSON (não entra no score). | y |
| Consentimento LGPD | Checkbox obrigatório com finalidade declarada antes de coletar email | ADR-008: "consentimento explícito antes de coletar o e-mail, com finalidade declarada". | y |
| Rate limiting | `/api/public-proxy/screener` com limite dedicado no middleware | Endpoint público; segue padrão dos demais public-proxy. | y |
| Honeypot | Campo escondido descartado pelo service | Padrão já usado em `/api/leads`. | y |

**Open questions:** none - all resolved or logged above.

---

## User Stories

### P1: Formulário renderizado a partir do contrato JSON ⭐ MVP

**User Story**: As a visitante, I want responder 12 perguntas (2 de contexto + 10 pontuadas) apresentadas em uma única página a partir do contrato, informando nome, cargo e email com consentimento so that eu complete a autoavaliação e me torne um lead qualificado.

**Why P1**: Núcleo da ADR-008 — formulário 100% dirigido por dados, sem perguntas hardcoded.

**Acceptance Criteria** (each line is one EARS pattern):

1. The system SHALL renderizar a página do formulário a partir de `docs/snapshot-maturidade-dados.json` — as 2 `perguntas_contexto`, as 10 `dimensoes` (pergunta + opções com nível) e a `pergunta_comercial`.
2. WHEN o visitante carrega a página THEN the system SHALL exibir as 12 perguntas com suas opções na ordem do contrato (contexto, dimensões, comercial) e os campos nome, cargo e email.
3. WHILE o visitante não consentiu THEN the system SHALL exibir o campo de email e o consentimento desabilitados.
4. IF o visitante submete sem consentimento THEN the system SHALL exibir erro "É necessário consentir para receber o diagnóstico" sem enviar ao servidor.
5. The system SHALL validar no client que nome, cargo, email e as 10 perguntas pontuadas estão preenchidos antes de habilitar o envio.
6. IF o contrato JSON for inválido/ilegível THEN the system SHALL falhar no build (o módulo não resolve), nunca silenciosamente.

**Independent Test**: Abrir a rota pública `/diagnostico` e ver as 12 perguntas + campos nome/cargo/email renderizados; comparar texto/ordem com o JSON; tentar enviar sem consentimento e ver o erro; tentar enviar com dimensão em branco e o botão desabilitado.

---

### P1: Scoring determinístico e reporte por faixa ⭐ MVP

**User Story**: As a visitante, I want receber o resultado da autoavaliação como faixa de maturidade so that eu entenda o nível da empresa sem falsa precisão.

**Why P1**: ADR-008 — o score só é reportado como faixa; determinístico e auditável.

**Acceptance Criteria**:

1. The system SHALL calcular o score como `soma(nivel_dimensao * peso_dimensao) / 100` usando o nível da opção selecionada e o peso da dimensão.
2. The system SHALL mapear o score para a faixa correspondente de `scoring.faixas` (intervalo `[min, max)`; última faixa inclui o max).
3. The system SHALL reportar o resultado sempre como faixa (`rotulo` + `descricao`), nunca como número decimal.
4. WHEN o score for computado THEN the system SHALL identificar a dimensão de menor nível como principal exposição de risco.
5. IF a diferença entre o maior e o menor nível for > 3 THEN the system SHALL sinalizar desequilíbrio.
6. IF o papel do respondente (`ctx_01`) for C-level THEN the system SHALL marcar o resultado como propenso a otimismo (sinal interno).

**Independent Test**: Unit tests do service de scoring com inputs conhecidos (ex.: todos nível 3 → score 3.0 → faixa "Estruturado"); todos nível 1 → "Inicial"; menor dimensão identificada; desequilíbrio > 3 níveis sinalizado.

---

### P1: Persistência de respostas para benchmark + JSON para o agente ⭐ MVP

**User Story**: As a Rhema Data, I want persistir as respostas completas (contexto + dimensões + comercial + consentimento) e o score calculado, em um documento JSON estruturado, so that eu tenha dados para benchmark futuro e prontos para envio ao agente de análise.

**Why P1**: ADR-008 — "as respostas devem ser persistidas para uso futuro em benchmark"; decisão do usuário: enviadas via JSON a um agente (fora desta rodada).

**Acceptance Criteria**:

1. WHEN o formulário é submetido com consentimento THEN the system SHALL criar um lead com `name`, `role`, `email`, `status='pendente'`, `consent=true` e `consent_at`.
2. The system SHALL persistir na tabela `assessment_responses` (1:1 por lead): `context`, `answers`, `commercial_answer`, `consent` e `agent_payload` como `jsonb`.
3. The system SHALL gerar `agent_payload` como um documento JSON estruturado contendo solicitante (nome/cargo), contexto, respostas pontuadas, resposta comercial, score (faixa), risco e desequilíbrio — o contrato que será enviado ao agente de análise (Ollama) em rodada futura.
4. The system SHALL persistir em `diagnostics` o resultado: `overall_score`, `overall_level`, `dimension_scores` (id, nome, nivel, peso, score), `narrative` (faixa, risco, desequilíbrio) e `chart_data`.
5. IF a persistência falhar (erro de banco) THEN the system SHALL retornar 500 e NÃO enviar o email (transação lógica: sem persistência, sem email).
6. The system SHALL aplicar os updates de `leads` via migration (company/phone nullable + consent) e adicionar a tabela `assessment_responses` via migration commitada.
7. The system SHALL manter RLS habilitado sem policies nas tabelas novas (service-role only), seguindo o padrão das demais.

**Independent Test**: Enviar o formulário; conferir rows em `leads` (name, role, email, consent), `assessment_responses` (com `agent_payload`) e `diagnostics`; verificar que as respostas, o score e o `agent_payload` batem com o esperado.

---

### P1: Relatório em PDF enviado ao comercial ⭐ MVP

**User Story**: As a time comercial, I want receber o relatório do diagnóstico em PDF com a identidade Rhema Data so que eu tenha o diagnóstico em mãos para montar a apresentação ao cliente.

**Why P1**: ADR-008 — relatório por email com identidade Rhema Data; decisão do usuário: PDF anexado ao email do comercial.

**Acceptance Criteria**:

1. WHEN o diagnóstico é salvo com sucesso THEN the system SHALL gerar um PDF com identidade Rhema Data contendo: empresa, nome do respondente, faixa de maturidade, scores por dimensão, menor dimensão (risco), sinal de desequilíbrio e resposta comercial.
2. WHEN o PDF é gerado THEN the system SHALL enviá-lo por email para `MANAGER_NOTIFICATION_EMAIL` (padrão `comercial@rhemadata.com`).
3. IF o envio de email falhar THEN the system SHALL retornar um erro claro (502) e logar, sem informar o cliente dos detalhes.
4. The system SHALL marcar `pdf_path` em `diagnostics` apontando para o armazenamento do PDF gerado.
5. The PDF SHALL ser gerado server-side via `@react-pdf/renderer` injetado na camada Service (ADR-004/007).
6. The system SHALL exibir ao respondente uma confirmação simples ("Relatório enviado ao nosso time — entraremos em contato") sem expor a faixa na tela.

**Independent Test**: Mock do envio de email; verificar que o service chama o gerador de PDF com o resultado correto e que o email é enviado ao destinatário configurado; verificar conteúdo do PDF via teste de unidade do gerador.

---

### P2: Anti-abandono e validação ⭐ (P1 se aprovado)

**User Story**: As a visitante, I want não perder as respostas já dadas se eu fechar a página so that eu possa voltar e continuar de onde parei.

**Why P1**: ADR-008 — "abandono no meio do preenchimento não pode perder respostas já dadas".

**Acceptance Criteria**:

1. The system SHALL salvar as respostas no `localStorage` a cada mudança de seleção (incluindo nome, cargo e email).
2. WHEN o visitante recarrega a página THEN the system SHALL restaurar as respostas salvas e pular as perguntas já respondidas.
3. IF não houver respostas salvas THEN the system SHALL iniciar o formulário vazio.
4. The system SHALL limpar o `localStorage` após o envio bem-sucedido.
5. The system SHALL validar no servidor que as respostas pertencem às dimensões do contrato e têm nível válido (1–5), e que nome/cargo/email atendem aos limites.

**Independent Test**: Responder 3 perguntas e preencher nome/cargo, recarregar a página e confirmar que os dados persistem; enviar e confirmar que o storage é limpo; enviar payload malformado via API e ver 400.

---

## Edge Cases

- IF o visitante submete com o campo honeypot preenchido THEN the system SHALL responder `{ ok: true }` sem processar (descarta como bot).
- IF alguma dimensão não estiver respondida THEN the system SHALL rejeitar com 400 e mensagem de dimensão pendente.
- IF nome ou cargo tiverem menos de 2 caracteres ou email for inválido THEN the system SHALL rejeitar (400) com mensagem clara.
- IF o email já existir com lead `pendente` THEN the system SHALL rejeitar (409) com mensagem clara.
- IF `scoring.faixas` não cobrir o score calculado THEN the system SHALL lançar erro tipado (nunca retornar faixa vazia).
- IF o número de opções da dimensão não corresponder aos níveis 1–5 THEN o schema de validação SHALL rejeitar.
- WHEN o score exato cair num limite de faixa THEN o sistema SHALL usar a faixa cujo `[min, max)` contém o score (última faixa inclui o `max`).

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| --- | --- | --- | --- |
| LF-01 | P1: Formulário renderizado a partir do contrato JSON | Design | Pending |
| LF-02 | P1: Formulário (consentimento LGPD + validação client) | Design | Pending |
| LF-03 | P1: Scoring determinístico | Design | Pending |
| LF-04 | P1: Reporte por faixa + risco + desequilíbrio | Design | Pending |
| LF-05 | P1: Persistência (leads + assessment_responses + diagnostics) | Design | Pending |
| LF-06 | P1: Relatório PDF + email ao comercial | Design | Pending |
| LF-07 | P2: Anti-abandono (localStorage) | Design | Pending |
| LF-08 | P2: Validação server-side do payload | Design | Pending |
| LF-09 | P1: Confirmação simples pós-submit | Design | Pending |
| LF-10 | P1: Coleta de nome, cargo e email do solicitante | Design | Pending |
| LF-11 | P1: Respostas persistidas como JSON pronto para o agente | Design | Pending |

**ID format:** `LF-[NUMBER]`

**Status values:** Pending → In Design → In Tasks → Implementing → Verified

**Coverage:** 11 total, 0 mapped, 11 unmapped ⚠️

---

## Success Criteria

- [ ] Visitante responde as 12 perguntas em uma única página, renderizadas do JSON, e informa nome, cargo e email com consentimento LGPD.
- [ ] Score determinístico sempre reportado como faixa; menor dimensão destacada; desequilíbrio sinalizado quando > 3 níveis.
- [ ] Respostas completas persistidas (`leads` + `assessment_responses` com `agent_payload` + `diagnostics`) com consentimento LGPD, prontas para envio ao agente de análise (futuro).
- [ ] Comercial recebe o PDF com identidade Rhema Data por email.
- [ ] Anti-abandono funciona (respostas restauradas após recarga).
- [ ] `npm run test`, `npm run lint` e `npm run build` passam.
