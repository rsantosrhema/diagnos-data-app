# ADR-007: Adotar Arquitetura em Camadas no Backend

- **Date**: 2026-08-21
- **Status**: Accepted
- **Deciders**: Rafael (tech lead)
- **Tags**: architecture, backend, security, layered-architecture

## Contexto e Problema

A aplicação Diagnóstico de Maturidade de Dados lida com dados sensíveis de governança de clientes e precisa de segurança e rastreabilidade desde o início. O Next.js (App Router) cobre frontend e backend num mesmo monólito, mas sem disciplina arquitetural a lógica de negócio, validação e acesso a dados tendem a se espalhar dentro de cada `route.ts`, criando endpoints impossíveis de auditar e expondo campos internos (hash de token, IDs) diretamente na resposta da API.

## Drivers da Decisão

- Segurança: dados sensíveis (tokens, scores de maturidade) não podem vazar para o client.
- Rastreabilidade: precisa existir um ponto único de logging de autenticação e autorização.
- Manutenibilidade: lógica de negócio concentrada em um lugar, não espalhada em handlers.
- Trocabilidade: acesso ao banco isolado para facilitar migração entre provedores (Neon → Supabase).
- Suporte a agentes de IA: cada camada com responsabilidade única evita que agentes (OpenCode) preencham lacunas com suposições divergentes.

## Opções Consideradas

1. **Arquitetura em camadas (layered, hexagonal-lite)** — Middleware → Route Handler → Service → Repository → DTOs.
2. **Monólito dentro do Route Handler** — cada endpoint concentra validação, regra de negócio e acesso a dados.
3. **Microsserviços** — serviços separados comunicando via HTTP/gRPC.

## Decisão

Opção escolhida: **Arquitetura em camadas (hexagonal-lite)** dentro do Next.js, com cinco responsabilidades bem definidas.

### Camadas

| Camada | Responsabilidade |
|--------|------------------|
| **Middleware** | Fronteira: valida token de acesso (single-use, hash, expiração), logging de tentativas inválidas, rate limiting por token. |
| **Route Handler / Server Action** | Entrada fina: recebe payload, valida formato e tipos com Zod, repassa ao Service. Zero regras de negócio. |
| **Service** | Coração: cálculo determinístico do score de maturidade (nunca delegado à IA), orquestração da persistência e scoring, geração do PDF, envio por email via Resend. |
| **Repository** | Única camada com acesso direto ao Postgres. Expondo métodos de domínio (`salvarRespostas`, `buscarSessao`) em vez de queries cruas. |
| **DTO / Domain Model** | Modelos de domínio e DTOs de resposta que filtram campos internos antes de qualquer dado sair do backend. |

### Rationale

A separação em camadas cria um boundary de validação e autorização único e auditável (Middleware), evita que segredos (API key da `INTERNAL_API_KEY`, connection string do Postgres) cheguem perto do client, e isola o acesso ao banco em um único ponto — facilitando trocar de provedor sem tocar em regra de negócio. Cada camada tem responsabilidade única e documentada desde o primeiro commit.

## Consequências Positivas

- **Auditoria simplificada**: Middleware é o único ponto de autenticação e logging — qualquer tentativa inválida é registrada uma única vez.
- **Segurança por design**: campos internos (hash, IDs, connection strings) nunca chegam ao client porque os DTOs fazem a filtragem antes da resposta.
- **Trocabilidade**: Repository isola Prisma/Drizzle — migrar de Neon para Supabase exige trocar apenas esta camada.
- **Testabilidade**: Service pode ser testado sem HTTP nem banco, usando mocks do Repository e de serviços externos (email/Supabase).
- **Consistência para agentes de IA**: responsabilidades claras impedem que um agente de código coloque lógica de negócio dentro de um `route.ts` por falta de contexto.

## Consequências Negativas

- **Mais arquivos e indireção**: cada endpoint exige pelo menos 3 arquivos (handler, service, repository) em vez de um único `route.ts`.
- **Disciplina contínua**: é necessário vigiar para que lógica de negócio não "vaze" de volta para o Route Handler em incrementos futuros.
- **Onboarding**: times futuros (ou agentes de IA) precisam ler esta ADR antes de adicionar novos endpoints, para manter a separação correta.

## Prós e Contras das Opções

### Arquitetura em camadas ✅ Escolhida

- ✅ Boundary único de autenticação e auditoria
- ✅ Isolamento de acesso ao banco
- ✅ Trocabilidade de provedores
- ✅ Testabilidade por camada
- ❌ Mais arquivos e complexidade estrutural
- ❌ Exige disciplina para manter a separação

### Monólito no Route Handler

- ✅ Simples — tudo num lugar
- ✅ Menos arquivos
- ❌ Lógica de negócio espalhada e duplicada
- ❌ Impossível auditar autenticação num ponto único
- ❌ Campos internos vazam facilmente para o client
- ❌ Acesso ao banco acoplado ao handler — trocar provedor exige reescrever cada endpoint

### Microsserviços

- ✅ Deploy independente por serviço
- ✅ Isolamento total de responsabilidade
- ❌ Overhead de infraestrutura desproporcionado para uma aplicação de diagnóstico
- ❌ Latência adicional de comunicação entre serviços
- ❌ Complexidade operacional sem benefício real neste estágio

## Links

- [ADR-004: Usar @react-pdf/renderer](004-usar-react-pdf-renderer.md) — a geração de PDF acontece na camada Service
- [ADR-003: Usar token de acesso único](003-usar-token-de-acesso-unico.md) — o Middleware implementa esta decisão
- [ADR-008: Diagnóstico de maturidade de dados como lead-gen](008-diagnostico-maturidade-dados-como-lead-gen.md) — o scoring determinístico e o envio de PDF acontecem na camada Service
