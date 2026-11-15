# Localização da Empresa para Busca de Concorrentes Specification

## Problem Statement

A busca de concorrentes do pipeline de agentes (`researcher` via Exa) usa só o nome da empresa (`"{nome} concorrentes análise de dados"`), o que devolve resultados genéricos e frequentemente de outras regiões. O gerente comercial precisa de concorrentes reais da mesma praça da empresa diagnosticada. Cidade e Estado entram no cadastro do lead como contexto de busca, e aparecem como informação auxiliar no portal e no PDF.

## Goals

- [ ] O cadastro da landing coleta Estado (select de UF) e Cidade (select dependente do Estado), ambos obrigatórios, e os persiste no lead.
- [ ] A query de concorrentes do `researcher` inclui Cidade e Estado quando existem, e o `analyst` recebe a localização como restrição de relevância.
- [ ] Portal (gerente e cliente) e PDF exibem "Cidade/UF" da empresa como informação auxiliar.
- [ ] Leads antigos, sem localização, continuam processando com o comportamento atual da busca.

## Out of Scope

| Feature | Reason |
| --- | --- |
| Estimar ou exibir nível de maturidade de dados dos concorrentes | Decisão do usuário: o objetivo é melhorar a busca de concorrentes; a etapa de concorrentes já traz as informações do Exa. |
| Filtrar ou ranquear concorrentes por distância geográfica | A localização refina a query e o prompt; não há geocodificação. |
| Coletar localização no contrato do screener (`docs/snapshot-maturidade-dados.json`) | Decisão do usuário: coleta na landing, junto ao cadastro do lead. |
| Backfill de localização em leads existentes | Leads antigos permanecem sem localização; não há fonte confiável. |
| Localização nas seções de segmento, faturamento e porte da pesquisa | O ganho pedido é só na busca de concorrentes. |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --- | --- | --- | --- |
| Obrigatoriedade | Estado e Cidade obrigatórios no cadastro novo; colunas nullable no banco | Decisão do usuário (obrigatórios); nullable preserva leads existentes sem migração destrutiva. | y |
| Fonte da lista de cidades | API de localidades do IBGE (`servicodados.ibge.gov.br/api/v1/localidades/estados/{UF}/municipios`) | Decisão do usuário: "use uma api ou algo já pronto"; fonte oficial, gratuita e sem chave. | y |
| Onde a API do IBGE é chamada | Server-side, por uma rota `/api/public-proxy/localidades`, com cache em memória por UF | CSP `connect-src` do projeto não permite domínios externos no browser; mantém o padrão "frontend só chama proxy"; evita expor o cliente ao IBGE. | n |
| Lista de Estados | Constante local com as 27 UFs (sigla e nome), sem chamada de rede | Lista estável; deixa o select de Estado funcional se o IBGE cair. | n |
| Validação no servidor | `uf` deve estar entre as 27 siglas; `cidade` é string aparada de 2 a 80 caracteres, sem `<` e `>` | Dado não confiável entra por `.strict()` Zod; a verificação de pertencimento da cidade à UF fica na UI, pois a API do IBGE pode estar indisponível. | n |
| Falha da API do IBGE na UI | O select de Cidade vira campo de texto livre, mantendo o requisito de obrigatório | O cadastro é porta de entrada de leads; uma dependência externa não pode bloqueá-lo. | n |
| Lead pendente reaproveitado por e-mail duplicado | Atualiza `city` e `state` do lead pendente com os valores enviados | Mantém a localização coerente com o último envio, como já acontece com os demais campos. | n |
| Contrato de busca | `empresa.cidade` e `empresa.estado` no `agent_payload`, ambos nullable | Reaproveita o payload que os agentes já consomem; `agentPayloadSchema` aceita leads antigos. | y |
| Persistência no payload | A localização do lead é injetada ao montar o `agent_payload` no submit do screener | O screener resolve o lead antes de montar o payload (`screen-service`), sem nova consulta. | n |
| Texto de localização nas queries | Dados do usuário passam por `sanitizeUntrusted` antes de entrarem em query ou prompt | O módulo já protege campos do lead contra prompt injection. | y |
| Exibição | "Cidade/UF" ao lado do nome da empresa no `DiagnosticPortal` e na capa do PDF, quando existir | Decisão do usuário: componente auxiliar, sem destaque novo. | y |

**Open questions:** none - all resolved or logged above.

---

## User Stories

### P1: Cadastro com Estado e Cidade ⭐ MVP

**User Story**: As a visitante da landing, I want informar Estado e Cidade da minha empresa so that o diagnóstico considere minha região.

**Why P1**: Sem o dado coletado e persistido, nada a jusante funciona.

**Acceptance Criteria**:

1. WHEN o visitante carrega o formulário da landing THEN the system SHALL exibir um select de Estado com as 27 UFs e um select de Cidade desabilitado.
2. WHEN o visitante escolhe um Estado THEN the system SHALL carregar os municípios dessa UF, habilitar o select de Cidade e limpar qualquer Cidade selecionada antes.
3. IF o visitante envia o formulário sem Estado ou sem Cidade THEN the system SHALL exibir erro de campo obrigatório e não chamar o servidor.
4. WHEN o formulário é enviado com `state` e `city` válidos THEN the system SHALL persistir ambos no lead criado.
5. IF o corpo enviado a `/api/leads` tem `state` fora das 27 UFs ou `city` vazia, com mais de 80 caracteres ou com `<`/`>` THEN the system SHALL responder 400 com `{ error: "Dados inválidos", issues }`.
6. IF a API do IBGE falha ou excede o tempo limite THEN the system SHALL exibir a Cidade como campo de texto livre obrigatório.
7. WHEN um e-mail com lead pendente é reenviado com outra localização THEN the system SHALL atualizar `city` e `state` do lead existente e reutilizá-lo.
8. The system SHALL expor a lista de municípios apenas pela rota `/api/public-proxy/localidades`, com rate limiting e sem chamar o IBGE a partir do browser.

