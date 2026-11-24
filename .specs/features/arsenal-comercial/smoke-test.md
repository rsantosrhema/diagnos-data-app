# Smoke Test — Arsenal Comercial

Evidências locais da feature. Nenhum e-mail é enviado em nenhum bloco; o Supabase usado é o local (`127.0.0.1:54321`); o LLM real só roda no bloco do agente (máximo 2 execuções).

## Comandos

```sh
ARSENAL_OUT_DIR=/tmp/arsenal-evidence npm run pdf:arsenal-sample
npm run pdf:png -- /tmp/arsenal-evidence/arsenal-sample.pdf /tmp/arsenal-evidence/sample-png
npm run pdf:png -- /tmp/arsenal-evidence/arsenal-sample-no-arsenal.pdf /tmp/arsenal-evidence/sample-png-base
```

- `npm run pdf:arsenal-sample`: 2 passed. Conversor: `pages=7` (com Arsenal) e `pages=4` (sem Arsenal).
- PNGs: `/tmp/arsenal-evidence/sample-png` (7 páginas) e `/tmp/arsenal-evidence/sample-png-base` (4 páginas).
- Artefatos: `/tmp/arsenal-evidence/arsenal-sample.pdf` (77 KB) e `arsenal-sample-no-arsenal.pdf` (58 KB).

## Páginas conferidas

Fixture idêntico nos dois PDFs: 10 dimensões, 3 dores, 2 concorrentes, 4 insights, localização São Paulo/SP. O primeiro recebe `makeArsenal()`, o segundo não.

| PDF | Página | O que se viu | Resultado |
| --- | --- | --- | --- |
| com Arsenal | 1 | Capa do diagnóstico: estágio Estruturado, radar com as 10 dimensões e leitura do radar | OK |
| com Arsenal | 2 | Scores por dimensão (10 linhas, nível e pesos) e exposição de risco (Qualidade, nível 1) + desequilíbrio | OK |
| com Arsenal | 3 | Cauda do card "Estimativa de Impacto" (`Entre R$ 250 mil e R$ 1 milhão`) sozinha na página, sem o restante do card | Problema, pré-existente e fora do escopo (ver abaixo) |
| com Arsenal | 4 | Análise de mercado (resumo + 3 dores), 2 concorrentes, 4 insights priorizados e nota metodológica | OK |
| com Arsenal | 5 | Arsenal `01` Pontos-chave (4 cards com título, texto e dimensões) e `02` Serviço ideal (Governança de Dados, justificativa, dimensões atacadas, complementar) + nota do catálogo preliminar. Running head "ARSENAL COMERCIAL · USO INTERNO · CONFIDENCIAL" e rodapé `Página 5 de 7` | OK |
| com Arsenal | 6 | Arsenal `03` Contorno de objeções: 4 grupos (Preço e orçamento, Timing e prioridade, Já temos time ou ferramenta, Risco e segurança dos dados), cada um com `OBJEÇÃO PROVÁVEL`, `CONTORNO` e `APOIO NO DIAGNÓSTICO`; rodapé `Página 6 de 7` | OK |
| com Arsenal | 7 | Arsenal `04` Perguntas de descoberta (SPIN): `01` a `10`, chips `ABERTA`/`FECHADA` e `SITUAÇÃO`/`PROBLEMA`/`IMPLICAÇÃO`/`NECESSIDADE`, texto e `Objetivo:` de cada pergunta; rodapé `Página 7 de 7` | OK depois do fix |
| sem Arsenal | 1–4 | Mesmas páginas 1–4 do PDF com Arsenal (mesmo conteúdo, mesma paleta e fontes); muda apenas o total do rodapé (`de 4` em vez de `de 7`) | OK |

Conferências transversais nas 3 páginas do Arsenal:

- Seções na ordem `01` → `02` → `03` → `04`, sem texto cortado, sem sobreposição e sem conteúdo fora da mancha da página.
- Chips legíveis (`ABERTA`, `FECHADA`, `SITUAÇÃO`, `PROBLEMA`, `IMPLICAÇÃO`, `NECESSIDADE`), com a mesma borda e marcador dos chips de prioridade do diagnóstico.
- Paleta roxo/ink e fontes Inter/Poppins iguais às do diagnóstico.
- Nota `Catálogo de serviços preliminar: validar antes de ofertar` visível na primeira página do Arsenal (catálogo em `rascunho`).

