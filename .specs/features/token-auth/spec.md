# Token Authentication Specification

## Problem Statement

Hoje não há controle de acesso ao formulário de diagnóstico: qualquer pessoa com o link poderia responder. Precisamos de um fluxo em que o cliente solicita acesso, o time gerencial (comercial) gera e envia um token de uso único, e só com esse token o cliente abre o formulário — garantindo um diagnóstico por cliente e rastreabilidade do funil comercial.

## Goals

- [ ] Cliente consegue solicitar acesso (cadastro simples) e, após receber o token, entrar no formulário em < 2 minutos.
- [ ] Gerente consegue ver o funil (pendentes / expirados / cadastrados), gerar, enviar, regerar e cancelar tokens em uma única tela.
- [ ] Token cancelado, usado ou expirado nunca concede acesso (0 acessos indevidos).
- [ ] Mudanças de status de token refletem no painel gerencial automaticamente (< 2s).

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
| --- | --- |
| Envio de token por SMS | Stack aprovada só tem Resend (email); gerente copia o token (show/hide) e envia por WhatsApp/manualmente. SMS é feature futura. |
| Recuperação/esqueci senha do gerente | Gerentes são poucos e criados no dashboard Supabase; reset via Supabase Auth fora do escopo da UI. |
| Múltiplos diagnósticos por cliente | ADR-003: um diagnóstico por cliente; token de uso único. |
| Página do formulário/chat (`/chat`) | Já especificada no fluxo principal; aqui só o gate de acesso que leva até ela. |
| RAG / pgvector | Roadmap futuro (ADR-006), sem relação com autenticação. |
| Edição de cadastro pelo gerente | Gerente não edita dados do cliente; apenas gerencia tokens. |
| Exclusão de clientes/tokens | Nenhum requisito de remoção; cancelar token já cobre a necessidade. |

---

## Assumptions & Open Questions

Every ambiguity is resolved or recorded here - nothing is left silently unclear.

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --- | --- | --- | --- |
| Criação do token | Gerente gera manualmente (botão "Gerar token" por linha) | Decisão do usuário: cadastro vira lead pendente; gerente controla quando gerar | y |
| Canal de envio | Apenas email (Resend + fallback mailto) | ADR-002 só tem Resend; SMS é stub/removido | y |
| Auth do gerente | Supabase Auth (email/senha) + sessão em cookie httpOnly | Não reinventar auth; hash bcrypt, JWT httpOnly; HTTPS protege o transporte | y |
| Momento de consumo | Consumir na validação + janela de sessão de 2h | Equilibra segurança (token não reutilizável) e UX (retomada após queda) | y |
| Expiração de 20min | Regerar mantém o cliente (mesmo client_id, novo token); lazy expiry sem cron | Evita recadastro; sem job agendado — checagem em validar/listar | y |
| Cancelamento | Irreversível + dialog de confirmação obrigatório | Segurança; regerar cobre o caso de erro | y |
| Proteção do cadastro | Validação básica + honeypot + rate limit por IP | Anti-spam sem atrito de captcha | y |
| Tempo real do painel | Supabase Realtime (postgres_changes) | Nativo, ~1s, sem polling/cron | y |
| Envio por email | Resend + fallback mailto | Robusto; registra sent_at quando via Resend | y |
| Sessão do cliente (2h) | Retomar formulário onde parou (rascunho salvo por resposta) | Melhor UX; não perde progresso | y |
| Espaço do token (6 chars alfanum.) | Mitigar brute-force com hash SHA-256 + rate limit + expiração 20min | Espaço ~2 bilhões; controles compensam | y |
| Token não fica em cache | Sem localStorage/sessionStorage/cache; só em memória no fluxo e hash no banco | Requisito explícito do usuário | y |
| HTTPS em produção | Transporte criptografado via HTTPS (Vercel/infra) | "Não detectável no transporte" = TLS; não é decisão de app | y |

**Open questions:** none - all resolved or logged above.

---

## User Stories

