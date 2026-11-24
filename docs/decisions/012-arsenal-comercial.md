# ADR-012: Arsenal Comercial gerado por agente e restrito ao gerente

- **Data**: 2026-11-24
- **Status**: Aceito
- **Decisores**: Rafael (tech lead), time comercial
- **Tags**: agentes, PDF, pipeline, SPIN Selling, confidencialidade, catálogo

## Contexto e Declaração do Problema

O PDF que o gerente baixa no admin e recebe por e-mail entrega o diagnóstico e a análise de mercado, mas não ajuda a conduzir a reunião de venda. O vendedor monta à mão os pontos de pauta, o contorno das objeções prováveis, o serviço a ofertar e as perguntas de descoberta, sem padrão e sem usar o que o diagnóstico já respondeu. O material ainda circula por caminhos informais, longe do relatório.

## Drivers da Decisão

- Um único arquivo para a reunião: diagnóstico e material de condução no mesmo PDF.
- Conteúdo derivado do diagnóstico, da análise e dos insights, não de improviso.
- Falha do material extra nunca pode derrubar o relatório que já está em produção.
- Estratégia de venda e objeções prováveis não circulam para o cliente.

## Opções Consideradas

1. **Gerar o Arsenal no clique de "Exportar PDF", sem persistir.** Sem migration, porém exige LLM a cada download, o conteúdo muda de uma vez para outra e o e-mail passa a divergir do download.
2. **Tabela própria com job separado.** Permite versionar e regenerar isolado, ao custo de fila, status e RLS para um valor que é 1:1 com o lead.
3. **Etapa `commercial` no pipeline do worker, depois do writer, com o resultado em `market_insights.arsenal`.**

**Decisão: opção 3.**

## Resultado da Decisão

- O worker roda o agente comercial (skill SPIN em `docs/agents/skills/comercial/spin-selling.md`) depois do writer e persiste o Arsenal em `market_insights.arsenal` (jsonb), na mesma operação que grava `analysis` e `insights`.
- O agente recebe o payload do screener, a análise, os insights, o catálogo de serviços (`docs/comercial/servicos.json`) e os grupos de objeção (`docs/comercial/objecoes.json`), ambos validados por Zod no load. Trocar o catálogo é mudança de dado, não de código.
- O PDF ganha 3 páginas internas depois do diagnóstico: pontos-chave, serviço ideal, contorno de objeções e 10 perguntas SPIN. O worker e o download do admin montam o input pelo mesmo `buildPdfInput`, então o conteúdo é idêntico nos dois caminhos.
- Falha do agente é isolada: log `arsenal_failed`, `arsenal = null`, PDF sai sem o Arsenal, o status continua `analisado` e não há retry de job.
- A migration `0019_market_insights_arsenal.sql` adiciona a coluna `arsenal jsonb` e libera os steps `arsenal` e `arsenal_failed` em `analysis_job_logs`.

## Consequências

- Cada relatório passa a ter uma chamada extra de LLM (até 3 tentativas internas de schema), dentro do visibility timeout de 600 s da fila.
- Enquanto o catálogo estiver com `status: "rascunho"`, o PDF mostra a nota "Catálogo de serviços preliminar: validar antes de ofertar". A nota some quando o dono enviar o catálogo oficial e o status virar `aprovado`.
- O Arsenal é material interno: sai apenas no PDF (download do admin e e-mail ao comercial). Nunca aparece no portal `/r`, no `portal-service` nem em rota pública.
- Regenerar o relatório refaz o Arsenal junto. O campo é sempre sobrescrito, com o novo valor ou `null`, para nunca misturar diagnóstico novo com Arsenal antigo.
