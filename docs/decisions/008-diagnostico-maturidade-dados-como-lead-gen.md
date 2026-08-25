# ADR-008: Diagnóstico de Maturidade de Dados como formulário público de lead-gen

- **Data**: 2026-08-23
- **Status**: Aceito
- **Decisores**: Rafael (tech lead), time de produto
- **Tags**: product, lead-gen, formulário, scoring, LGPD

## Contexto e Declaração do Problema

A Rhema Data precisa gerar leads qualificados para o Diagnóstico 360° (produto pago, 64 perguntas). A estratégia é um formulário público de autoavaliação no site rhemadata.com: o visitante responde 12 perguntas (2 de contexto + 10 pontuadas), recebe um score reportado como faixa e um relatório em PDF por e-mail, e se torna um lead qualificado para o produto completo.

A fonte da verdade do conteúdo é o arquivo `docs/snapshot-maturidade-dados.json`, que define 10 dimensões, 5 níveis por dimensão, pesos (somam 100), faixas de score e regras de relatório. A avaliação é **autoavaliação determinística** — cada pergunta pontuada tem opções mapeadas diretamente a níveis (1–5) — e não uma avaliação interpretativa por LLM.

## Drivers da Decisão

- O JSON é contrato: o formulário deve ser renderizado a partir dele, sem perguntas hardcoded.
- O score nunca deve ser exibido como decimal — sempre a faixa (`formula` no JSON).
- A dimensão de menor nível deve ser destacada como principal exposição de risco.
- Desequilíbrio deve ser sinalizado quando a diferença entre maior e menor dimensão for > 3 níveis.
- O respondente recebe relatório em PDF com identidade Rhema Data por e-mail.
- As respostas devem ser persistidas para uso futuro em benchmark.
- LGPD: consentimento explícito antes de coletar o e-mail, com finalidade declarada.
- Abandono no meio do preenchimento não pode perder respostas já dadas.

## Opções Consideradas

1. **Formulário dirigido por contrato JSON + scoring determinístico** — as 10 perguntas pontuadas são renderizadas do JSON e cada opção carrega seu nível; o score é calculado por `soma(nivel * peso) / 100`.
2. **Perguntas hardcoded no código** — as 10 dimensões e opções escritas diretamente nos componentes.
3. **Reutilizar o harness LLM (Ollama) para avaliar as 12 respostas** — aplicar o mesmo pipeline do Diagnóstico 360° na triagem de lead-gen.

## Resultado da Decisão

Opção escolhida: **"Formulário dirigido por contrato JSON + scoring determinístico"**, porque o próprio JSON define o mapeamento pergunta→dimensão→nível e a fórmula exata do score, tornando o cálculo determinístico, auditável e barato. Alterar o conteúdo (perguntas, pesos, faixas) passa a ser mudança de dados, sem redeploy. O harness com LLM fica reservado ao Diagnóstico 360° pago, onde a análise interpretativa agrega valor; na triagem pública, um LLM adicionaria custo, latência e variabilidade sem ganho — a resposta do visitante já é o nível.

### Consequências Positivas

- Conteúdo vira contrato versionável: editar `snapshot-maturidade-dados.json` altera o formulário sem tocar em código.
- Scoring determinístico e rastreável, alinhado à regra do JSON (`faixas` e `regras_de_relatorio`).
- Reporting por faixa evita falsa precisão e conversa corretamente com o aviso metodológico do instrumento.
- Destaque da menor dimensão e sinalização de desequilíbrio são regras diretas do JSON, fáceis de implementar e testar.
- Respostas persistidas viabilizam benchmark futuro e calibragem dos pesos (o próprio JSON marca os pesos como hipóteses a revisar após 50+ respostas).
- Consentimento explícito + finalidade declarada atendem LGPD para captura de e-mail.

### Consequências Negativas

- Cria uma segunda trilha de avaliação no produto: determinística (lead-gen) vs. LLM (360°), com risco de scores divergentes entre o formulário público e o diagnóstico completo — exige comunicar ao lead que o resultado da triagem é preliminar.
- Persistência de respostas parciais (anti-abandono) exige estado de sessão/draft e tratamento de retomada.
- Envio de PDF depende do fluxo de e-mail (Resend), adicionando uma dependência de entrega fora do fluxo do formulário.
- Pesos e faixas são hipóteses de negócio não validadas estatisticamente — o contrato deve prever revisão periódica.

## Prós e Contras das Opções

### Formulário dirigido por contrato JSON + scoring determinístico ✅ Escolhida

- ✅ Fonte única de verdade para conteúdo e scoring.
- ✅ Cálculo determinístico, barato e auditável.
- ✅ Mudanças de conteúdo sem deploy.
- ✅ Regras de relatório (faixa, risco, desequilíbrio) mapeadas 1:1 do JSON.
- ❌ Segunda trilha de avaliação no produto — precisa de comunicação clara com o lead.
- ❌ Exige infra de persistência de draft e retomada.

### Perguntas hardcoded no código

- ✅ Sem camada extra de carregamento de contrato.
- ❌ Alterar pergunta, peso ou faixa exige deploy.
- ❌ Risco de divergência entre código e o JSON de referência.
- ❌ Regras de relatório espalhadas na lógica de componentes.

### Reutilizar o harness LLM (Ollama) na triagem pública

- ✅ Uma única trilha de avaliação no produto.
- ❌ Custo, latência e variabilidade de um LLM sem benefício — a resposta do visitante já é o nível.
- ❌ Score de triagem deixaria de ser determinístico e rastreável.
- ❌ Desnecessário para gerar o lead; o Diagnóstico 360° pago já oferece a profundidade interpretativa.

## Links

- [Contrato de conteúdo: `docs/snapshot-maturidade-dados.json`](../snapshot-maturidade-dados.json) — fonte da verdade de dimensões, pesos, faixas e regras de relatório
- [ADR-007: Adotar Arquitetura em Camadas no Backend](007-arquitetura-em-camadas-backend.md) — o scoring determinístico e o envio de PDF acontecem na camada Service
- [ADR-004: Usar @react-pdf/renderer](004-usar-react-pdf-renderer.md) — geração do relatório em PDF
- [ADR-002: Usar Resend para email](002-usar-resend-para-email.md) — envio do PDF ao respondente
- [ADR-001: Usar Supabase como datastore](001-usar-supabase-como-datastore.md) — persistência de respostas para benchmark
