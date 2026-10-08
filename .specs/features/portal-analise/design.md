# Portal Resultado da Análise Design

**Spec**: `.specs/features/portal-analise/spec.md`
**Status**: Draft

---

## Architecture Overview

Portal aditivo sobre o pipeline existente. Nenhuma rota, serviço ou tabela atual muda de comportamento; o portal apenas lê `leads`, `diagnostics`, `assessment_responses` e `market_insights` através de um novo serviço, e adiciona uma tabela `share_tokens` para o link público.

```mermaid
graph TD
    subgraph Gerente
        A[/admin tabela] -->|Ver resultado| B[/admin/leads/[leadId]]
        B --> C[GET /api/admin-proxy/portal/[leadId]]
        C --> D[GET /api/admin/portal/[leadId]]
        A -->|Copiar link| E[POST /api/admin-proxy/portal/[leadId]/share]
        E --> F[POST /api/admin/portal/[leadId]/share]
    end
    subgraph Cliente
        G[/r/[token]] --> H[GET /api/public-proxy/portal/[token]]
        H --> I[GET /api/portal/[token]]
    end
    D --> J[portalService.getForManager]
    F --> K[portalService.createShareToken]
    I --> L[portalService.getByToken]
    J --> M[(leads + diagnostics + assessment + insights)]
    L --> M
    K --> N[(share_tokens)]
    L --> N
```

Fluxo de dados por portal (ambas as visões): `portalService` carrega as 4 linhas 1:1 do lead, valida `agent_payload` com `agentPayloadSchema` e `analysis/insights/research` com os schemas de `agents/types.ts`, monta o `PortalDTO` e devolve. A visão pública aplica `stripPii` (remove email/telefone) antes de responder.

---

## Code Reuse Analysis

### Existing Components to Leverage

| Component | Location | How to Use |
| --------- | -------- | ---------- |
| `RadarChart` math (`polarPoint`, `clampLevel`, `RADAR_LEVELS`, `SIZE/RADIUS`, cores) | `src/lib/report/radar-chart.ts` | Portar a matemática para SVG React (`RadarSpider`); mesmas constantes para paridade visual com o PDF |
| `AdminDashboardResponseDTO` / `MarketInsightsStatus` | `src/lib/dto/admin.ts`, `src/lib/repository/market-insights-repo.ts` | Reusar tipos de status no `PortalDTO`; não duplicar union |
| `agentPayloadSchema` | `src/lib/schemas/agent-payload.ts` | Validar `assessment_responses.agent_payload` antes de montar o DTO (mesmo padrão do worker) |
| `marketAnalysisSchema`, `insightsBriefSchema`, `marketResearchSchema` | `src/lib/agents/types.ts` | Validar `market_insights.{analysis,insights,research}` com `safeParse`; registros antigos sem campos novos continuam válidos (campos novos sempre `.optional()`) |
| `verifyInternalApiKey` (hash + `timingSafeEqual`) | `src/lib/auth/internal-key.ts` | Mesmo padrão para comparar `token_hash` (hash SHA-256 antes de comparar) |
| `requireManager` + `unauthorized` | `src/lib/auth/guard.ts` | Auth das rotas `/api/admin/portal/*` |
| `proxyToInternal` | `src/lib/auth/proxy.ts` | Proxies `admin-proxy/portal/*` e `public-proxy/portal/*`; injeta `x-internal-api-key` server-side |
| `checkRateLimit` + `middleware.ts` | `src/lib/rate-limit.ts`, `src/middleware.ts` | Adicionar `/api/public-proxy/portal` ao throttle (30 req/min por IP) |
| `SCREENER_CONTRACT`, faixas, `DIMENSION_IDS` | `src/lib/screener/contract.ts` | Fonte de `pergunta`, pesos e rótulos de faixa para o DTO e fallback textual |
| `AdminPage` (toasts, `Reveal`, badges) + `RhemaLogo`/`WaveDivider` | `src/app/admin/page.tsx`, `src/app/components/*` | Mesmo chrome visual e padrões de fetch (`apiFetch` via `src/lib/api/client.ts`) |
| `GeneratePdfInput` | `src/lib/service/screen-service.ts` | Referência do que o PDF consome; portal não altera esse contrato |

### Integration Points

