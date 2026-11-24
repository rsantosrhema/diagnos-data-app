# Metodologia DMBOK2 Specification

## Problem Statement

O diagnóstico mistura três referências (DAMA-DMBOK, DCAM e uma escala "CMMI-like") e o portal rotula o resultado como "CMMI", o que não se sustenta numa conversa de venda. Além disso, as faixas de estágio mudam de limite por segmento, então o mesmo score recebe estágios diferentes e o portal exibe uma faixa que contradiz o score. Nenhum diagnóstico foi enviado a cliente ainda; esta é a janela para alinhar o instrumento a uma referência única sem mudar sua estrutura.

## Goals

- [ ] Uma única referência metodológica (DAMA-DMBOK2, cap. 15) em contrato, PDF e portal; zero menções a "CMMI", "DCAM" ou "DMM" no texto exibido ao cliente.
- [ ] A mesma régua de estágio para todos os segmentos; a diferenciação setorial vem só dos pesos.
- [ ] O peso de cada dimensão no setor do cliente fica visível (PDF e portal), comparado ao peso padrão.

## Out of Scope

| Feature | Reason |
| ------- | ------ |
| Reescrever perguntas ou opções além das 4 opções de nível 3 (d01, d03, d05, d07) | Usuário quer mudança mínima |
| Mudar fórmula do score, pesos base, multiplicadores por segmento/porte ou nomes dos 5 estágios | A diferenciação setorial atual é mantida |
| Renomear `src/lib/cmmi/` ou o schema `cmmiStageSchema` | Nome interno; não aparece ao cliente |
| Migração de banco, rotas novas, mudanças no pipeline de agentes | Não necessárias |
| Push, PR, deploy ou alteração do Supabase de produção | Fora do escopo local; exige autorização explícita |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --------------------- | -------------- | --------- | ---------- |
| Escala de níveis | 1 Inicial · 2 Repetível · 3 Definido · 4 Gerenciado · 5 Otimizado | Escala genérica do DMBOK2 cap. 15, mapeada 1:1 nos níveis 1–5 existentes | y |
| Limites das faixas | Sempre os de `contract.scoring.faixas` (1.8 / 2.6 / 3.4 / 4.2), inclusive quando a calibração ativa (JSON ou tabela `scoring_versions`) traz `recalibrated_bands` | Uma régua só; protege também a produção, onde a calibração ativa pode vir do banco | y |
| Textos setoriais dos estágios | Mantidos: a descrição do estágio vem de `recalibrated_bands[segmento]` pelo `rotulo`; sem entrada, usa a descrição do contrato | Preserva o conteúdo específico por setor | y |
| Peso padrão exibido | `base_weight` da calibração seed (`SCORING_CALIBRATION.dimensions[id]`) | Os pesos base são iguais no seed e no banco; evita I/O no render | y |
| Formato do peso | `"13% (padrão 10%)"`; quando igual ao padrão, `"10% (padrão)"` | Pesos somam 100, então peso = percentual | y |
| Formato do score no portal | Uma casa decimal com vírgula + " de 5", ex.: `"2,3 de 5"` | Número com referência de escala; padrão pt-BR | y |
| Diagnósticos já gravados | Nenhum foi enviado a cliente; não há migração de dados | Confirmado pelo usuário | y |

**Open questions:** none - all resolved or logged above.

---

## User Stories

### P1: Contrato com referência única ⭐ MVP

**User Story**: Como gerente comercial, quero que o questionário cite só o DAMA-DMBOK2 e que cada nível signifique o que o nome diz, para defender o método numa venda.

**Why P1**: Base de todo o resto; PDF e portal leem rótulos e textos do contrato.

**Acceptance Criteria**:

