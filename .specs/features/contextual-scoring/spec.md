# Contextual Scoring Specification

## Problem Statement

O scoring atual do diagnóstico de maturidade de dados usa pesos fixos para todas as empresas, ignorando que setores diferentes têm prioridades distintas de dados. Uma fintech regulada tem necessidades críticas de segurança e conformidade diferentes de uma empresa de varejo focada em cadastros de produtos. Além disso, o porte da empresa (funcionários e faturamento) influencia a complexidade organizacional e a maturidade esperada. Sem ajuste contextual, o score pode subestimar ou superestimar a maturidade real da empresa.

## Goals

- [ ] Pesos das 10 dimensões se ajustam dinamicamente com base no segmento de atuação, número de funcionários e faturamento da empresa respondente.
- [ ] O score final permanece na escala 1.0–5.0, mas as faixas de relatório (Inicial, Emergente, etc.) são recalibradas por segmento.
- [ ] A estrutura suporta adição futura de novos fatores (localidade, número de analistas de dados) sem alteração de código — apenas configuração.
- [ ] Pesos são versionados no Supabase, permitindo ajuste sem redeploy.
- [ ] O PDF mostra o score ajustado (sem comparação benchmark).

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
| --- | --- |
| Comparação benchmark no PDF ("vs. empresas similares") | Decisão do usuário: apenas scoring ajustado, sem comparação externa |
| Validação estatística dos pesos com dados reais | Pesos iniciais são hipóteses de negócio; validação será feita após 50+ respostas |
| Ajuste de pesos por respondente individual | Pesos são por perfil da empresa, não por pessoa |
| Machine learning para calibrar pesos automaticamente | Feature futura; agora é configuração manual versionada |
| Integração com fontes externas de dados setoriais | Pesos são estáticos por configuração, atualizados manualmente |

---

## Assumptions & Open Questions

Every ambiguity is resolved or recorded here - nothing is left silently unclear.

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --- | --- | --- | --- |
| Como funcionários e faturamento se combinam | Funcionários pesa 60%, faturamento 40% no cálculo do multiplicador de porte | Decisão do usuário: funcionários é proxy melhor de complexidade organizacional | y |
| Escala do score final | Mantém 1.0–5.0, mas faixas são recalibradas por segmento | Decisão do usuário: recalibrar faixas por segmento | y |
| Onde ficam os pesos | Supabase (tabelas versionadas) + JSON como seed inicial | Decisão do usuário: versionamento no banco para ajuste sem redeploy | y |
| Como normalizar pesos ajustados | Normalização proporcional para somar 100 | Garante que a fórmula `Σ(nivel × peso) / 100` continue válida | y |
| Limite de variação por dimensão | Máximo ±40% do peso base | Evita distorções extremas; dimensão com peso base 10 pode ir de 6 a 14 | y |
| Multiplicadores para segmento "Outro" | Todos os multiplicadores = 1.0 (neutro) | Sem dados setoriais; não distorce | y |
| Como lidar com novos fatores futuros | Estrutura de `profile_factors` é extensível; novo fator é adicionado como nova chave com `type`, `source_field` e `multipliers` | Arquitetura plug-and-play sem código | y |
| Faixas recalibradas por segmento | Cada segmento tem faixas próprias; segmento "Outro" usa faixas padrão | Reflete realidades setoriais distintas | y |
| JSON de calibração vs banco | JSON é seed/população; banco é runtime. Service mescla ambos (banco tem prioridade) | Permite hotfix via banco sem redeploy, mas JSON garante seed reprodutível | y |

**Open questions:** none - all resolved or logged above.

---

## User Stories

### P1: Configuração de calibração de scoring ⭐ MVP

**User Story**: As a operador, I want definir multiplicadores de peso por segmento, porte e faturamento em um JSON de configuração so that o scoring reflita a realidade setorial de cada empresa.

**Why P1**: É a base de dados que alimenta todo o sistema; sem configuração não há scoring contextual.

**Acceptance Criteria** (each line is one EARS pattern):