| System | Integration Method |
| ------ | ------------------ |
| Supabase (`share_tokens`) | Nova migration + `createShareTokenRepository(supabase)` no padrão dos repos existentes (select explícito, `server-only` via `getServiceClient`) |
| `analysis-worker` / fila pgmq | Nenhuma mudança; worker continua validando com `safeParse` e ignorando campos opcionais novos |
| `report-generator` (PDF) | Nenhuma mudança; campos novos são ignorados pelo PDF |
| `docs/data-model.md` | Atualizar no mesmo commit da migration (regra do repo) |

---

## Components

### `createShareTokenRepository`

- **Purpose**: CRUD da tabela `share_tokens` por hash.
- **Location**: `src/lib/repository/share-token-repo.ts`
- **Interfaces**:
  - `create(params: { leadId: string; tokenHash: string; expiresAt: string }): Promise<void>` — invalida token ativo anterior do lead e insere o novo
  - `findByHash(tokenHash: string): Promise<ShareTokenRow | null>`
  - `revokeByLeadId(leadId: string): Promise<void>` — seta `revoked_at`
  - `findActiveByLeadId(leadId: string): Promise<ShareTokenRow | null>`
- **Dependencies**: `SupabaseClient` (service-role via `getServiceClient`)
- **Reuses**: padrão `createMarketInsightsRepository` (select explícito, maybeSingle)

### `createPortalService`

- **Purpose**: Orquestra leitura das 4 fontes e monta o `PortalDTO`; gera/revoga links.
- **Location**: `src/lib/service/portal-service.ts`
- **Interfaces**:
  - `getForManager(leadId: string): Promise<ManagerPortalDTO>` — exige diagnóstico; erro tipado 404 se sem diagnóstico
  - `getByToken(token: string): Promise<PublicPortalDTO>` — hash + lookup + validade; erro tipado 404 genérico para inválido/expirado/revogado
  - `createShareToken(leadId: string): Promise<{ token: string; url: string; expiresAt: string }>` — `randomBytes(32)` base64url, persiste só o hash, TTL 90 dias
  - `revokeShareToken(leadId: string): Promise<void>`
- **Dependencies**: `leadRepo`, `assessmentRepo`, `marketInsightsRepo`, `shareTokenRepo`, `contract` (para fallback textual)
- **Reuses**: `PortalServiceError(message, status)` no padrão `AdminServiceError`; `buildPdfInput` como referência de montagem

### Schemas de agentes estendidos (aditivos)

- **Purpose**: Dar ao portal dados ligáveis a gráficos sem quebrar worker/PDF/fila.
- **Location**: `src/lib/agents/types.ts` (editar; só `.optional()`)
- **Interfaces** (Novos campos opcionais):
  - `analysisPainSchema`: `nivel_atual?: int 1..5`, `impacto_negocio?: string max 300`, `recomendacao_curta?: string max 300`
  - `competitorContextSchema`: `url?: string`, `diferencial?: string max 300`
  - `marketAnalysisSchema`: `posicionamento_setor?: string max 500`, `oportunidade_principal?: string max 300`
  - `insightBulletSchema`: `titulo?: string max 70`, `dimensao_ids?: string[]`, `proximo_passo?: string max 300`
- **Dependencies**: nenhuma nova
- **Reuses**: schemas atuais; `researcher.ts` inalterado (analyst passa a copiar `url` da evidência para `contexto_concorrentes[].url` via instrução de prompt)

### Prompts analyst/writer

- **Purpose**: Preencher os campos novos com qualidade e vínculo correto.
- **Location**: `src/lib/agents/analyst.ts`, `src/lib/agents/writer.ts` (editar prompts + exemplos JSON)
- **Interfaces**: inalteradas (`run` com mesma assinatura)
- **Regras novas no prompt**: toda dor DEVE citar `dimensao_id` válido de `DIMENSION_IDS`; `confianca > 0.7` somente se `evidencia_mercado=true`; `titulo` do bullet ≤ 70 chars; `dimensao_ids` só com ids válidos
- **Reuses**: `ANALYST_OUTPUT_SCHEMA_HINT` / `WRITER_OUTPUT_SCHEMA_HINT` regenerados dos schemas

### `cmmiStages`

- **Purpose**: Conteúdo estático do hero "estágio atual" por faixa.
- **Location**: `src/lib/cmmi/stages.ts`
- **Interfaces**:
  - `getStageByFaixa(rotulo: string): CmmiStage` — `{ rotulo, cor, range, descricaoExecutiva, caracteristicas[], sinaisRisco[], comoSubir[] }`
- **Dependencies**: rótulos de `contract.scoring.faixas`
- **Reuses**: `descricao` da faixa como base da `descricaoExecutiva`; paleta Rhema (`#4A2C7D`, `#3B2366`) para `cor` por estágio