Contagem de páginas: o fixture pedido (3 dores, 2 concorrentes, 4 insights, localização) faz o `pageThree` do diagnóstico render 4 páginas, então o PDF sai com 4 + 3 = 7 páginas, não 3 + 3 = 6. O invariante da spec ARS-37 (`páginas do diagnóstico + 3`) se mantém; a contagem absoluta do plano (6/3) supunha o fixture mínimo de T18.

## Problemas encontrados

1. **Sobreposição na página de perguntas (corrigido).** Na primeira renderização, o texto da pergunta ocupava duas linhas e o `Objetivo:` era desenhado por cima da segunda linha. Causa: o texto reaproveitava `styles.insightBody`, que carrega `flex: 1` (correto em linha, onde controla largura; dentro da coluna do corpo ele zera a base de altura). Correção: estilo local `questionText` só com tipografia e sem flex. Corrigido em commit separado `fix(report): corrige sobreposição do objetivo nas perguntas do Arsenal` antes deste commit de evidência. Página 7 conferida depois do fix, sem sobreposição.
2. **Página 3 quase vazia (pré-existente, fora do escopo).** Com este fixture, o `pageTwo` do diagnóstico transborda: o card "Estimativa de Impacto" quebra e a cauda fica sozinha na página 3. O mesmo acontece no PDF sem Arsenal (páginas 3 e 4 idênticas), então o defeito é do gerador de diagnóstico com esse volume de conteúdo, não do Arsenal. Não foi tocado aqui; fica registrado para uma tarefa própria do relatório.
3. **Quarta página de Arsenal com 6 objeções (corrigido).** No primeiro run com o agente real, a página de contornos transbordou: as duas últimas objeções caíram numa página extra sem running head, quebrando ARS-27/ARS-29 na renderização. O card foi compactado (grupo 12 pt, rótulo 8.5 pt com 1 pt de margem, corpo 10.5 pt, padding 6/8 pt) e o teste de regressão `report-generator.test.ts` cobre 6 objeções de texto típico: falhava com o layout anterior (7 páginas em vez de 6) e passa com o novo. Commit `9e52965`.
4. **Pior caso absoluto não cabe em 3 páginas (limite conhecido).** Com todos os campos no máximo do schema ao mesmo tempo (5 pontos de 300 caracteres, 6 objeções de 400, 10 perguntas de 240), o texto pagina em 5 páginas de Arsenal. O limite nominal dos campos não garante o encaixe que o design supôs. Com o conteúdo real do agente (o que importa para o uso) as 3 páginas se mantêm, e nenhuma tarefa deste lote altera o schema.

## Agente real

Comando (executado 2 vezes no total, o máximo permitido; a primeira antes do fix de layout, a segunda com o código final):

```sh
docker ps --format '{{.Names}}' | grep supabase_db_diagnos-data-app
ARSENAL_OUT_DIR=/tmp/arsenal-evidence npm run test:smoke:arsenal
```

- `2 passed` em 38,5 s na segunda execução (32,6 s na primeira). Serviços reais: Supabase local, LLM real. Exa e Resend não são chamados (research/analyst/writer são fixtures; `sendEmail` é um contador).
- Lead criado no Supabase local, `status` do `market_insights` = `analisado`, `arsenal` válido pelo `commercialArsenalSchema`.
- Log do lead real: 1 linha `arsenal`, 0 linhas `arsenal_failed`.
- Contador de e-mail: 1 (nenhum e-mail enviado).
- Artefatos: `/tmp/arsenal-evidence/real.pdf` (7 páginas: 4 do diagnóstico + 3 do Arsenal), `real-arsenal.json` e `real-lead-id.txt`.
- PNGs: `/tmp/arsenal-evidence/real-png` (`pages=7`).

Páginas conferidas do PDF real:

| Página | O que se viu | Resultado |
| --- | --- | --- |
| 1–2 | Capa e scores do diagnóstico (estágio Emergente, 10 dimensões, exposição de risco em Qualidade) | OK |
| 3 | Cauda do card "Estimativa de Impacto" (mesmo transbordo pré-existente do diagnóstico) | Problema pré-existente |
| 4 | Análise de mercado com 3 dores (qualidade, LGPD, IA), 1 concorrente e 4 insights | OK |
| 5 | `01` Pontos-chave (5 cards, cada um com as dimensões curtas) e `02` Serviço ideal (Qualidade e Dados Mestres, justificativa, dimensões atacadas, 2 complementares) + nota do catálogo preliminar | OK |
| 6 | `03` Contorno de objeções com os 6 grupos na mesma página, cada um com `OBJEÇÃO PROVÁVEL`, `CONTORNO` e `APOIO NO DIAGNÓSTICO`; running head e `Página 6 de 7` | OK |
| 7 | `04` Perguntas de descoberta (SPIN): `01` a `10`, chips de formato e etapa, texto e `Objetivo:` sem sobreposição; `Página 7 de 7` | OK |

## Falha forçada

Mesmo comando, cenário `failed` (`commercial` lança `new Error("falha simulada")`), sem chamada de LLM:

- `market_insights.status` = `analisado`, `arsenal` = `null`.
- Log do lead: 1 linha `arsenal_failed` com a mensagem `falha simulada`, 0 linhas `arsenal`.
- PDF gerado (`/tmp/arsenal-evidence/failed.pdf`, 4 páginas do diagnóstico, nenhuma página de Arsenal; PNGs em `/tmp/arsenal-evidence/failed-png`, `pages=4`).
- Contador de e-mail: 1. Sem retry de job (`queueRepo.resetReadCount`/`requeue` não são chamados; o teste do serviço em T11 cobre isso).

## Conteúdo avaliado

Julgamento do `real-arsenal.json` da segunda execução, como gerente comercial:

| Critério | Veredito | Evidência (trecho) |
| --- | --- | --- |
| Pontos-chave citam as dimensões de menor nível (d04, d07, d09) | Passa | "Qualidade de dados é o ponto mais fraco do diagnóstico" (d04, d06); "LGPD no papel e acesso informal a dados pessoais" (d07); "IA sem base confiável e sem dono definido" (d09, d02) |
| O desequilíbrio do diagnóstico aparece no material | Passa | "Arquitetura está em nível 5, com dados tratados como produto, enquanto qualidade e conformidade estão em nível 1"; e no apoio da objeção "já temos": "Desequilíbrio de quatro níveis entre arquitetura (d03, nível 5) e qualidade (d04, nível 1)" |
| O otimismo de C-level é testado em pergunta | Passa | Q01, objetivo: "Confirmar quem realmente opera a correção hoje, antes de assumir o dono declarado."; Q03, objetivo: "Testar a prática real por trás do nível declarado de governança." |
| Serviço recomendado existe no catálogo e ataca as dimensões mais baixas | Passa, com ressalva | `qualidade-mestres` = "Qualidade e Dados Mestres" (d04, d06 no catálogo); ataca d04, a de menor nível e maior peso. d07 entra pela complementar `seguranca-lgpd`; d09 não é atacada por serviço, só pelos pontos-chave e perguntas |
| Objeções vêm dos grupos reais e o apoio cita o diagnóstico | Passa | 6 grupos reais (preço, timing, já-temos, confiança, risco-dados, decisão); apoio: "Diagnóstico: d04 e d07 em nível 1, com conciliação manual e acesso informal já em curso." |
| No máximo 1 pergunta de Situação | Passa | Só a Q01 é `situacao`; 6 abertas e 4 fechadas, 3 de Problema, 3 de Implicação, 3 de Necessidade |
| Sem nomes de clientes, números, preços, prazos ou ROI inventados | Passa | Nenhum nome de cliente, preço, prazo ou ROI. Os únicos números são os níveis do próprio diagnóstico (d04 nível 1, d03 nível 5, quatro níveis de diferença). A objeção de confiança instrui: "Não prometa resultado" |