1. WHEN o sistema carrega a configuração de calibração THEN the sistema SHALL validar o JSON contra um schema Zod que exige: `version` (string), `dimensions` (mapa de dim_id → base_weight/min/max), `profile_factors` (mapa de fator → type/source_field/multipliers), `normalization` (method/target_total), `constraints` (max_weight_change_percent), e `recalibrated_bands` (mapa de segmento → faixas).
2. IF o JSON de calibração contém campo desconhecido THEN the schema Zod SHALL rejeitar com `.strict()` e o sistema SHALL falhar na inicialização com mensagem descritiva.
3. IF algum peso base de dimensão é ≤ 0 ou a soma dos pesos base ≠ 100 THEN the sistema SHALL rejeitar a configuração na carga inicial.
4. The sistema SHALL exportar `SCORING_CALIBRATION` como constante tipada (inferida do schema Zod), disponível para importação em qualquer módulo server-side.
5. WHERE o JSON define `constraints.max_weight_change_percent` como 40, the sistema SHALL garantir que nenhum peso ajustado exceda ±40% do peso base correspondente após normalização.

**Independent Test**: Carregar JSON válido exporta constante tipada; JSON com campo extra falha na validação; pesos base que não somam 100 rejeitam; peso ajustado além de ±40% é rejeitado.

---

### P1: Cálculo de pesos ajustados por perfil da empresa ⭐ MVP

**User Story**: As a sistema, I want calcular pesos ajustados para cada dimensão com base no segmento, funcionários e faturamento da empresa so that o score reflita a prioridade real de dados para aquele perfil.

**Why P1**: É o núcleo da feature — sem cálculo contextual, os pesos fixos continuam.

**Acceptance Criteria**:

1. WHEN o sistema recebe as respostas do diagnóstico com `profile.perfil_01` (segmento), `profile.perfil_02` (funcionários) e `profile.perfil_03` (faturamento) THEN the sistema SHALL calcular o multiplicador ajustado para cada dimensão como `mult_ajustado_i = mult_segmento_i × (mult_funcionarios_i × 0.6 + mult_faturamento_i × 0.4)`.
2. WHEN o multiplicador combinado é calculado THEN the sistema SHALL aplicar normalização proporcional: `peso_ajustado_i = round(peso_base_i × mult_ajustado_i × (100 / Σ(peso_base_j × mult_ajustado_j)))` para garantir que Σpesos = 100.
3. IF após normalização algum peso ajustado excede ±40% do peso base THEN the sistema SHALL clampar o peso para o limite (min ou max) e renormalizar os demais pesos proporcionalmente.
4. WHEN o segmento não corresponde a nenhuma chave em `profile_factors.segmento.multipliers` THEN the sistema SHALL usar multiplicadores neutros (1.0) para todas as dimensões.
5. WHEN `profile.perfil_02` ou `profile.perfil_03` estão vazios THEN the sistema SHALL usar multiplicadores neutros (1.0) para o fator ausente e ajustar o peso do fator presente para 100% (sem combinação 60/40).
6. The sistema SHALL retornar o array de `dimensionScores` com `peso` refletindo o peso ajustado (não o peso base do contrato).

**Independent Test**: Empresa Indústria com 201-1000 funcionários e R$50-250M faturamento → pesos idênticos aos base (multiplicadores neutros); Empresa Saúde com 51-200 funcionários → peso de Segurança/LGPD aumenta; Empresa com segmento "Outro" → pesos neutros; soma dos pesos ajustados = 100.

---

### P1: Recalibração de faixas de score por segmento ⭐ MVP

**User Story**: As a sistema, I want usar faixas de score (Inicial, Emergente, etc.) específicas por segmento so that a classificação reflita o que é "bom" para cada setor.

**Why P1**: Sem recalibração, um score 3.0 pode ser "Estruturado" para varejo mas "Gerenciado" para fintech.

**Acceptance Criteria**:

1. WHEN o sistema calcula o score final THEN the sistema SHALL buscar as faixas em `recalibrated_bands[segmento]` correspondente ao `profile.perfil_01` do respondente.
2. WHERE o segmento não possui faixas recalibradas THEN the sistema SHALL usar as faixas padrão do contrato (`scoring.faixas` do snapshot).
3. WHEN as faixas recalibradas são carregadas THEN the sistema SHALL validar que cobrem a escala completa 1.0–5.0 sem gaps (faixa[0].min ≤ 1.0 E última faixa.max ≥ 5.0).
4. IF o score final não se encaixa em nenhuma faixa recalibrada THEN the sistema SHALL lançar `ScoringError` com mensagem identificando o segmento e o score.

