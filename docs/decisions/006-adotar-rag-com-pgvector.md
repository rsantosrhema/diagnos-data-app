# ADR-006: Adotar RAG com pgvector para personalizar análises

- **Data**: 2026-08-19
- **Status**: Proposto
- **Decisores**: Time de produto e engenharia
- **Tags**: IA, RAG, banco vetorial, roadmap

## Contexto e Declaração do Problema

O objetivo de longo prazo é que as análises não sejam genéricas, mas focadas em cada cliente. Para isso, o fluxo de integração com a IA deve aproveitar o histórico de diagnósticos anteriores e contexto específico de cada cliente. Isso aponta para uma camada de RAG (retrieval-augmented generation) sobre um banco vetorial.

## Drivers de Decisão

- Deve personalizar as análises por cliente, evitando resultados genéricos.
- Deve aproveitar diagnósticos anteriores como contexto.
- Deve integrar-se ao datastore já escolhido (Supabase/PostgreSQL).

## Opções Consideradas

- RAG com pgvector no Supabase
- Banco vetorial dedicado (ex.: Pinecone, Weaviate)
- Sem RAG (apenas prompts estáticos)

## Resultado da Decisão

Opção escolhida: **"RAG com pgvector no Supabase"**, porque o Supabase já foi adotado (ADR-001) e suporta `pgvector`, permitindo armazenar embeddings e fazer busca vetorial sem adicionar um serviço externo. Esta decisão é **proposta** e será implementada em uma fase futura, após o MVP ponta-a-ponta.

### Consequências Positivas

- Análises mais personalizadas e contextualizadas por cliente.
- Reuso do datastore existente, sem novo serviço.
- Base pronta para evoluir o fluxo de integração com a IA.

### Consequências Negativas

- Complexidade adicional (geração e armazenamento de embeddings).
- Custo de armazenamento e de chamadas de embedding.
- Requer curadoria do contexto para evitar ruído nas análises.

## Prós e Contras das Opções

### RAG com pgvector no Supabase ✅ Escolhido

- ✅ Integra-se ao datastore já adotado.
- ✅ Sem serviço externo adicional.
- ✅ Personaliza as análises.
- ❌ Complexidade e custo de embeddings.

### Banco vetorial dedicado

- ✅ Escala e recursos avançados de busca vetorial.
- ❌ Serviço adicional a operar e integrar.
- ❌ Custo e complexidade maiores.

### Sem RAG (prompts estáticos)

- ✅ Simples e barato.
- ❌ Análises genéricas, sem personalização por cliente.

## Links

- [ADR-001: Usar Supabase como datastore](001-usar-supabase-como-datastore.md)
- Roadmap: fase futura, após o MVP ponta-a-ponta.
