# ADR-009: Pipeline de agentes para insights de mercado no diagnóstico público

- **Data**: 2026-08-28
- **Status**: Aceito
- **Decisores**: Rafael (tech lead), time de produto e comercial
- **Tags**: product, agentes, market-insights, Exa, PDF, comercial

## Contexto e Declaração do Problema

O formulário público de lead-gen (ADR-008) produz, ao final, um relatório em PDF com a faixa de maturidade e a tabela de scores por dimensão, enviado ao time comercial. Esse relatório hoje é **puramente determinístico** — não contém contexto de mercado nem análise interpretativa.

O time comercial (closers, pessoas não-técnicas) precisa de material para **preparar a reunião** com o lead: entender se a dor de dados apontada pelo formulário também é dor do mercado no segmento/porte/faturamento daquela empresa, e conversar com fatos. Hoje isso depende de o comercial pesquisar manualmente ou improvisar na reunião.

O objetivo é: assim que os scores de maturidade forem calculados, disparar um **pipeline de agentes** que (1) pesquisa no Exa problemas de dados do segmento + porte + faturamento (+ concorrentes, quando houver nome), (2) correlaciona essa pesquisa com os resultados do formulário em uma análise criteriosa, e (3) formata até **10 bullets priorizados** (Alta/Média/Baixa) em linguagem clara e humana para o comercial. O PDF final deve incluir um **radar de aranha** (10 dimensões DAMA-DMBOK), os resultados e os bullets opinativos.

## Drivers da Decisão

- O comercial é **não-técnico**: bullets claros, em PT-BR, sem jargão, com prioridade Alta/Média/Baixa (quadrados de cantos arredondados: alta = vermelho, média = amarelo, baixa = azul).
- Latência aceitável: e-mail completo em **até 2–3 minutos** após o submit.
- O visitante **não pode esperar** pela análise — submit responde `{ ok: true }` imediatamente.
- Análise deve ser **especialista por segmento**, não generalista.
- Custo e falhas devem ser tratados com **fallback** e **reprocessamento**.
- A análise deve ser **auditável** (fontes persistidas no banco) e **reprocessável** (admin).

## Opções Consideradas

1. **Serviço CrewAI separado (Python/FastAPI)** — CrewAI nativo, isolamento completo, porém exige um deploy extra e interface HTTP entre Next e o serviço.
2. **Orquestração nativa no Next.js (TypeScript)** — sem framework de agentes; funções TS chamam a API LLM e o SDK/API do Exa diretamente. Zero infra extra, alinhado à stack atual.
3. **Supabase Edge Function (Deno)** — disparada por trigger de banco; simples, mas sem CrewAI e com limites de timeout/contexto.

### Decisão sobre o runtime

**Opção 2 — Orquestração nativa no Next.js.** A stack já é Next.js + TypeScript; os 3 "agentes" são funções puras com contratos de entrada/saída tipados (Zod), orquestradas por um `AgentOrchestrator`. Não há ganho em trazer Python/CrewAI para 3 agentes lineares e determinísticos de pipeline — o custo de infra (deploy separado, manutenção, observabilidade duplicada) supera o benefício das abstrações. Se no futuro o pipeline crescer para agentes com loops, memória e ferramentas dinâmicas, reavalia-se CrewAI.

## Resultado da Decisão

### Arquitetura geral (pós-submit, assíncrono)

```
submit /api/screener
  → score determinístico + persistência (fluxo atual, imediato)
  → enfileira análise em supabase_queue (worker) com payload { lead_id }
  → responde { ok: true } ao visitante (imediato)

worker (endpoint HTTP protegido por INTERNAL_API_KEY)
  → lê payload da fila
  → orquestra 3 agentes:
      1. ResearcherAgent  → Exa (chave no .env, chamada direta à API)
                           queries em paralelo: segmento, faturamento, porte, concorrentes
      2. AnalystAgent     → LLM + skill de segmento (híbrido: 5 skills, fallback genérico)
                           correlaciona pesquisa × scores → análise criteriosa da dor
      3. WriterAgent      → LLM → até 10 bullets priorizados (Alta/Média/Baixa)
                           linguagem clara e humana, PT-BR, fontes só no banco
  → persiste em market_insights (jsonb) + status
  → regenera PDF (radar + resultados + bullets) e envia e-mail ao comercial
  → marca diagnóstico 'analisado'
```

### Agentes (tipagem e responsabilidades)

| Agente | Responsabilidade | Entrada | Saída |
| --- | --- | --- | --- |
| **Researcher** | Pesquisa Exa: dores de dados do segmento, porte (funcionários) e faixa de faturamento; concorrentes prováveis quando houver nome da empresa | `agent_payload` (segmento, porte, faturamento, nome) | `MarketResearch` (queries consolidadas + sources) |
| **Analyst** | Correlaciona pesquisa × scores; valida se a dor da empresa também é dor de mercado; raciocínio guiado por skill do segmento | `MarketResearch` + scores | `MarketAnalysis` (dores confirmadas, contexto concorrentes) |
| **Writer** | Formata até 10 bullets priorizados em linguagem clara/humana | `MarketAnalysis` + scores | `InsightsBrief` (bullets com prioridade) |