1. The contract SHALL have `meta.versao` equal to `"1.2"`. <!-- MET-01 -->
2. The contract SHALL expose `meta.escala_niveis` with exactly 5 entries `[{nivel:1,rotulo:"Inicial"},{nivel:2,rotulo:"Repetível"},{nivel:3,rotulo:"Definido"},{nivel:4,rotulo:"Gerenciado"},{nivel:5,rotulo:"Otimizado"}]`, validated by the Zod contract schema. <!-- MET-02 -->
3. The contract SHALL expose `meta.nome_indice` equal to `"Índice de Maturidade Rhema"` and `meta.referencia` equal to `"Índice proprietário da Rhema Data, estruturado sobre as áreas de conhecimento do DAMA-DMBOK2 e sua abordagem de avaliação de maturidade (cap. 15), com pesos ajustados ao segmento e ao porte da empresa. Instrumento de triagem por autoavaliação; não é certificação."`. <!-- MET-03 -->
4. The contract SHALL set `area_dmbok` of d02 to `"Data Governance (Data Strategy)"`, d09 to `"Big Data & Data Science"` and d10 to `"Data Management Organization & Role Expectations"`, keeping the other 7 dimensions unchanged. <!-- MET-04 -->
5. The serialized contract SHALL contain none of the substrings `"CMMI"`, `"DCAM"`, `"DMM"`. <!-- MET-05 -->
6. The contract SHALL set the nível-3 option text of d01 to `"Papéis de dono formalizados, mas cobrindo só parte dos dados críticos"`, d03 to `"Repositório central com padrões de integração definidos, aplicados a parte das fontes"`, d05 to `"Documentação padronizada para os dados críticos, atualizada manualmente"` and d07 to `"Inventário de dados pessoais formalizado, com revisão em ciclo definido"`, leaving every other option text unchanged. <!-- MET-06 -->

**Independent Test**: unit tests em `src/lib/screener/contract.test.ts` sobre `SCREENER_CONTRACT`.

---

### P1: Mesma régua de estágio para todos os segmentos ⭐ MVP

**User Story**: Como gerente, quero que o mesmo score caia no mesmo estágio em qualquer setor, para comparar clientes e não contradizer a faixa exibida.

**Why P1**: Corrige a inconsistência visível no portal.

**Acceptance Criteria**:

1. WHEN `computeContextualScores` runs for any segment THEN the system SHALL classify the score using the limits of `contract.scoring.faixas` (Inicial [1.0,1.8), Emergente [1.8,2.6), Estruturado [2.6,3.4), Gerenciado [3.4,4.2), Otimizado [4.2,5.0]). <!-- MET-07 -->
2. WHEN the segment is `"Indústria"` and the weighted score is in [1.8, 2.0) THEN the system SHALL return band `rotulo` `"Emergente"` (antes era `"Inicial"`). <!-- MET-08 -->
3. WHEN the calibration has `recalibrated_bands[segmento]` with an entry whose `rotulo` equals the classified band THEN the system SHALL return that entry's `descricao` as `band.descricao`. <!-- MET-09 -->
4. IF the segment has no `recalibrated_bands` entry THEN the system SHALL return the contract band's `descricao`. <!-- MET-10 -->
5. The system SHALL keep segment/porte weight adjustment unchanged (same `computeAdjustedWeights` output for the same inputs). <!-- MET-11 -->
6. The seed `docs/scoring-calibration.json` SHALL keep every `recalibrated_bands` entry's `min`/`max` equal to the contract band with the same `rotulo`. <!-- MET-12 -->

**Independent Test**: unit tests em `src/lib/screener/scoring.test.ts` (ou arquivo de teste de scoring contextual existente) com respostas montadas para Indústria, Saúde e Outro.

---

### P1: Linguagem metodológica única ⭐ MVP

**User Story**: Como gerente, quero um só módulo que gere os textos de método, escala, peso e score, para que PDF e portal digam a mesma coisa.

**Why P1**: Evita três escalas divergentes, como hoje.

**Acceptance Criteria**:

1. The module `src/lib/maturity/methodology.ts` SHALL export `INDEX_LABEL` equal to `"Índice de Maturidade Rhema · base DAMA-DMBOK2"`. <!-- MET-13 -->
2. The module SHALL export `SCALE_LEGEND` equal to `"Escala de níveis (DAMA-DMBOK2): 1 Inicial · 2 Repetível · 3 Definido · 4 Gerenciado · 5 Otimizado"`, built from `meta.escala_niveis`. <!-- MET-14 -->
3. The module SHALL export `METHOD_NOTE` equal to `meta.referencia`. <!-- MET-15 -->
4. WHEN `formatWeight(13, 10)` is called THEN the module SHALL return `"13% (padrão 10%)"`; WHEN `formatWeight(10, 10)` THEN `"10% (padrão)"`. <!-- MET-16 -->
5. WHEN `formatScore(2.34)` is called THEN the module SHALL return `"2,3 de 5"`; WHEN `formatScore(5)` THEN `"5,0 de 5"`. <!-- MET-17 -->
6. WHEN `getBaseWeight("d07")` is called THEN the module SHALL return `10`; IF the id is unknown THEN it SHALL return `null`. <!-- MET-18 -->
7. WHEN `getAreaDmbok("d09")` is called THEN the module SHALL return `"Big Data & Data Science"`; IF the id is unknown THEN it SHALL return `null`. WHEN `describeDimension("x99", 7)` is called THEN it SHALL return `{ pesoPadrao: 7, areaDmbok: "" }`. <!-- MET-19 -->

**Independent Test**: `src/lib/maturity/methodology.test.ts`.

---

### P1: PDF alinhado ⭐ MVP

**User Story**: Como gerente, quero que o PDF use a escala DMBOK2, mostre o peso setorial e cite o método, para entregar um documento defensável.

**Why P1**: É o entregável principal ao cliente.

**Acceptance Criteria**:

1. The PDF stage card SHALL render the text `INDEX_LABEL`. <!-- MET-20 -->
2. The PDF radar reading SHALL render `SCALE_LEGEND` and SHALL NOT render `"1 Inicial · 2 Emergente"`. <!-- MET-21 -->
3. The PDF dimension table SHALL have headers `DIMENSÃO`, `NÍVEL`, `PESO NO SETOR`, `PESO PADRÃO` and SHALL NOT have a `SCORE` header. <!-- MET-22 -->
4. WHEN a dimension row renders THEN the PDF SHALL show its `areaDmbok` under the dimension name, `"<peso>%"` in PESO NO SETOR and `"<pesoPadrao>%"` in PESO PADRÃO. <!-- MET-23 -->
5. The PDF methodology note SHALL render `METHOD_NOTE`. <!-- MET-24 -->
6. The rendered PDF text SHALL contain none of `"CMMI"`, `"DCAM"`, `"DMM"`. <!-- MET-25 -->
7. WHEN `buildPdfInput` in `analysis-service.ts` or in `admin-service.ts` builds dimension scores THEN each SHALL carry `pesoPadrao` and `areaDmbok` from `describeDimension(id, peso)`, which returns `getBaseWeight(id) ?? peso` and `getAreaDmbok(id) ?? ""`. <!-- MET-26 -->

**Independent Test**: `src/lib/report/report-generator.test.ts` e `src/lib/service/analysis-service.test.ts`.

---

### P1: Portal alinhado ⭐ MVP

**User Story**: Como cliente, quero ver no portal o mesmo método, a escala, o peso de cada dimensão no meu setor e a nota metodológica, para entender o resultado.

**Why P1**: É a página enviada ao cliente.

**Acceptance Criteria**:

1. The portal DTO SHALL include, per dimension, `pesoPadrao: number` and `areaDmbok: string`, populated by `portal-service` with the same fallback rule as MET-26. <!-- MET-27 -->
2. `StageHero` SHALL render `INDEX_LABEL` and SHALL NOT render `"CMMI"`. <!-- MET-28 -->
3. `StageHero` SHALL render the score via `formatScore` (e.g. `"2,3 de 5"`). <!-- MET-29 -->
4. `AnswersTable` SHALL render, per dimension, `formatWeight(peso, pesoPadrao)` and the `areaDmbok` text. <!-- MET-30 -->
5. `MaturityBars` SHALL render `SCALE_LEGEND`. <!-- MET-31 -->
6. `DiagnosticPortal` SHALL render a "Nota metodológica" section containing `METHOD_NOTE`, in both `public` and `manager` modes. <!-- MET-32 -->

**Independent Test**: testes de componente em `src/components/portal/*.test.tsx` e `src/lib/service/portal-service.test.ts`.