### P1: Cadastro de solicitação de acesso (cliente) ⭐ MVP

**User Story**: As a cliente, I want preencher um cadastro simples (nome, empresa, telefone, email corporativo, cargo) so that o time comercial receba meu pedido de acesso.

**Why P1**: Sem o cadastro não há funil nem geração de token — é a entrada do fluxo.

**Acceptance Criteria** (each line is one EARS pattern):

1. WHEN o cliente envia o formulário de solicitação com todos os campos válidos THEN the sistema SHALL persistir o lead com status `pendente` e exibir confirmação de recebimento.
2. IF algum campo obrigatório está vazio ou o email tem formato inválido THEN the sistema SHALL rejeitar o envio com HTTP 400 e mensagem por campo, sem persistir.
3. IF o honeypot anti-bot é preenchido THEN the sistema SHALL descartar a submissão silenciosamente (HTTP 200 sem persistir) e não exibir erro ao bot.
4. IF o mesmo email corporativo já possui cadastro `pendente` THEN the sistema SHALL retornar HTTP 409 informando que a solicitação já existe, sem duplicar o lead.
5. WHEN o número de submissões de um mesmo IP excede 5 em 10 minutos THEN the sistema SHALL responder HTTP 429 (rate limit) pelos próximos 10 minutos.
6. The sistema SHALL sanitizar todos os campos de texto (trim, sem HTML/script) antes de persistir.

**Independent Test**: Submeter o formulário com dados válidos cria o lead; submeter com email inválido, duplicado, honeypot preenchido ou em rajada retorna 400/409/200-silencioso/429 respectivamente.

---

### P1: Geração e gestão de token pelo gerente ⭐ MVP

**User Story**: As a gerente, I want gerar, visualizar, enviar, regerar e cancelar tokens por cliente so that eu controle o acesso ao diagnóstico.

**Why P1**: É o coração do controle de acesso; sem isso o token não chega ao cliente.

**Acceptance Criteria**:

1. WHEN o gerente clica em "Gerar token" para um lead `pendente` THEN the sistema SHALL gerar um token alfanumérico único de 6 caracteres, persistir apenas o hash SHA-256 com `expires_at = agora + 20min` e status `disponivel`, e exibir o token em texto puro apenas naquela resposta.
2. The sistema SHALL garantir que nenhum token de 6 caracteres seja duplicado (constraint de unicidade no hash; em colisão, regerar automaticamente até 5 tentativas antes de falhar com HTTP 500).
3. WHEN o gerente alterna o controle show/hide de um token THEN the sistema SHALL alternar a exibição do token entre mascarado (••••••) e visível somente para tokens cujo texto puro esteja disponível naquela sessão, sem nova chamada ao backend.
4. WHEN o gerente clica em "Enviar por email" THEN the sistema SHALL enviar email via Resend ao email corporativo do cliente contendo o token e o link `/access`, registrar `sent_at`, e em falha do Resend oferecer fallback `mailto:` pré-preenchido.
5. WHEN o gerente clica em "Gerar novo token" para um cliente com token `expirado`/`cancelado`/`usado` THEN the sistema SHALL criar novo token de 20min ligado ao MESMO `client_id`, invalidando qualquer token anterior do cliente.
6. WHEN o gerente clica em "Cancelar token" THEN the sistema SHALL exibir dialog de confirmação ("Deseja realmente cancelar este token?") e só após confirmação marcar o status como `cancelado`.
7. IF o gerente confirma o cancelamento THEN the sistema SHALL tornar a ação irreversível: um token `cancelado` SHALL NUNCA retornar a `disponivel` (apenas regerar cria token novo).
8. The sistema SHALL NUNCA persistir ou logar o token em texto puro — apenas o hash SHA-256.

**Independent Test**: Gerar token para um lead pendente; copiar via show/hide; enviar por email (sent_at registrado); cancelar com confirmação; regerar mantendo o client_id; verificar que o banco só tem hash e que cancelado não volta a disponível.

---

### P1: Validação de token e acesso ao formulário (cliente) ⭐ MVP

