# Market Insights PDF — Slice 2 Specification

## Problem Statement

A Fatia 1 (ADR-009, `.specs/features/market-insights-agents`) já orquestra pesquisador/analista/redator e persiste `market_insights` em background. Mas o relatório em PDF que o time comercial recebe continua sendo o relatório puramente determinístico (faixa + tabela), e o e-mail é enviado ainda **no submit** — antes de a análise existir. Para o closer chegar à reunião com contexto de mercado, o PDF final precisa incluir a análise (resumo + dores) e os **bullets priorizados** com quadrados coloridos (Alta=vermelho, Média=amarelo, Baixa=azul), e o e-mail ao comercial precisa sair **após** a análise (regenerando o PDF com os insights), com fallback para o PDF básico sem bullets quando a análise falha.

## Goals

- [ ] O PDF gerado após a análise conter bullets priorizados (Alta/Média/Baixa com quadrados coloridos) + seção de análise e contexto de concorrentes
- [ ] O e-mail ao comercial não sair mais no submit; sair após a análise, com o PDF enriquecido (ou PDF básico de fallback quando a análise falha)
- [ ] O submit responder `{ ok: true }` imediato e o lead ficar marcado com análise pendente quando o fallback for usado

## Out of Scope

| Feature | Reason |
| --- | --- |
| Radar de aranha (10 eixos DAMA-DMBOK) no PDF | Fatia 3 (próxima) |
| Admin reprocessar análise (`analise_pendente`) | Fatia 3 |
| Exibir bullets para o visitante no front | O PDF e o e-mail são internos ao comercial |
| Alterar o fluxo de token/sessão | Fora do escopo desta fatia |
| Skills markdown por segmento | Já entregue na Fatia 1 |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --- | --- | --- | --- |
| Disparo do e-mail | O submit deixa de enviar e-mail; o worker, ao concluir a análise (ou o fallback), regenera o PDF e envia ao comercial | ADR-009: e-mail completo em até 2–3 min após submit; submit responde `{ok:true}` imediato | y |
| Fallback quando a análise falha | Worker marca `market_insights.status = 'falha'` e envia o **PDF básico** (sem bullets) ao comercial | ADR-009 §Fallback: e-mail nunca fica retido | y |
| Lead com análise pendente | `leads.status = 'analise_pendente'` quando o pipeline falha | ADR-009 §Fallback: reprocessamento manual (fatia 3) | y |
| PDF básico x enriquecido | `GeneratePdfInput` ganha `insights?` e `analysis?` opcionais; ausentes ⇒ seções omitidas | Um único gerador, enriquecido conforme disponível | y |
| Bullets com prioridade | Cor `alta=vermelho`, `media=amarelo`, `baixa=azul`; quadrados de cantos arredondados (`borderRadius`) | ADR-009 drivers | y |
| Fontes no PDF | Fontes NÃO vão ao PDF (só no banco) | ADR-009 §PDF final | y |
| `market_insights.status` de sucesso | Mantido `analisado`; o envio do e-mail de análise passa a ser responsabilidade do worker | Sem coluna nova | y |
| Reprocessamento já-analisado | Fora do escopo (fatia 3); o upsert da Fatia 1 já regenera `analisado` | ADR-009 | y |
| e-mail falhar no worker | Worker loga o erro e mantém status; o pipeline não re-tenta no mesmo job | Fallback em prod = fila com retry (ops) | y |
| Envio de e-mail vazio (sem diagnóstico/lead) | Worker apenas loga e não envia | Evita e-mail órfão sem PDF | y |

**Open questions:** none — todos os itens acima foram resolvidos por decisão na tabela.

---

## User Stories

### P1: Incluir análise e bullets priorizados no PDF ⭐ MVP

**User Story**: Como time comercial, quero receber um PDF com a análise e os bullets priorizados (Alta/Média/Baixa com quadrados coloridos), para chegar à reunião sabendo o que abordar e o que o mercado confirma.

**Why P1**: É o objetivo central da ADR-009 para o closer (não-técnico).

**Acceptance Criteria**:

