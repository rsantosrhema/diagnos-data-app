# ADR-011: DAMA-DMBOK2 como base metodológica única do diagnóstico

- **Data**: 2026-11-24
- **Status**: Aceito
- **Decisores**: Rafael (tech lead), time de produto e comercial
- **Tags**: metodologia, DAMA-DMBOK2, scoring, faixas, PDF, portal

## Contexto e Declaração do Problema

O diagnóstico misturava três referências: DAMA-DMBOK, DCAM e uma escala "CMMI-like". O portal rotulava o resultado como "CMMI", o que não se sustenta numa conversa de venda. Nenhuma das três era citada de forma consistente no contrato, no PDF ou no portal.

As faixas de estágio também mudavam de limite por segmento: cada entrada de `recalibrated_bands` em `docs/scoring-calibration.json` tinha `min`/`max` próprios. O mesmo score caía em estágios diferentes conforme o setor, e o portal podia exibir uma faixa que contradizia o score. Nenhum diagnóstico foi enviado a cliente ainda, então esta é a janela para alinhar o instrumento a uma referência única sem mudar sua estrutura.

## Drivers da Decisão

- Uma referência metodológica defensável em venda, sem mistura de modelos.
- A mesma régua de estágio para todos os segmentos, para comparar clientes.
- Manter a diferenciação setorial já calibrada (pesos), sem migração de dados, mudança de fórmula ou rotas novas.
- PDF e portal dizendo a mesma coisa.

## Opções Consideradas

1. **Manter o híbrido DMBOK + DCAM + "CMMI-like"**: sem custo de mudança, mas indefensável. O rótulo "CMMI" não corresponde à escala usada e nenhuma das referências é citada de forma consistente.
2. **Adotar DCAM como referência**: conhecido no mercado de data management, porém o questionário, as dimensões e as faixas já foram desenhados sobre as áreas de conhecimento do DMBOK. A troca exigiria reescrever o instrumento.
3. **Adotar DAMA-DMBOK2 (cap. 15) como referência única**: alinhado ao que o instrumento já mede (10 áreas de conhecimento), com escala de maturidade publicada e sem reescrever perguntas.

**Decisão: opção 3.**

## Resultado da Decisão

### Referência única

DAMA-DMBOK2, capítulo 15 (Data Management Maturity Assessment), é a única referência metodológica do diagnóstico. Contrato (`docs/snapshot-maturidade-dados.json`), PDF e portal não citam outro modelo, e as menções a "CMMI", "DCAM" e "DMM" saem do texto exibido ao cliente.

### Dimensões e áreas de conhecimento

As 10 dimensões do contrato mapeiam as áreas de conhecimento do DMBOK2 no campo `area_dmbok`:

| Dimensão | `area_dmbok` |
| --- | --- |
| Governança e Responsabilidade | Data Governance |
| Patrocínio Executivo e Business Case | Data Governance (Data Strategy) |
| Arquitetura e Integração | Data Architecture / Data Integration |
| Qualidade de Dados | Data Quality |
| Metadados e Rastreabilidade | Metadata Management |
| Dados Mestres e Cadastros | Reference & Master Data |
| Segurança e Conformidade (LGPD) | Data Security |
| Consumo e Autonomia Analítica | Data Warehousing & BI |
| IA, Modelos e Analytics Avançado | Big Data & Data Science |
| Time e Capacidade | Data Management Organization & Role Expectations |

### Escala de níveis

1 Inicial · 2 Repetível · 3 Definido · 4 Gerenciado · 5 Otimizado (`meta.escala_niveis`), mapeada 1:1 nos níveis 1 a 5 que as perguntas já usavam.

### Score e faixas

A fórmula não muda: `score_final = Σ(nivel_dimensão × peso_dimensão) / 100`.

As 5 faixas de estágio usam sempre os limites de `contract.scoring.faixas`, para todo segmento:

| Estágio | Limites |
| --- | --- |
| Inicial | [1.0, 1.8) |
| Emergente | [1.8, 2.6) |
| Estruturado | [2.6, 3.4) |
| Gerenciado | [3.4, 4.2) |
| Otimizado | [4.2, 5.0] |

Os `min`/`max` de `recalibrated_bands` deixam de classificar. O texto setorial sobrevive como `descricao` da faixa de mesmo `rotulo`; sem entrada para o segmento, vale a descrição do contrato. O schema da calibração não muda, para manter válidas as versões já gravadas em `scoring_versions`.

### Diferenciação setorial

Vem só dos pesos: multiplicadores de segmento e porte em `docs/scoring-calibration.json`, aplicados sobre os `base_weight` e normalizados para inteiros que somam 100. O peso de cada dimensão no setor do cliente aparece no PDF e no portal, comparado ao peso padrão.

### Posicionamento do índice

"Índice proprietário da Rhema Data, estruturado sobre as áreas de conhecimento do DAMA-DMBOK2 e sua abordagem de avaliação de maturidade (cap. 15), com pesos ajustados ao segmento e ao porte da empresa. Instrumento de triagem por autoavaliação; não é certificação."

### Textos ao cliente

`src/lib/maturity/methodology.ts` é a fonte única: `INDEX_LABEL`, `SCALE_LEGEND`, `METHOD_NOTE`, `formatWeight`, `formatScore`, `describeDimension`. PDF e portal consomem o módulo; não hardcodam escala, peso ou nota.

### O que permanece proprietário

Ficam fora do DMBOK2, como ativo da Rhema: o índice (nome, as 10 dimensões e a redação de perguntas e opções), os pesos base, os multiplicadores por segmento e porte, as faixas e suas descrições, e os textos setoriais dos estágios. O DMBOK2 fornece a referência metodológica e a escala de níveis; não fornece os pesos nem o questionário.

## Consequências Positivas

- Referência única e citável; "CMMI" e "DCAM" saem do texto ao cliente.
- Mesmo score, mesmo estágio em qualquer setor; o portal deixa de contradizer a faixa.
- Sem migração de dados, mudança de fórmula, rota nova ou dependência nova.
- Textos de método centralizados: PDF e portal não divergem.
- O peso setorial visível no PDF e no portal torna a calibração auditável pelo cliente.

## Consequências Negativas

- A calibração setorial passa a influenciar só o peso; diferenciação de limites por setor exigiria nova decisão.
- Os `min`/`max` de `recalibrated_bands` ficam inertes na classificação, mantidos apenas por compatibilidade de schema.
- Expor o peso das dimensões revela as hipóteses de negócio da calibração, ainda não validadas estatisticamente.

## Links

- [ADR-008: Diagnóstico de Maturidade de Dados como lead-gen](008-diagnostico-maturidade-dados-como-lead-gen.md) - o instrumento e o scoring
- [ADR-007: Arquitetura em Camadas no Backend](007-arquitetura-em-camadas-backend.md) - onde vivem scoring e apresentação
- [ADR-004: Usar @react-pdf/renderer](004-usar-react-pdf-renderer.md) - o PDF que passa a citar o DMBOK2
- [Contrato: `docs/snapshot-maturidade-dados.json`](../snapshot-maturidade-dados.json)
- [Calibração: `docs/scoring-calibration.json`](../scoring-calibration.json)