**User Story**: As a cliente, I want entrar com meu token na página de acesso so that eu responda o formulário de diagnóstico.

**Why P1**: É o gate de segurança que protege o formulário.

**Acceptance Criteria**:

1. WHEN o cliente submete um token `disponivel` e não expirado em `/access` THEN the sistema SHALL marcar o token como `usado`, criar uma sessão de 2 horas ligada ao `client_id` (cookie httpOnly) e redirecionar para `/chat`.
2. IF o token está `cancelado`, `usado` ou `expirado` THEN the sistema SHALL negar acesso com HTTP 401 e mensagem específica por status, sem criar sessão.
3. IF o token não existe (hash não encontrado) THEN the sistema SHALL responder HTTP 401 genérico "token inválido", sem revelar se o formato era válido.
4. WHEN `expires_at < agora` em qualquer leitura/validação do token THEN the sistema SHALL marcar o status como `expirado` (lazy expiry, sem cron).
5. WHILE a sessão de 2h está ativa WHEN o cliente retorna à aplicação THEN the sistema SHALL permitir retomar o formulário de onde parou, sem exigir novo token.
6. WHEN as tentativas de validação de um mesmo IP excedem 10 em 10 minutos THEN the sistema SHALL responder HTTP 429 (rate limit) pelos próximos 10 minutos.
7. The sistema SHALL NUNCA armazenar o token em cache, localStorage, sessionStorage ou cookie legível pelo cliente — apenas o hash é comparado no servidor.

**Independent Test**: Token válido → 200 + sessão + redirect; token usado/cancelado/expirado/inexistente → 401 sem sessão; token expirado vira `expirado` ao tentar usar; sessão ativa permite retomada.

---

### P1: Painel gerencial com KPIs e tabela em tempo real ⭐ MVP

**User Story**: As a gerente, I want ver KPIs (pendentes, expirados, cadastrados) e uma tabela de clientes/tokens atualizada automaticamente so that eu acompanhe o funil sem dar refresh.

**Why P1**: É a interface de trabalho do gerente; sem tempo real o requisito de atualização automática falha.

**Acceptance Criteria**:

1. WHEN o gerente acessa o painel autenticado THEN the sistema SHALL exibir 3 KPIs no topo: quantidade de tokens `disponivel` não enviados (pendente envio), quantidade `expirado`, e total de clientes cadastrados.
2. WHEN o gerente acessa o painel THEN the sistema SHALL listar em tabela: nome, empresa, status do token e token (com show/hide) para cada cliente.
3. WHEN qualquer token muda de status no banco (gerado, enviado, usado, cancelado, expirado) THEN the sistema SHALL atualizar KPIs e tabela no painel em até 2 segundos via Supabase Realtime, sem refresh manual.
4. IF o gerente não está autenticado THEN the sistema SHALL redirecionar `/admin` para a tela de login e negar acesso às APIs do painel com HTTP 401.
5. The sistema SHALL NUNCA expor tokens em texto puro nas respostas de listagem — apenas status e metadados; o texto puro só existe na resposta da geração/regeração.

**Independent Test**: Abrir o painel e ver KPIs + tabela; em outra aba gerar/cancelar um token e confirmar que o painel atualiza sozinho em < 2s; acessar `/admin` deslogado e ser redirecionado ao login.

---

### P2: Login do gerente

**User Story**: As a gerente, I want entrar com email e senha so that só pessoal autorizado acesse o painel.

**Why P2**: Necessário para proteger o painel, mas o Supabase Auth já fornece a base; a UI de login é fina.

**Acceptance Criteria**:

1. WHEN o gerente submete email e senha válidos THEN the sistema SHALL autenticar via Supabase Auth, definir cookie de sessão httpOnly e redirecionar para `/admin`.
2. IF email ou senha estão incorretos THEN the sistema SHALL exibir erro genérico "credenciais inválidas" sem revelar qual campo falhou.
3. The sistema SHALL NUNCA permitir dois gerentes com o mesmo email (uniqueness garantida pelo Supabase Auth).
4. WHEN as tentativas de login de um mesmo IP excedem 5 em 10 minutos THEN the sistema SHALL responder HTTP 429 (rate limit) pelos próximos 10 minutos.
5. The sistema SHALL transmitir credenciais apenas sob HTTPS em produção e nunca em query string ou log.