### Rotas internas + proxies

- **Purpose**: Expor o portal no padrão Route→Service→Repository→DTO com proxy.
- **Location**:
  - `src/app/api/admin/portal/[leadId]/route.ts` — `GET` (`verifyInternalApiKey` + `requireManager` + `getForManager`)
  - `src/app/api/admin/portal/[leadId]/share/route.ts` — `POST` cria, `DELETE` revoga
  - `src/app/api/portal/[token]/route.ts` — `GET` público (`verifyInternalApiKey` apenas; o token é a credencial)
  - `src/app/api/admin-proxy/portal/[leadId]/route.ts`, `.../share/route.ts`, `src/app/api/public-proxy/portal/[token]/route.ts` — thin `proxyToInternal`
- **Reuses**: `src/app/api/admin/dashboard/route.ts` como molde (auth + service wiring + mapeamento de erro tipado)

### Páginas + componentes de UI

- **Purpose**: Dashboard interativo nas 6 seções, visão gerente e visão pública.
- **Location**:
  - `src/app/admin/leads/[leadId]/page.tsx` — client component, fetch `getManagerPortal`, botão Copiar link + Revogar, botão Reprocessar quando falha
  - `src/app/r/[token]/page.tsx` — pública, sem chrome admin, sem PII, estados loading/404/expirado
  - `src/components/portal/*.tsx` — `StageHero`, `RadarSpider`, `MaturityBars`, `AnswersAccordion`, `CompetitorsGrid`, `InsightsBoard`, `SourcesList`, `AnalysisPlaceholder`
- **Interfaces**: props serializáveis a partir do `PortalDTO`; `RadarSpider({ dimensions: {name, nivel}[] })`; `MaturityBars({ dimensions })` com filtro por `dimensao_ids` vindo do `InsightsBoard`
- **Dependencies**: `src/lib/api/client.ts` (`getManagerPortal`, `getPublicPortal`, `createShareLink`, `revokeShareLink`); `design-taste-frontend` + `high-end-visual-design` para hierarquia hero→gráficos→detalhe
- **Reuses**: `Reveal`, `RhemaLogo`, `WaveDivider`, toasts e badges do admin

---

## Data Models (if applicable)

### `share_tokens` (nova tabela, migration `0016_portal_share_tokens.sql`)

```sql
create table if not exists public.share_tokens (
  id          uuid primary key default gen_random_uuid(),
  lead_id     uuid not null references public.leads(id) on delete cascade,
  token_hash  text not null unique,
  expires_at  timestamptz not null,
  revoked_at  timestamptz null,
  created_by  uuid null,
  created_at  timestamptz not null default now()
);
create index if not exists share_tokens_lead_id_idx on public.share_tokens(lead_id);
alter table public.share_tokens enable row level security;
-- sem policies para anon/authenticated: service-role only (padrão das migrations 0003/0005/0007)
```

**Relationships**: `leads 1—0..1 share_tokens` (um ativo por lead; histórico preservado com `revoked_at`/`expires_at`).

### `PortalDTO` (novo, `src/lib/dto/portal.ts`)

```typescript
interface PortalDimension {
  id: string; name: string; nivel: number; peso: number; score: number;
  pergunta: string; resposta: string;
}
interface PortalDTO {
  lead: { id: string; name: string; company: string };
  score: { valor: number; faixa: string; descricao: string };
  dimensions: PortalDimension[];
  risk: { id: string; name: string; nivel: number };
  imbalance: boolean;
  stage: CmmiStage;
  analysisStatus: "pendente" | "processando" | "analisado" | "falha";
  analysis?: MarketAnalysis;
  insights?: InsightsBrief;
  sources: { url: string; titulo?: string }[];
  commercialAnswer: string;
}
interface ManagerPortalDTO extends PortalDTO {
  email: string;
  share: { active: boolean; url: string | null; expiresAt: string | null };
}
type PublicPortalDTO = PortalDTO; // sem email/telefone por construção
```

**Relationships**: montado em memória a partir de `leads` + `diagnostics` (fallback) + `assessment_responses.agent_payload` (primário) + `market_insights`; nunca persiste.

---

## Error Handling Strategy