1. WHEN a análise e os bullets estiverem disponíveis THEN o sistema SHALL incluir no PDF uma seção "Análise" com `analysis.resumo` e a lista de `analysis.dores`.
2. WHEN o PDF incluir bullets THEN cada bullet SHALL ser renderizado com um quadrado de cantos arredondados colorido conforme a prioridade: `alta` → vermelho, `media` → amarelo, `baixa` → azul.
3. WHEN `payload.empresa.nome` existir e `analysis.contexto_concorrentes` não for vazio THEN o sistema SHALL incluir uma seção "Concorrentes" listando nome + contexto.
4. WHEN `insights` estiver vazio (fallback) THEN o sistema SHALL omitir a seção de bullets do PDF.
5. The system SHALL NÃO incluir fontes (URLs de pesquisa) no PDF.

**Independent Test**: Renderizar o PDF via `generateScreenerPdf` com `insights` preenchidos e verificar que o buffer é gerado; testar ausência de bullets (PDF básico) e ausência de concorrentes.

---

### P2: Mover o e-mail ao comercial para após a análise ⭐ MVP

**User Story**: Como sistema, quero que o e-mail com o PDF ao comercial seja enviado pelo worker após a análise (regenerando o PDF enriquecido), e não mais no submit.

**Why P2**: O closer precisa do PDF com insights; o submit não pode esperar a análise.

**Acceptance Criteria**:

1. WHEN `screenService.submitScreener` persistir o diagnóstico THEN o sistema SHALL NÃO enviar e-mail ao comercial e SHALL responder `{ ok: true }` ao visitante.
2. WHEN o worker processar um job com sucesso THEN o sistema SHALL regenerar o PDF com os insights e SHALL enviar o e-mail ao comercial com esse PDF.
3. WHEN a análise falhar THEN o sistema SHALL marcar `leads.status = 'analise_pendente'`, SHALL enviar o PDF básico (sem bullets) ao comercial e SHALL manter `market_insights.status = 'falha'`.
4. IF o envio de e-mail no worker falhar THEN o sistema SHALL logar o erro e SHALL manter o status da análise (`analisado`/`falha`) sem re-lançar para o caller do worker.

**Independent Test**: Mock do worker com sucesso → verifica e-mail com PDF enriquecido; mock com falha → verifica e-mail com PDF básico e `analise_pendente`; unit no screen-service → e-mail NÃO enviado no submit.

---

## Edge Cases

- IF `analysis` ausente (fallback) THEN o sistema SHALL omitir a seção "Análise" do PDF.
- IF `contexto_concorrentes` vazio THEN o sistema SHALL omitir a seção "Concorrentes" do PDF.
- IF a prioridade de um bullet for inválida THEN o sistema SHALL usar a cor padrão de `baixa` (azul).
- IF o worker não encontrar o payload/lead THEN o sistema SHALL marcar `falha` sem enviar e-mail.
- IF `leads.status = 'concluido'` (reenvio master) e o pipeline rodar THEN o sistema SHALL enviar o e-mail de análise normalmente.
- IF já existir análise para o lead (upsert/reprocessamento) THEN o sistema SHALL regenerar o PDF com a análise mais recente.

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| --- | --- | --- | --- |
| PDF-01 | P1: Seção "Análise" no PDF (resumo + dores) | Design | Pending |
| PDF-02 | P1: Quadrados coloridos por prioridade (alta=vermelho, media=amarelo, baixa=azul) | Design | Pending |
| PDF-03 | P1: Seção "Concorrentes" quando houver | Design | Pending |
| PDF-04 | P1: Omitir bullets quando vazio (fallback) | Design | Pending |
| PDF-05 | P1: Sem fontes no PDF | Design | Pending |
| EMAIL-01 | P2: Submit não envia e-mail ao comercial | Design | Pending |
| EMAIL-02 | P2: Worker envia PDF enriquecido após sucesso | Design | Pending |
| EMAIL-03 | P2: Fallback envia PDF básico + `analise_pendente` | Design | Pending |
| EMAIL-04 | P2: Falha de e-mail no worker não derruba o worker | Design | Pending |

**Coverage:** 9 total, 0 mapped to tasks, 9 unmapped

---

## Success Criteria

- [ ] O PDF de um lead analisado contém análise + bullets priorizados com quadrados coloridos (Alta/Média/Baixa), sem fontes
- [ ] O submit não envia e-mail; o e-mail chega ao comercial após a análise, com o PDF enriquecido (ou básico de fallback)
- [ ] Nenhuma falha de análise/Exa/LLM/e-mail retém o lead: `falha` + `analise_pendente` + PDF básico garantem que o comercial sempre recebe algo