**Independent Test**: Login com credenciais válidas entra no painel; inválidas mostram erro genérico; duplicidade de email é bloqueada; rajada de tentativas retorna 429.

---

### P2: Rascunho e retomada do formulário na sessão

**User Story**: As a cliente, I want que minhas respostas sejam salvas como rascunho durante a sessão so that eu não perca progresso se a conexão cair.

**Why P2**: Melhora a UX, mas o formulário em si já existe; aqui é só persistir rascunho.

**Acceptance Criteria**:

1. WHEN o cliente responde uma pergunta durante a sessão ativa THEN the sistema SHALL persistir a resposta como rascunho ligada ao `client_id`.
2. WHEN o cliente retorna dentro da janela de 2h THEN the sistema SHALL restaurar o formulário na última pergunta respondida com as respostas anteriores preenchidas.
3. WHEN o cliente submete o formulário completo THEN the sistema SHALL finalizar a sessão e limpar o rascunho do `client_id`.

**Independent Test**: Responder 3 perguntas, fechar, voltar em <2h e ver as 3 respostas restauradas; submeter tudo e confirmar que o rascunho é limpo.

---

### P3: Notificação ao time gerencial sobre novo cadastro

**User Story**: As a gerente, I want ser notificado quando um novo cliente se cadastra so that eu gere o token rapidamente.

**Why P3**: Conveniente, mas o gerente já vê o pendente no painel em tempo real; email é redundante.

**Acceptance Criteria**:

1. WHEN um novo lead `pendente` é criado THEN the sistema SHALL enviar email ao endereço do time gerencial via Resend com nome e empresa do cliente.

**Independent Test**: Cadastrar um lead e confirmar o recebimento do email de notificação.

---

### P1: Autenticação mútua cliente-servidor (internal API key) ⭐ MVP

**User Story**: As a operador, I want que toda chamada à API (incluindo as do cliente) exija uma chave interna conhecida apenas pelo backend so that a URL do Next.js não seja suficiente para sondar o sistema.

**Why P1**: Camada extra de segurança — quem souber a URL não consegue chamar APIs sem a chave; o frontend precisa passar pelo proxy, que adiciona a chave server-side.

**Acceptance Criteria**:

1. WHEN qualquer API (pública ou admin) recebe uma requisição THEN the sistema SHALL exigir o header `X-Internal-Api-Key` e responder HTTP 401 com `{ error: "Chave interna inválida" }` se o header estiver ausente ou não casar em tempo constante com `INTERNAL_API_KEY`.
2. The sistema SHALL comparar a chave usando `crypto.timingSafeEqual` (constant-time), sem early-return por diferença de comprimento após o hashing.
3. IF `INTERNAL_API_KEY` não estiver configurada ou tiver menos de 32 caracteres THEN the sistema SHALL falhar fechado (todas as APIs respondem 401).
4. WHEN o navegador chama uma API THEN the sistema SHALL passar pelo proxy em `/api/public-proxy/*` ou `/api/admin-proxy/*` que adiciona o header `X-Internal-Api-Key` server-side e repassa o body, método, content-type e Authorization.
5. The sistema SHALL NUNCA expor `INTERNAL_API_KEY` ao bundle do cliente — apenas a env var pública `NEXT_PUBLIC_INERT_API_KEY` (valor dummy) pode existir no front; o proxy ignora o valor do browser e usa o do servidor.
6. IF o proxy recebe `Authorization` do navegador THEN the sistema SHALL repassar para a API final sem modificação (Bearer do gerente segue válido).
7. IF o backend alvo responde com erro (4xx/5xx) THEN the proxy SHALL propagar o status code e o body sem alterá-los (apenas remove `content-encoding`/`content-length`/`transfer-encoding` que o Next gerencia).
8. IF o `fetch` server-to-server do proxy falha (ex.: ECONNREFUSED) THEN the proxy SHALL responder 502 com `{ error: "Falha ao chamar API interna" }`.

