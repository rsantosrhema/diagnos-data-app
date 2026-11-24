# Insights: distribuição de prioridades e ocultação do próximo passo

## Problem Statement

O brief de insights tem prioridades altas e médias demais e quase nenhuma baixa. O link do cliente expõe o "Próximo passo", que é roteiro de abordagem comercial.

## Goals

- [ ] Insights limitados a 3 altas, 5 médias e 5 baixas.
- [ ] Cliente não recebe `proximo_passo`; gerente continua recebendo.

## Out of Scope

| Feature | Reason |
| --- | --- |
| Remover `proximo_passo` da geração | Gerente continua usando |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --- | --- | --- | --- |
| Excedente de prioridade | Rebaixa um nível; baixa acima de 5 é descartada | Não perde insight forte | y |
| Ordem dentro do grupo | Ordem original do LLM; rebaixados vão ao fim do grupo destino | Estável e previsível | y |
| Dados antigos | Normalizados na leitura do portal | Sem reprocessar leads | y |

**Open questions:** none - all resolved or logged above.

---

## User Stories

### P1: Distribuição 3/5/5 ⭐ MVP

**User Story**: As a gerente comercial, I want insights balanceados so that o relatório não seja dominado por prioridades altas.

**Acceptance Criteria**:

1. The system SHALL limitar o brief a no máximo 3 bullets alta, 5 média e 5 baixa, em ordem alta, média, baixa.
2. WHEN houver mais de 3 altas THEN the system SHALL rebaixar as excedentes para média, e as médias excedentes para baixa.
3. IF houver mais de 5 baixas após o rebaixamento THEN the system SHALL descartar as excedentes.
4. WHEN o writer gerar o brief THEN the system SHALL aplicar a normalização antes de validar o schema de no máximo 13 bullets.
5. WHEN o portal montar os insights THEN the system SHALL aplicar a mesma normalização aos insights já gravados.
6. WHEN o PDF listar insights THEN the system SHALL ordenar por prioridade antes de limitar a 4 bullets.

### P1: Próximo passo oculto do cliente ⭐ MVP

**User Story**: As a gerente comercial, I want que o cliente não veja o próximo passo so that a abordagem comercial fique interna.

**Acceptance Criteria**:

1. WHEN o portal é lido pelo token público THEN the system SHALL omitir `proximo_passo` de todos os bullets.
2. WHEN o portal é lido pelo gerente THEN the system SHALL manter `proximo_passo`.

## Requirement Traceability

| Requirement ID | Story | Status |
| --- | --- | --- |
| INS-01..06 | P1 Distribuição | Done |
| INS-07..08 | P1 Próximo passo | Done |