**Independent Test**: Score 2.8 para Indústria → "Estruturado" (faixas Indústria); score 2.8 para Finanças → "Emergente" (faixas Finanças); segmento sem faixas → usa faixas padrão.

---

### P1: Persistência de versões de calibração no Supabase ⭐ MVP

**User Story**: As a operador, I want versionar as configurações de calibração no Supabase so that eu possa ajustar pesos sem redeploy e manter histórico de mudanças.

**Why P1**: Permite iteração rápida e auditoria de mudanças de pesos.

**Acceptance Criteria**:

1. WHEN uma nova versão de calibração é criada THEN the sistema SHALL persistir na tabela `scoring_versions` com campos `id` (uuid), `version` (string única), `config` (jsonb), `is_active` (boolean), `created_at` (timestamp), `created_by` (string).
2. WHEN o sistema carrega a calibração THEN the sistema SHALL buscar a versão ativa (`is_active = true`) no Supabase; se não existir, usar o JSON de seed como fallback.
3. IF existem múltiplas versões ativas THEN the sistema SHALL usar a mais recente por `created_at` e logar warning.
4. WHEN uma versão é ativada THEN the sistema SHALL desativar todas as outras versões (`is_active = false`) atomicamente.
5. The sistema SHALL NUNCA deletar versões — apenas desativar. Histórico é imutável.

**Independent Test**: Criar versão → persiste no banco; ativar versão → desativa anteriores; buscar calibração → retorna versão ativa ou fallback JSON.

---

### P2: API admin para gestão de versões de calibração

**User Story**: As a operador, I want criar, listar, ativar e visualizar versões de calibração via API admin so that eu gerencie calibrações sem acesso direto ao banco.

**Why P2**: Conveniência; o operador pode gerenciar via painel admin futuro.

**Acceptance Criteria**:

1. WHEN o operador chama `POST /api/admin/scoring-config` com body contendo `version` e `config` THEN the sistema SHALL validar o config contra o schema Zod, persistir a versão e retornar HTTP 201 com o objeto criado.
2. WHEN o operador chama `GET /api/admin/scoring-config` THEN the sistema SHALL retornar todas as versões ordenadas por `created_at` descendente.
3. WHEN o operador chama `PATCH /api/admin/scoring-config/:id/activate` THEN the sistema SHALL ativar a versão e desativar as demais.
4. IF o config enviado é inválido (falha no schema Zod) THEN the sistema SHALL retornar HTTP 400 com `{ error: "Configuração inválida", issues: [...] }`.
5. The sistema SHALL exigir autenticação de admin (sessão válida) em todas as rotas.

**Independent Test**: POST com config válido → 201; POST com config inválido → 400; GET lista versões; PATCH ativa versão e desativa outras; chamada sem auth → 401.

---

### P2: Exibição de pesos ajustados no PDF

**User Story**: As a respondente, I want ver no PDF os pesos que foram efetivamente usados no meu diagnóstico so that eu entenda como o score foi calculado.

**Why P2**: Transparência; o respondente vê que os pesos refletem seu contexto.

**Acceptance Criteria**:

1. WHEN o PDF é gerado THEN the sistema SHALL incluir na tabela de "Scores por Dimensão" a coluna "Peso" refletindo o peso ajustado (não o base).
2. WHEN o peso ajustado difere do peso base THEN the sistema SHALL exibir o peso ajustado e indicar que foi contextualizado (ex: asterisco ou nota de rodapé).
3. The sistema SHALL incluir nota no PDF: "Pesos ajustados com base no perfil da empresa (segmento, porte e faturamento)."

**Independent Test**: Gerar PDF para empresa Saúde → pesos de Segurança maiores que base; gerar PDF para empresa "Outro" → pesos iguais aos base.

---

### P3: Extensibilidade para novos fatores de perfil

**User Story**: As a operador, I want adicionar novos fatores de perfil (ex: localidade, número de analistas) ao JSON de calibração sem alterar código so that o sistema evolua com novas variáveis.

**Why P3**: Garante que a arquitetura suporta crescimento futuro.

**Acceptance Criteria**:

1. WHEN um novo fator é adicionado ao JSON em `profile_factors` com `type`, `source_field` e `multipliers` THEN the sistema SHALL processá-lo automaticamente se o `source_field` existir no `profile` do respondente.
2. IF o `source_field` do novo fator não existe no `profile` THEN the sistema SHALL ignorar o fator silenciosamente (multiplicador neutro 1.0).
3. The sistema SHALL suportar `type: "categorical"` (mapeamento direto de valor → multiplicadores) e `type: "ordinal"` (faixas ordenadas com peso de combinação).

**Independent Test**: Adicionar fator "localidade" com source_field "perfil_04" → sistema processa se campo existe; campo não existe → ignora.

---

## Edge Cases

Edge cases are usually unwanted-behavior (IF/THEN) or boundary (WHEN) criteria:

- IF a soma dos pesos base no JSON ≠ 100 THEN the sistema SHALL rejeitar a configuração na carga e lançar erro.
- IF o JSON de calibração está corrompido ou inacessível THEN the sistema SHALL usar o JSON de seed como fallback e logar warning.
- IF dois fatores de perfil retornam multiplicadores conflitantes para a mesma dimensão (ex: segmento aumenta, porte diminui) THEN the sistema SHALL multiplicar os fatores (resultado pode ser atenuado ou amplificado), sem intervenção manual.
- WHEN a normalização resulta em peso ajustado = 0 para alguma dimensão THEN the sistema SHALL clampar para o mínimo de 1 (garante que toda dimensão contribui).
- IF o Supabase está indisponível na carga de calibração THEN the sistema SHALL fallback para o JSON de seed e logar warning.
- WHEN um novo fator é adicionado ao JSON mas o schema Zod não foi atualizado THEN the sistema SHALL rejeitar o JSON com `.strict()` e exigir atualização do schema.

---

## Requirement Traceability

Each requirement gets a unique ID for tracking across design, tasks, and validation.

| Requirement ID | Story | Phase | Status |
| --- | --- | --- | --- |
| SCORE-01 | P1: Configuração de calibração (schema Zod) | Design | In Design |
| SCORE-02 | P1: Configuração (validação de pesos base) | Design | In Design |
| SCORE-03 | P1: Cálculo de pesos ajustados (fórmula) | Design | In Design |
| SCORE-04 | P1: Cálculo (normalização para 100) | Design | In Design |
| SCORE-05 | P1: Cálculo (clamp ±40%) | Design | In Design |
| SCORE-06 | P1: Cálculo (fallback segmento desconhecido) | Design | In Design |
| SCORE-07 | P1: Cálculo (campo de perfil ausente) | Design | In Design |
| SCORE-08 | P1: Recalibração de faixas por segmento | Design | In Design |
| SCORE-09 | P1: Recalibração (fallback faixas padrão) | Design | In Design |
| SCORE-10 | P1: Persistência de versões no Supabase | Design | In Design |
| SCORE-11 | P1: Persistência (ativação atômica) | Design | In Design |
| SCORE-12 | P2: API admin para gestão de versões | Design | In Design |
| SCORE-13 | P2: Exibição de pesos ajustados no PDF | Design | In Design |
| SCORE-14 | P3: Extensibilidade para novos fatores | Design | In Design |

**ID format:** `SCORE-[NUMBER]`

**Status values:** Pending → In Design → In Tasks → Implementing → Verified

**Coverage:** 14 total, 0 mapped to tasks, 14 unmapped ⚠️

---

## Success Criteria

How we know the feature is successful:

- [ ] Empresa Indústria com 201-1000 funcionários e R$50-250M → pesos idênticos aos base (multiplicadores neutros).
- [ ] Empresa Saúde com 51-200 funcionários → peso de Segurança/LGPD ≥ 12 (vs. base 10).
- [ ] Empresa Finanças/Fintech com +5000 funcionários → peso de Governança ≥ 13 (vs. base 12).
- [ ] Soma dos pesos ajustados = 100 em todos os cenários testados.
- [ ] Faixas recalibradas para Finanças classificam score 2.8 como "Emergente" (vs. "Estruturado" nas faixas padrão).
- [ ] Versão de calibração pode ser criada e ativada via API admin sem redeploy.
- [ ] Adicionar novo fator ao JSON (ex: "localidade") funciona sem alteração de código.