**Independent Test**: Chamar `/api/leads` direto sem header → 401; chamar `/api/public-proxy/leads` (que adiciona o header server-side) → sucesso; chamar admin direto sem header → 401; chamar via `/api/admin-proxy/*` → sucesso; garantir que `INTERNAL_API_KEY` não aparece em nenhum bundle `.next/static/*`.

---

## Edge Cases

Edge cases are usually unwanted-behavior (IF/THEN) or boundary (WHEN) criteria:

- IF ocorre colisão de hash na geração do token THEN the sistema SHALL tentar regerar até 5 vezes; persistindo a colisão, SHALL falhar com HTTP 500 e logar o evento.
- IF o cliente tenta validar um token exatamente no segundo da expiração (`expires_at == agora`) THEN the sistema SHALL tratá-lo como expirado (fronteira inclusiva no vencimento).
- IF o Resend está indisponível no envio THEN the sistema SHALL retornar erro ao gerente e oferecer fallback `mailto:` pré-preenchido com o token e o link.
- IF o gerente clica em "Gerar novo token" para um cliente que ainda tem token `disponivel` válido THEN the sistema SHALL exigir confirmação de que o token atual será invalidado antes de regerar.
- IF dois gerentes clicam em "Gerar token" para o mesmo lead simultaneamente THEN the sistema SHALL garantir via constraint que apenas um token `disponivel` exista por cliente (o segundo recebe HTTP 409).
- IF o cliente submete o formulário após a sessão de 2h expirar THEN the sistema SHALL negar o submit com HTTP 401 e orientar a solicitar novo token.
- IF o canal Realtime desconecta THEN the sistema SHALL reconectar automaticamente e, ao reconectar, refazer a query para sincronizar o estado.

---

## Requirement Traceability

Each requirement gets a unique ID for tracking across design, tasks, and validation.

| Requirement ID | Story | Phase | Status |
| --- | --- | --- | --- |
| AUTH-01 | P1: Cadastro de solicitação | Design | Pending |
| AUTH-02 | P1: Cadastro (validação/anti-spam) | Design | Pending |
| AUTH-03 | P1: Geração de token | Design | Pending |
| AUTH-04 | P1: Gestão de token (enviar/regerar/cancelar) | Design | Pending |
| AUTH-05 | P1: Validação de token / acesso | Design | Pending |
| AUTH-06 | P1: Sessão 2h + retomada | Design | Pending |
| AUTH-07 | P1: Painel KPIs + tabela | Design | Pending |
| AUTH-08 | P1: Tempo real (Realtime) | Design | Pending |
| AUTH-09 | P2: Login do gerente | Design | Pending |
| AUTH-10 | P2: Rascunho do formulário | Design | Pending |
| AUTH-11 | P3: Notificação de novo cadastro | - | Pending |
| AUTH-12 | Segurança (hash, sem cache, HTTPS, rate limit) | Design | Pending |
| AUTH-13 | P1: Internal API key + proxy | Implementing → Verified |

**ID format:** `AUTH-[NUMBER]`

**Status values:** Pending → In Design → In Tasks → Implementing → Verified

**Coverage:** 13 total, 1 mapped (AUTH-13 implementado), 12 unmapped ⚠️

---

## Success Criteria

How we know the feature is successful:

- [ ] Cliente entra no formulário com token válido em < 2 minutos após recebê-lo.
- [ ] Token cancelado/usado/expirado resulta em 0 acessos concedidos (100% de negação).
- [ ] Painel reflete mudança de status em < 2s sem refresh.
- [ ] Nenhum token em texto puro é persistido ou logado (apenas hash SHA-256).
- [ ] Gerente completa gerar + enviar token em < 1 minuto por cliente.
