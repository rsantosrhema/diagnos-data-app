# Arsenal Comercial Context

**Gathered:** 2026-11-24
**Spec:** `.specs/features/arsenal-comercial/spec.md`
**Status:** Ready for design

> **Aprovação:** o coordenador encerrou a sessão sem responder ao checkpoint 1 (modo Quick). Por instrução do orquestrador, o planejador decidiu sozinho, adotando os defaults recomendados abaixo. Nenhuma decisão desta página foi confirmada pelo usuário; todas estão marcadas `Confirmed? n` na spec e podem ser trocadas antes do Execute.

---

## Feature Boundary

Um agente comercial com skill de SPIN Selling lê o diagnóstico (payload do screener), a análise e os insights, cruza com o catálogo de serviços da Rhema Data e produz o "Arsenal Comercial": 4 blocos (pontos-chave, objeções por grupo, serviço ideal, 10 perguntas SPIN). O Arsenal é persistido em `market_insights` e vira páginas adicionais no mesmo PDF que o gerente baixa e que segue por e-mail ao comercial. Nada muda para o cliente.

---

## Implementation Decisions

### A. Catálogo de serviços e grupos de objeção

- Dados em `docs/comercial/servicos.json` e `docs/comercial/objecoes.json`, ambos com `status: "rascunho"`, validados por Zod no load; `servico_id` e `grupo` são `z.enum` derivados dos arquivos. Trocar o conteúdo não exige mudar código.
- Seed de 7 serviços: Diagnóstico 360 de Dados; Governança de Dados; Qualidade e Dados Mestres; Arquitetura e Integração; Analytics e BI (autonomia analítica); Segurança e LGPD aplicada a dados; IA e Analytics Avançado. Cada um: `id`, `nome`, `resumo`, `dimensoes` (d01..d10) e `quando_indicar`. Sem preço e sem prazo.
- Seed de 6 grupos: Preço/orçamento; Timing/prioridade; "Já temos time ou ferramenta"; Confiança/prova de resultado; Risco e segurança dos dados (LGPD); Decisão/alçada.
- Enquanto o catálogo estiver em rascunho, o PDF mostra a nota "Catálogo de serviços preliminar: validar antes de ofertar". A nota some quando `status` virar `aprovado`.

### B. Conteúdo do Arsenal

- Ordem dos blocos segue o pedido do dono: pontos-chave, objeções, serviço ideal, perguntas.
- Pontos-chave: 3 a 5, cada um ligado a dimensões. Objeções: 3 a 6 grupos relevantes ao lead, uma entrada por grupo (objeção provável, contorno, apoio vindo do diagnóstico). Serviço: 1 principal com justificativa e dimensões atacadas, mais até 2 complementares. Perguntas: exatamente 10, no mínimo 4 abertas e 3 fechadas, no máximo 1 de Situação e no mínimo 2 de cada etapa Problema, Implicação e Necessidade; cada uma com formato, etapa SPIN e objetivo.
- Guardrail: o agente nunca inventa cases, números de clientes, preços, prazos ou ROI; usa só diagnóstico, análise, insights e catálogo.
- Sinais calculados em código entram no prompt: dimensões de menor nível, desequilíbrio, resposta comercial, faixa e flag C-level (autoavaliação de C-level tende a ser otimista).
- A skill SPIN vive em `docs/agents/skills/comercial/spin-selling.md` (mesmo padrão das skills de segmento).

### C. Falhas e ciclo de vida

- Falha do agente comercial não derruba o job: PDF e e-mail saem sem Arsenal, status continua `analisado`, log ganha `arsenal` (ok) e `arsenal_failed` (erro). Sem retry automático do Arsenal.
- "Gerar relatório" de novo regenera tudo; o campo `arsenal` é sempre sobrescrito (valor novo ou `null`), nunca retém o anterior.
- Lead antigo sem Arsenal baixa o PDF atual, sem erro. Arsenal persistido que deixou de validar (catálogo mudou) é ignorado no PDF.
- Persistência: coluna `arsenal jsonb` nova em `market_insights` e steps `arsenal`/`arsenal_failed` na constraint de `analysis_job_logs` (migration 0019, aplicável em banco vazio).
- Custo: 1 execução do agente por relatório (até 3 tentativas internas de schema, como analyst e writer).

### D. Aparência no PDF

- Diagnóstico intacto nas páginas existentes; Arsenal depois, em 3 páginas A4 (pontos-chave + serviço; objeções; perguntas), com running head "ARSENAL COMERCIAL · USO INTERNO · CONFIDENCIAL" e o mesmo rodapé.
- Mesmos tokens do relatório (paleta, Inter/Poppins, section headers, cards, chips). Perguntas numeradas com chips ABERTA/FECHADA e etapa SPIN. Sem Arsenal, o PDF é idêntico ao atual.

### Agent's Discretion

Texto da skill SPIN; redação dos resumos do catálogo seed; prompt do agente; títulos exatos dos cards; espaçamentos do layout dentro dos tokens.

### Declined / Undiscussed Gray Areas → Assumptions

Todas as áreas A–D ficaram sem resposta do usuário. Cada default acima foi registrado em Assumptions & Open Questions da spec com `Confirmed? n`.

---

## Specific References

`docs/branding-kit.pdf` e `src/app/brandkit` como referência de marca; estilos de `src/lib/report/report-generator.ts` como fonte dos tokens. Método: SPIN Selling (Situação, Problema, Implicação, Necessidade de solução).

---

## Deferred Ideas

- Visualizar o Arsenal na tela do admin.
- Regenerar só o Arsenal sem reprocessar o pipeline inteiro.
- Versão "cliente" do PDF e Arsenal no portal `/r` (decididos fora de escopo pelo dono).
- Worker em container separado (fora de escopo).
