# ADR-001: Usar Supabase (PostgreSQL gerenciado) como datastore

- **Data**: 2026-08-19
- **Status**: Aceito
- **Decisores**: Time de produto e engenharia
- **Tags**: banco de dados, armazenamento, infraestrutura

## Contexto e Declaração do Problema

A aplicação precisa persistir leads, tokens de acesso, diagnósticos e relatórios PDF. Além disso, o roadmap prevê uma futura camada de RAG (retrieval-augmented generation) para personalizar as análises por cliente, o que exige suporte a busca vetorial. O time quer minimizar a operação de infraestrutura e acelerar o deploy.

## Drivers de Decisão

- Deve suportar busca vetorial (pgvector) para a futura RAG.
- Deve reduzir a carga operacional de infraestrutura.
- Deve permitir armazenamento de arquivos (PDFs) próximo aos dados.
- Deve ser fácil de integrar com Next.js e com o fluxo de autenticação por token.

## Opções Consideradas

- Supabase (PostgreSQL gerenciado)
- PostgreSQL + Prisma (self-hosted / gerenciado)
- SQLite + Prisma

## Resultado da Decisão

Opção escolhida: **"Supabase (PostgreSQL gerenciado)"**, porque oferece PostgreSQL com suporte nativo a `pgvector` (viabilizando a futura RAG), Storage para os PDFs, autenticação e um SDK simples de integrar ao Next.js, tudo sem operar infraestrutura.

### Consequências Positivas

- Suporte a `pgvector` pronto para a futura camada de RAG.
- Storage de PDFs integrado, sem serviço separado.
- Redução da carga operacional (banco gerenciado).
- Integração simples com o ecossistema Next.js.

### Consequências Negativas

- Dependência de um provedor SaaS (lock-in parcial).
- Custo recorrente conforme o uso.
- Migrações e controle fino do banco ficam limitados ao que o Supabase expõe.

## Prós e Contras das Opções

### Supabase (PostgreSQL gerenciado) ✅ Escolhido

- ✅ Suporte nativo a `pgvector` para a futura RAG.
- ✅ Storage de arquivos e autenticação integrados.
- ✅ Baixa carga operacional.
- ❌ Lock-in parcial com o provedor.

### PostgreSQL + Prisma

- ✅ Controle total sobre o banco e migrações.
- ✅ Prisma oferece tipagem forte e migrações.
- ❌ Exige operar/manter a infraestrutura do banco.
- ❌ Vetores exigem configuração adicional do `pgvector`.

### SQLite + Prisma

- ✅ Simples e sem infraestrutura.
- ❌ Não atende bem à futura busca vetorial nem a concorrência.
- ❌ Migração posterior para Postgres seria necessária.

## Links

- [ADR-006: Adotar RAG com pgvector para personalizar análises](006-adotar-rag-com-pgvector.md)