| Error Scenario | Handling | User Impact |
| -------------- | -------- | ----------- |
| Lead sem diagnóstico no portal gerente | `PortalServiceError 404` | Página mostra "diagnóstico não encontrado"; botão Ver resultado desabilitado na tabela |
| Token inválido/expirado/revogado | `PortalServiceError 404` genérico | Página pública mostra estado "link inválido ou expirado", sem distinguir motivo |
| `market_insights` ausente ou status != analisado | DTO com `analysisStatus` + sem `analysis/insights` | Seções de análise viram `AnalysisPlaceholder` (processando/falha); scores intactos |
| `agent_payload` inválido no DB | `safeParse` falha → 404 gerente / 404 público | "Dados do diagnóstico indisponíveis"; log server-side com correlation |
| Campos enriquecidos ausentes (análise antiga) | Fallback textual ("—") por campo | Página renderiza; dor sem `dimensao_id` não participa do vínculo com barras |
| Rate limit excedido no token público | 429 com `Retry-After` (middleware) | "Muitas tentativas. Tente novamente em alguns minutos." |
| `INTERNAL_API_KEY` ausente | 500 genérico no proxy | Log server-side; cliente vê "Erro interno" |

---

## Risks & Concerns

| Concern | Location (file:line) | Impact | Mitigation |
| ------- | -------------------- | ------ | ---------- |
| Schema strict rejeitar análise nova no worker | `src/lib/agents/types.ts:59-66`, `src/app/api/analysis-worker/route.ts:80` | Worker marcaria `agent_payload`/análise como inválida | Campos novos todos `.optional()`; teste back-compat: fixtures antigas validam, payloads novos validam |
| PDF quebrar com campos novos | `src/lib/report/report-generator.ts:298-346` | Email com PDF falharia | PDF ignora campos desconhecidos (acesso nominal); suite `report-generator.test.ts` roda no gate de cada task de schema |
| Comparação de token com `===` vazar por timing | novo `portal-service.ts` | Enumeração de token | Hash SHA-256 + `timingSafeEqual` no padrão `src/lib/auth/internal-key.ts:13-23` |
| Rota pública fora do matcher do middleware | `src/middleware.ts:45-47` | Sem rate limit no token | Proxy público em `/api/public-proxy/portal/*` (coberto pelo matcher) + entrada explícita em `RATE_LIMITED_PATHS` |
| Radar web divergir do PDF | `src/lib/report/radar-chart.ts:15-21` | Inconsistência gerente vs cliente | Port fiel das constantes (`SIZE=320`, `RADIUS=120`, níveis 1–5, `START_ANGLE=-90`); PDF segue fonte oficial impressa |
| `diagnostics` vs `agent_payload` divergentes | `src/lib/repository/assessment-repo.ts:65-77` | Números diferentes no portal e no PDF | Fonte primária única: `agent_payload.respostas`; `diagnostics` só fallback quando payload inválido |
| Tabela admin sem botão para leads sem diagnóstico | `src/app/admin/page.tsx:606-609` | 404 evitável por clique | `Ver resultado` desabilitado quando `!hasDiagnostic` (mesmo gate do `canGenerate`) |
| Vazamento de PII na visão pública | novo `/api/portal/[token]` | Email/telefone expostos | `stripPii` no service (nunca na UI); teste asserta ausência das chaves no JSON público |

---

## Tech Decisions (only non-obvious ones)

| Decision | Choice | Rationale |
| -------- | ------ | --------- |
| Token opaco aleatório, não JWT | `randomBytes(32)` base64url + hash SHA-256 | Sem segredo de assinatura para gerenciar; revogação é delete lógico; invalidação anterior trivial |
| TTL como constante, não env | `SHARE_TOKEN_TTL_DAYS = 90` no service | Evita superfície nova de env para valor raramente mutável; mudança é code review explícito |
| Um token ativo por lead | `create` invalida anterior | Limita janela de exposição; histórico preservado para auditoria |
| Páginas como client components via proxy | Mesmo padrão do `/admin` atual | Regra do repo: frontend só chama `*-proxy`; evita importar server-only no cliente |
| Charts em SVG/CSS próprios | Sem `recharts`/novo dep | Bundle menor, paridade com PDF, controle total do visual taste |
| Conteúdo CMMI estático em código | `src/lib/cmmi/stages.ts`, não DB | 5 faixas fixas do contrato; versionado junto do contrato; sem latência |

> **Project-level decisions:** AD-010 proposto abaixo (padrão de link público compartilhável). A registrar no `.specs/STATE.md` ao aprovar este design: "Links públicos usam token opaco 256-bit com somente hash SHA-256 persistido, TTL 90 dias, um ativo por lead, comparação com timingSafeEqual, 404 genérico".

---