**Independent Test**: Abrir `/`, escolher SP e ver municípios de SP; trocar para RJ e ver a Cidade limpa; enviar sem Cidade e ver o erro; enviar completo e conferir `leads.city`/`leads.state` no banco.

---

### P1: Busca de concorrentes com localização ⭐ MVP

**User Story**: As a gerente comercial, I want que a busca de concorrentes use a cidade e o estado da empresa so that eu veja concorrentes reais da região.

**Why P1**: É o objetivo da feature: resultado de busca menos genérico.

**Acceptance Criteria**:

1. WHEN o submit do screener monta o `agent_payload` THEN the system SHALL incluir `empresa.cidade` e `empresa.estado` do lead.
2. WHEN `empresa.nome`, `empresa.cidade` e `empresa.estado` existem THEN the `researcher` SHALL montar a query da seção `concorrentes` com nome, cidade e UF.
3. WHEN `empresa.cidade` ou `empresa.estado` é nulo THEN the `researcher` SHALL montar a query de concorrentes exatamente como hoje, só com o nome.
4. WHEN existe localização THEN the `analyst` SHALL receber no prompt a instrução de priorizar concorrentes que atuam na cidade/UF da empresa e de marcar no `contexto` quando o concorrente for de outra região.
5. The system SHALL passar cidade e estado por `sanitizeUntrusted` antes de usá-los em query ou prompt.
6. IF o `agent_payload` de um lead antigo não tem `empresa.cidade`/`empresa.estado` THEN the system SHALL validá-lo sem erro e processar a análise normalmente.

**Independent Test**: Rodar o `researcher` com payload com localização e conferir a query enviada ao Exa; rodar sem localização e conferir a query antiga.

---

### P2: Localização visível no portal e no PDF

**User Story**: As a gerente comercial, I want ver Cidade/UF da empresa no portal e no PDF so that eu confira a base usada na busca de concorrentes.

**Why P2**: Transparência sobre o contexto da busca; não bloqueia o MVP.

**Acceptance Criteria**:

1. WHEN o lead tem cidade e estado THEN the `DiagnosticPortal` SHALL exibir "Cidade/UF" junto ao nome do solicitante, nos modos `public` e `manager`.
2. WHEN o lead tem cidade e estado THEN the PDF SHALL exibir "Cidade/UF" na capa, junto à empresa.
3. WHEN o lead não tem localização THEN the `DiagnosticPortal` and the PDF SHALL omitir a linha, sem texto de placeholder.
4. The `PortalDTO` público SHALL expor apenas `city` e `state` do lead, sem nenhum outro dado novo.

**Independent Test**: Abrir o portal de um lead com localização e ver "São Paulo/SP"; abrir o de um lead antigo e ver o layout atual.

---

## Edge Cases

- IF o município tem acento ou nome composto ("São José do Rio Preto") THEN the system SHALL preservá-lo exatamente como veio da lista, sem normalizar.
- IF duas cidades de UFs diferentes têm o mesmo nome THEN the system SHALL distingui-las pela UF no select e na query.
- WHEN o usuário abre o formulário com rascunho em `sessionStorage` sem localização THEN the system SHALL exigir Estado e Cidade antes de enviar.
- IF a API do IBGE responde com payload fora do formato esperado THEN the system SHALL tratar como falha e usar o campo de texto livre.

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| --- | --- | --- | --- |
| LOC-01 | P1: Cadastro com Estado e Cidade | Design | Pending |
| LOC-02 | P1: Cadastro com Estado e Cidade | Design | Pending |
| LOC-03 | P1: Cadastro com Estado e Cidade | Design | Pending |
| LOC-04 | P1: Cadastro com Estado e Cidade | Design | Pending |
| LOC-05 | P1: Cadastro com Estado e Cidade | Design | Pending |
| LOC-06 | P1: Cadastro com Estado e Cidade | Design | Pending |
| LOC-07 | P1: Cadastro com Estado e Cidade | Design | Pending |
| LOC-08 | P1: Cadastro com Estado e Cidade | Design | Pending |
| LOC-09 | P1: Busca de concorrentes com localização | Design | Pending |
| LOC-10 | P1: Busca de concorrentes com localização | Design | Pending |
| LOC-11 | P1: Busca de concorrentes com localização | Design | Pending |
| LOC-12 | P1: Busca de concorrentes com localização | Design | Pending |
| LOC-13 | P1: Busca de concorrentes com localização | Design | Pending |
| LOC-14 | P1: Busca de concorrentes com localização | Design | Pending |
| LOC-15 | P2: Localização visível no portal e no PDF | Design | Pending |
| LOC-16 | P2: Localização visível no portal e no PDF | Design | Pending |
| LOC-17 | P2: Localização visível no portal e no PDF | Design | Pending |
| LOC-18 | P2: Localização visível no portal e no PDF | Design | Pending |

**Coverage:** 18 total, 0 mapped to tasks, 18 unmapped ⚠️

---

## Success Criteria

- [ ] 100% dos leads novos têm `city` e `state` preenchidos e válidos.
- [ ] A query de concorrentes de um lead com localização contém cidade e UF; a de um lead antigo permanece idêntica à atual.
- [ ] Nenhum teste existente de leads antigos quebra.