- **LLM**: via API do Command Code / OllamaCloud (stack já adotada).
- **Skills de segmento**: híbrido — arquivos de conhecimento Markdown para os 5 segmentos principais (Indústria, Varejo, Serviços, Saúde, Finanças/Fintech) + prompt genérico de fallback para os demais (Educação, Governo, Agronegócio, Outro).
- **Exa**: `EXA_API_KEY` no `.env`; chamada direta à API Exa (não MCP, que é ferramenta de tool-calling no runtime interativo). 4 queries em paralelo consolidadas em payload JSON tipado.

### PDF final (comercial)

- **Radar de aranha** (10 eixos DAMA-DMBOK) desenhado com SVG manual no `@react-pdf/renderer` (sem lib extra), mostrando valências/deficiências.
- Resultados do formulário (faixa + tabela por dimensão) — fluxo atual.
- **Seção de concorrentes** (lista curta de 2–3 prováveis, 1 linha de contexto) quando houver nome da empresa; omitida caso contrário.
- **Bullets opinativos** (até 10) priorizados por nível de solução: Alta (vermelho), Média (amarelo), Baixa (azul) — quadrados de cantos arredondados.
- Fontes das pesquisas **só no banco** (auditoria), não no PDF que vai ao comercial.

### Critério de prioridade dos bullets

**Alta** = dimensão com nível baixo no formulário **E** dor confirmada no mercado (evidência Exa). **Média** = baixa maturidade OU dor de mercado isolada. **Baixa** = demais tópicos relevantes sem evidência forte.

### Fallback e reprocessamento

- Se o pipeline falhar (Exa/LLM fora do ar, timeout): envia o **PDF básico** (radar + tabela) **sem bullets** e marca o diagnóstico como `analise_pendente` para reprocessamento manual.
- **Admin**: endpoint no admin-proxy que re-dispara o pipeline de agentes para um lead com status `analise_pendente` (ou já analisado, para regenerar).

### Persistência

Nova tabela **`market_insights`** (jsonb), 1:1 com `diagnostics`/`leads`:
- payload dos 3 agentes (research, analysis, insights),
- bullets finais priorizados,
- `status` (`pendente` | `processando` | `analisado` | `falha`),
- fontes (URLs) para auditoria,
- `created_at` / `updated_at`.

### Enfileiramento assíncrono

**Supabase Queue** (`supabase_queue`) + **worker HTTP** (endpoint protegido por `INTERNAL_API_KEY`) para processar o payload pós-submit. O Next.js é stateless em serverless — não confiar em fire-and-forget; fila garante retry e evita perda em deploy/restart. Alternativas (DB trigger + edge function; fila externa Inngest/Trigger.dev) foram avaliadas; a fila do Supabase é a que menos adiciona infra e já vive na stack.

### Idioma

- Pesquisas Exa: português + inglês (maior cobertura de mercado).
- Análise, bullets e relatório: **PT-BR**, claro e humano para não-técnicos.

## Consequências Positivas

- Comercial chega à reunião com contexto de mercado e prioridades, em linguagem não-técnica.
- Bullets priorizados Alta/Média/Baixa direcionam o closer ao que mais dói e tem eco no mercado.
- Radar de aranha dá leitura visual das valências/deficiências por DAMA-DMBOK.
- Fontes persistidas no banco permitem auditoria e correção.
- Fallback garante que o e-mail nunca fica retido por falha de agente.
- Reprocessamento via admin recupera análises falhas sem deploy.
- Skills por segmento tornam a análise especialista, não generalista.

## Consequências Negativas

- Dependência de dois serviços externos no caminho crítico (Exa + LLM) — mitigada por fallback e fila com retry.
- Custo incremental por diagnóstico (chamadas Exa + LLM) — controlável limitando queries e tamanho dos prompts.
- A análise é interpretativa (LLM), diferente do score determinístico — o relatório deve deixar claro que bullets são contexto, não medição.
- Manter skills por segmento exige curadoria periódica do conteúdo.
- A fila do Supabase e o worker adicionam superfície de operação (monitorar fila, timeouts).

## Links

- [ADR-008: Diagnóstico de Maturidade de Dados como lead-gen](008-diagnostico-maturidade-dados-como-lead-gen.md) — o formulário e o scoring que este pipeline enriquece
- [ADR-007: Arquitetura em Camadas no Backend](007-arquitetura-em-camadas-backend.md) — o orquestrador vive na camada Service
- [ADR-004: Usar @react-pdf/renderer](004-usar-react-pdf-renderer.md) — radar + relatório final
- [ADR-001: Usar Supabase como datastore](001-usar-supabase-como-datastore.md) — fila e `market_insights`
- [Contrato de conteúdo: `docs/snapshot-maturidade-dados.json`](../snapshot-maturidade-dados.json) — dimensões, pesos e faixas usadas na análise
