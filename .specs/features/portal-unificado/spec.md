# Portal Unificado Specification

## Problem Statement

O portal do diagnóstico existe duas vezes: `/r/[token]` (público) e `/admin/leads/[leadId]` (gerente). As duas rotas montam o mesmo `PortalDTO` no `portal-service` e renderizam a mesma pilha de componentes, mas cada `page.tsx` repete ~200 linhas de layout. O resultado é divergência visual entre as duas telas, correções em dobro e dois frames quase idênticos no canvas.

## Goals

- [ ] As duas rotas renderizam o mesmo componente `DiagnosticPortal`; cada `page.tsx` fica com fetch, estados de loading/erro e ações do gerente.
- [ ] Nenhuma capacidade do gerente regride: copiar/revogar link, filtro por dimensão, reprocessar análise, estados 401/404.
- [ ] A visão pública continua sem PII, sem ações de admin e com 404 genérico para token inválido, expirado ou revogado.

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
| --- | --- |
| Unificar o renderer do PDF | O PDF usa `@react-pdf/renderer` (primitivas próprias); compartilhar o DOM não é possível |
| Alterar o design no canvas | Trabalho paralelo no pen.dev; esta spec cobre só o código |
| Adicionar conteúdo novo ao portal (flag de desequilíbrio, resposta comercial) | É evolução de produto, não refactor |
| Passar `email`/`share` para o componente compartilhado | PII e estado de compartilhamento pertencem à rota do gerente |
| Redesenhar estados de erro | Copy e destino de ação continuam específicos por rota |

---

## Assumptions & Open Questions

Every ambiguity is resolved or recorded here - nothing is left silently unclear.

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --- | --- | --- | --- |
| Copy do hero | `Resultado de {nome} · {empresa}` nas duas rotas | Elimina a diferença "Resultado de" vs "Diagnóstico de" usando o texto que o cliente já vê | y |
| Cabeçalho | Logo (link `/` no público, `/admin` no gerente); identidade do lead e "Voltar ao painel" só no gerente | O gerente precisa saber de quem é o portal e voltar; o cliente não precisa de navegação de admin | y |
| Filtro por dimensão | Habilitado só no modo `manager` | É ação de análise interna; o cliente é somente leitura | y |
| Animações de entrada (`Reveal`) | Fora do componente compartilhado | Evita acoplar `src/components/portal` ao módulo `app/admin/components`; o dashboard admin mantém a sua | y |
| Skip link | Presente nas duas rotas via componente | Acessibilidade já existia no gerente; o público ganha sem custo | y |
| Estado de loading | Um único `PortalSkeleton` | Mesma forma nas duas rotas; remove duas implementações equivalentes | y |
| Erros | `PortalErrorState` compartilhado, copy e ação por rota | Público não pode revelar existência do lead; gerente precisa de rota de volta | y |

**Open questions:** none - all resolved or logged above (required before the spec is confirmed).

---

## User Stories

### P1: Uma página, dois acessos ⭐ MVP

**User Story**: As gerente comercial, I want que o portal do cliente e a minha visão interna sejam a mesma página so that qualquer ajuste valha para os dois e não existam duas telas divergentes.

**Why P1**: É a feature inteira; sem ela a duplicação continua.

**Acceptance Criteria** (each line is one EARS pattern):

1. WHEN uma rota tem dados de portal THEN the app SHALL renderizá-los pelo componente compartilhado `DiagnosticPortal`, com as seções Estágio, Radar, Barras, Respostas e análise (PORTALUN-01).
2. WHILE `analysisStatus` for `analisado` the portal SHALL exibir Concorrentes, Insights e Fontes; caso contrário SHALL exibir o `AnalysisPlaceholder` mantendo score, radar e respostas visíveis (PORTALUN-02).
3. WHERE o portal está em modo `manager`, WHEN o gerente clicar em um insight com `dimensao_ids` THEN as barras SHALL destacar exatamente esses ids e um controle "Limpar filtro" SHALL aparecer; em modo público o controle SHALL NOT ser renderizado (PORTALUN-03).
4. WHERE `onReprocess` for fornecido com status `falha` the placeholder SHALL renderizar o botão "Reprocessar" que invoca o callback; sem a prop o botão SHALL NOT aparecer (PORTALUN-04).
5. WHEN a rota do gerente renderiza com dados THEN a página SHALL mostrar nome, empresa e "Voltar ao painel"; a rota pública SHALL NOT renderizar "Voltar ao painel" (PORTALUN-05).
6. WHERE a rota é pública the página SHALL NOT renderizar "Copiar link cliente", "Revogar link" nem "Reprocessar" (PORTALUN-06).
7. IF o token público for inválido, expirado ou revogado THEN a página SHALL renderizar apenas o estado genérico "Link inválido ou expirado" sem dados do lead (PORTALUN-07).
8. IF a sessão do gerente não estiver autorizada THEN a página SHALL renderizar "Acesso não autorizado" com link para `/admin` e sem dados do lead (PORTALUN-08).

**Independent Test**: Abrir `/r/[token]` com token válido e `/admin/leads/[leadId]` autenticado; as duas telas mostram as mesmas seções, e só a do gerente mostra ações e filtro.

---

## Edge Cases

- IF `analysisStatus` for `analisado` mas `analysis`, `insights` ou `sources` vierem vazios THEN o portal SHALL renderizar os estados vazios dos componentes ("Sem concorrentes mapeados para este diagnóstico.", "Sem insights de análise para exibir.", "Sem fontes de mercado para exibir.").
- IF o lead não tiver link ativo (`share.active === false`) THEN a rota do gerente SHALL NOT renderizar "Revogar link".
- WHEN o status for `pendente` ou `processando` THEN o portal SHALL manter o diagnóstico visível durante o polling, sem bloquear a tela.

---

## Requirement Traceability

Each requirement gets a unique ID for tracking across design, tasks, and validation.

| Requirement ID | Story | Phase | Status |
| -------------- | ----- | ----- | ------ |
| PORTALUN-01 | P1: Uma página, dois acessos | - | Implementing |
| PORTALUN-02 | P1: Uma página, dois acessos | - | Implementing |
| PORTALUN-03 | P1: Uma página, dois acessos | - | Implementing |
| PORTALUN-04 | P1: Uma página, dois acessos | - | Implementing |
| PORTALUN-05 | P1: Uma página, dois acessos | - | Implementing |
| PORTALUN-06 | P1: Uma página, dois acessos | - | Implementing |
| PORTALUN-07 | P1: Uma página, dois acessos | - | Implementing |
| PORTALUN-08 | P1: Uma página, dois acessos | - | Implementing |

**ID format:** `PORTALUN-[NUMBER]`

**Status values:** Pending → In Design → In Tasks → Implementing → Verified

**Coverage:** 8 total, 0 mapped to tasks, 8 unmapped

---

## Success Criteria

- [ ] `src/app/r/[token]/page.tsx` e `src/app/admin/leads/[leadId]/page.tsx` só têm fetch, estados e ações; o layout vive em `DiagnosticPortal`.
- [ ] Suite existente passa sem testes removidos ou pulados, e os 8 critérios têm asserção rastreável.
- [ ] `npm run lint` e `npm run build` passam.
