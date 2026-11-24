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
