# Formulário Público de Diagnóstico (Lead-gen) Context

**Gathered:** 2026-08-23
**Spec:** `.specs/features/leadgen-formulario/spec.md`
**Status:** Ready for design

---

## Feature Boundary

Formulário público de autoavaliação de maturidade de dados (ADR-008): 12 perguntas renderizadas do contrato JSON, coleta de nome/cargo/email com consentimento LGPD, scoring determinístico reportado como faixa, persistência de respostas para benchmark (documento JSON pronto para envio ao agente de análise), e relatório em PDF enviado ao time comercial. Não envolve o agente de análise (Ollama) nesta rodada, autenticação de respondente, página de resultado no site, ou envio de relatório ao respondente.

---

## Implementation Decisions

### Ritmo e escopo

- Ritmo **Guiado**: recomendações apresentadas por área, aceitas/ajustadas em turnos curtos.

### Agente de análise (Ollama)

- **Não será desenvolvido nesta rodada** (decisão do usuário). O agente (treinado com uma skill de análise) receberá o formulário preenchido em JSON e gerará os **10 pontos críticos + impacto por área**.
- Para isso, as respostas são persistidas como um documento JSON estruturado (`agent_payload`) na tabela `assessment_responses`, **pronto para ser enviado ao agente em rodada futura**. Nenhuma integração com Ollama é construída nesta entrega.

### Dados do solicitante (nome + cargo)

- O formulário coleta **nome** (`leads.name`) e **cargo** (`leads.role`) — campos que **já são armazenados** quando o usuário solicita o diagnóstico na página inicial (`/api/leads`). Reutilizamos o cadastro existente do lead.
- `leads.company` e `leads.phone` ficam nullable — o formulário público não os coleta.

### Relatório (PDF)

- **Incluir PDF nesta entrega** — instalar `@react-pdf/renderer`, gerador em `src/lib/report/` com identidade Rhema Data, anexado ao email do comercial.
- O comercial@rhemadata.com recebe o diagnóstico em mãos para montar apresentação ao cliente.

### Persistência

- **Nova tabela `assessment_responses` (jsonb) + `diagnostics`** para o score; migration ajusta `leads` (company/phone nullable + consent/consent_at). Segue o padrão jsonb do projeto (data-model.md).
- `agent_payload` é o documento JSON pronto para envio ao agente.

### Anti-abandono

- **localStorage** — salvar a cada seleção (incluindo nome/cargo/email); ao recarregar, restaurar e pular as respondidas. Persistência server-side (`session_drafts`) fica fora desta entrega.

### Pós-submit

- **Confirmação simples** na tela; o relatório vai para `comercial@rhemadata.com` (via `MANAGER_NOTIFICATION_EMAIL`, padrão existente). O respondente **não** recebe cópia.

---

## Agent's Discretion

- Layout exato do formulário (cards, passos, barra de progresso) — desde que siga o design system Rhema existente (botões, inputs, cores em `globals.css`).
- Rota pública: `/diagnostico` (sem token), seguindo padrão visual das demais páginas.
- Estrutura da resposta da API (campos, nomes) — desde que validada com Zod e coberta por DTO.

---

## Declined / Undiscussed Gray Areas → Assumptions

- **PDF ou HTML** — usuário escolheu PDF (não o HTML sugerido). Registrado como decisão de escopo (spec Assumptions).
- **Destino do email** — usuário confirmou apenas comercial; respondente não recebe cópia. Registrado como assunção.
- **Persistência** — usuário escolheu nova tabela + ajustar leads. Registrado como assunção.
- **Pós-submit** — usuário confirmou confirmação simples (sem faixa em tela). Registrado como assunção.
- **Agente de análise** — usuário definiu: não desenvolvido nesta rodada; respostas enviadas via JSON a um agente (futuro). Registrado como assunção + campo `agent_payload`.

---

## Specific References

- Usuário citou o fluxo comercial: "ele que vai ter esse diagnóstico em mão para montar uma apresentação para o cliente" — o relatório precisa conter conteúdo suficiente para o comercial preparar a apresentação (faixa, dimensões, risco, desequilíbrio, resposta comercial).
- Usuário citou o agente: "vai analisar o formulário preenchido e vai gerar através de um agente treinado com uma skill de análise, 10 pontos críticos e como isso pode impactar em cada área" — o `agent_payload` precisa conter as respostas estruturadas para esse envio futuro.

---

## Deferred Ideas

- Integração com o agente de análise (Ollama) para gerar os 10 pontos críticos + impacto por área — **próxima rodada**.
- Persistência de draft server-side (`session_drafts`) para anti-abandono entre dispositivos.
- Página de resultado autenticada no site.
- Calibragem de pesos/faixas após 50+ respostas (prevista no contrato).