---

### P2: Documentação da decisão

**User Story**: Como dono do produto, quero a decisão registrada, para que agentes e pessoas não reintroduzam DCAM/CMMI.

**Why P2**: Não muda comportamento, mas evita regressão.

**Acceptance Criteria**:

1. `AGENTS.md` §5 SHALL name DAMA-DMBOK2 as the single methodological reference and SHALL NOT contain `"DCAM"` or `"CMMI-like"`. <!-- MET-33 -->
2. The repo SHALL contain `docs/decisions/011-dmbok2-base-metodologica.md` stating the decision, fixed bands with sector weights, and the positioning sentence. <!-- MET-34 -->

**Independent Test**: grep nos arquivos.

---

## Edge Cases

- IF the active calibration comes from `scoring_versions` with `recalibrated_bands` limits different from the contract THEN the system SHALL still classify by the contract limits (MET-07).
- WHEN the score equals exactly a boundary (e.g. 2.6) THEN the system SHALL return the upper band (`"Estruturado"`), and 5.0 SHALL return `"Otimizado"`.
- IF a dimension id is not in calibration or contract THEN PDF and portal SHALL render `peso` as both weights and an empty area (MET-26/MET-27), without throwing.

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| -------------- | ----- | ----- | ------ |
| MET-01 | P1: Contrato | Tasks | Implementing |
| MET-02 | P1: Contrato | Tasks | Implementing |
| MET-03 | P1: Contrato | Tasks | Implementing |
| MET-04 | P1: Contrato | Tasks | Implementing |
| MET-05 | P1: Contrato | Tasks | Implementing |
| MET-06 | P1: Contrato | Tasks | Implementing |
| MET-07 | P1: Régua única | Tasks | Implementing |
| MET-08 | P1: Régua única | Tasks | Implementing |
| MET-09 | P1: Régua única | Tasks | Implementing |
| MET-10 | P1: Régua única | Tasks | Implementing |
| MET-11 | P1: Régua única | Tasks | Implementing |
| MET-12 | P1: Régua única | Tasks | Implementing |
| MET-13 | P1: Linguagem única | Tasks | Implementing |
| MET-14 | P1: Linguagem única | Tasks | Implementing |
| MET-15 | P1: Linguagem única | Tasks | Implementing |
| MET-16 | P1: Linguagem única | Tasks | Implementing |
| MET-17 | P1: Linguagem única | Tasks | Implementing |
| MET-18 | P1: Linguagem única | Tasks | Implementing |
| MET-19 | P1: Linguagem única | Tasks | Implementing |
| MET-20 | P1: PDF | Tasks | Implementing |
| MET-21 | P1: PDF | Tasks | Implementing |
| MET-22 | P1: PDF | Tasks | Implementing |
| MET-23 | P1: PDF | Tasks | Implementing |
| MET-24 | P1: PDF | Tasks | Implementing |
| MET-25 | P1: PDF | Tasks | Implementing |
| MET-26 | P1: PDF | Tasks | Implementing |
| MET-27 | P1: Portal | Tasks | Implementing |
| MET-28 | P1: Portal | Tasks | Implementing |
| MET-29 | P1: Portal | Tasks | Implementing |
| MET-30 | P1: Portal | Tasks | Implementing |
| MET-31 | P1: Portal | Tasks | Implementing |
| MET-32 | P1: Portal | Tasks | Implementing |
| MET-33 | P2: Documentação | Tasks | Implementing |
| MET-34 | P2: Documentação | Tasks | Implementing |

**Coverage:** 34 total, 34 mapped to tasks, 0 unmapped

---

## Success Criteria

- [ ] `npm run typecheck`, `npm run lint`, `npm run test` e `npm run build` passam no branch `feat/metodologia-dmbok2`.
- [ ] Smoke local: 3 leads (Saúde, Indústria, Outro) submetidos pelo proxy público recebem o estágio da régua fixa; portal e PDF exibem `INDEX_LABEL`, `SCALE_LEGEND`, pesos setoriais e a nota, sem "CMMI"/"DCAM".
- [ ] O gerente faz login local em `/admin` e valida os 3 leads manualmente.
