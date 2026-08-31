# ADR-003: Usar token de acesso único para autenticação do diagnóstico

- **Data**: 2026-08-19
- **Status**: Superseded por remoção do fluxo de token (migration `0008_remove_token_flow`, 2026-08-31)
- **Decisores**: Time de produto e engenharia
- **Tags**: autenticação, segurança, fluxo comercial

> **⚠️ SUPERSEDED — Não aplicar.** Este ADR descreve o fluxo antigo de token de acesso, removido do produto. O fluxo atual: o lead se cadastra na landing page e inicia o diagnóstico direto, sem token nem sessão (`docs/decisions/` não contém ADR substituto dedicado — a mudança foi registrada na migration `0008_remove_token_flow` e nos docs `architecture.md` / `data-model.md` / `security.md`). O bloqueio de reenvio passou a ser por email único (constraint `leads.email` + 409 quando o diagnóstico já foi concluído). Este documento é mantido apenas por razões históricas.

## Contexto e Declaração do Problema

O fluxo de acesso é: o cliente pede acesso na landing page, o time comercial entra em contato e gera um token, e o cliente usa esse token para abrir a aplicação e responder o formulário. Cada cliente realiza um único diagnóstico. O token precisa ser simples de gerar pelo time comercial e seguro contra reuso.

## Drivers de Decisão

- Deve permitir um único diagnóstico por cliente (one-time).
- Deve ser simples de gerar e enviar pelo time comercial.
- Deve ser seguro (nunca armazenar o token em texto puro).
- Deve ser fácil de validar no backend Next.js.

## Opções Consideradas

- Token de acesso único (hash, consumido no primeiro uso)
- JWT com expiração
- Sessão + login com email/senha

## Resultado da Decisão

Opção escolhida: **"Token de acesso único"**, porque o fluxo atual prevê um diagnóstico por cliente. O token é gerado aleatoriamente, armazenado apenas como hash (SHA-256) no banco, e marcado como usado após o primeiro acesso bem-sucedido, impedindo reuso.

### Consequências Positivas

- Simples de gerar e enviar pelo time comercial.
- Seguro: o token em texto puro nunca é persistido.
- Impede reuso, alinhado ao modelo de um diagnóstico por cliente.
- Fácil de validar no backend.

### Consequências Negativas

- Se o cliente não concluir o diagnóstico de uma vez, o token já foi consumido e precisa de novo token.
- Sem expiração automática por padrão (pode ser adicionada via `expires_at`).

## Prós e Contras das Opções

### Token de acesso único ✅ Escolhido

- ✅ Simples e alinhado ao fluxo de um diagnóstico por cliente.
- ✅ Seguro (hash armazenado, nunca texto puro).
- ✅ Impede reuso.
- ❌ Não permite retomar um diagnóstico interrompido sem novo token.

### JWT com expiração

- ✅ Permite reuso até expirar.
- ✅ Assinado e com validade.
- ❌ Mais complexo de gerar/validar.
- ❌ Permite múltiplos usos, o que não é necessário no fluxo atual.

### Sessão + login

- ✅ Mais robusto para reuso e múltiplos diagnósticos.
- ❌ Complexidade desnecessária para o fluxo atual.
- ❌ Exige gestão de credenciais e recuperação de senha.

## Links

- [ADR-001: Usar Supabase como datastore](001-usar-supabase-como-datastore.md)