Contagens dentro do contrato: 5 pontos-chave (3 a 5), 6 objeções (3 a 6, grupos únicos), 1 serviço principal + 2 complementares (até 2), 10 perguntas exatamente. Nenhum e-mail foi enviado e nenhum `sendReportEmail` foi importado pelo smoke.

## Download pelo admin

Só local: `NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321`, app em `http://localhost:3000`. A senha do gerente foi gerada na hora, usada só em memória e apagada; nada dela foi gravado em arquivo do repositório.

```sh
set -a; source .env.local; set +a
MANAGER_EMAIL=$(echo "$MANAGER_EMAILS" | cut -d',' -f1 | tr -d ' ')
# usuário já existia no Auth local; senha trocada via admin API
curl -s -X PUT "$NEXT_PUBLIC_SUPABASE_URL/auth/v1/admin/users/<id>" \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" -d '{"password":"<senha descartável>","email_confirm":true}'
TOKEN=$(curl -s -X POST "$NEXT_PUBLIC_SUPABASE_URL/auth/v1/token?grant_type=password" \
  -H "apikey: $NEXT_PUBLIC_SUPABASE_ANON_KEY" -H "Content-Type: application/json" \
  -d '{"email":"<gerente>","password":"<senha descartável>"}' | jq -r .access_token)
npm run dev &                       # sobe em 3000
curl -s -o /tmp/arsenal-evidence/admin-download.pdf -D - \
  -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3000/api/admin-proxy/portal/$(cat /tmp/arsenal-evidence/real-lead-id.txt)/report-pdf"
curl -s -o /dev/null -w '%{http_code}\n' \
  "http://localhost:3000/api/admin-proxy/portal/$(cat /tmp/arsenal-evidence/real-lead-id.txt)/report-pdf"
npm run pdf:png -- /tmp/arsenal-evidence/admin-download.pdf /tmp/arsenal-evidence/admin-png
```

| Requisição | Resultado |
| --- | --- |
| Com `Authorization: Bearer <token do gerente>` | `200`, `content-type: application/pdf`, `content-disposition: attachment; filename="diagnostico-ana-teste.pdf"`, 76.660 bytes |
| Sem `Authorization` | `401`, corpo `{"error":"Não autenticado"}` |

- Lead usado: `real-lead-id.txt` (o lead do cenário real de T26, com Arsenal persistido).
- Conversor: `pages=7`. O Arsenal está nas páginas 5 a 7 (diagnóstico ocupa 1 a 4; ver a divergência de contagem registrada na task).
- Conteúdo igual ao do e-mail: as 7 páginas renderizadas do download são idênticas pixel a pixel (md5) às 7 páginas de `real.pdf`, o PDF enviado no cenário real. A página 5 mostra os mesmos 5 pontos-chave e o serviço "Qualidade e Dados Mestres" de `real-arsenal.json`.
- PNGs: `/tmp/arsenal-evidence/admin-png`.
- Ferramenta de navegador indisponível nesta sessão, então o clique em "Exportar PDF" na tela do admin não foi exercitado; a rota que o botão chama (`GET /api/admin-proxy/portal/<leadId>/report-pdf`, ver `src/lib/api/client.ts`) foi exercitada direto, com e sem token.

## Gates finais

Executados depois de parar o dev server, no worktree:

| Gate | Comando | Resultado |
| --- | --- | --- |
| Typecheck | `npm run typecheck` | exit 0 |
| Lint | `npm run lint` | exit 0 |
| Testes | `npm run test` | 77 arquivos passaram, 3 skipped (80); 873 testes passaram, 5 skipped (878); exit 0 |
| Build | `npm run build` | exit 0, 24 rotas geradas |

Contagem antes da feature: **67 arquivos passaram, 1 skipped; 768 testes passaram, 1 skipped** (baseline em `tasks.md`). Depois: **77 arquivos passaram, 3 skipped; 873 testes passaram, 5 skipped**. Os 5 testes skipped são os dois smokes gated desta feature e o smoke E2E antigo. Nenhum teste foi removido ou enfraquecido.
