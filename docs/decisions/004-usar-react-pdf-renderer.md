# ADR-004: Usar @react-pdf/renderer para o relatório PDF

- **Data**: 2026-08-19
- **Status**: Aceito
- **Decisores**: Time de produto e engenharia
- **Tags**: relatório, PDF, gráficos

## Contexto e Declaração do Problema

O relatório de diagnóstico é um documento padrão com estágio de maturidade, gráficos e análises objetivas. Ele precisa ser gerado no servidor e enviado por email. O harness já define a interface `ReportGenerator` e retorna dados estruturados de gráfico (`radar` e `bar`). Falta escolher a biblioteca que renderiza o PDF com gráficos.

## Drivers de Decisão

- Deve gerar PDF no servidor (server-side).
- Deve permitir gráficos (radar e barras) dentro do PDF.
- Deve ser fácil de estilizar e manter.
- Deve respeitar a fronteira de pureza do harness (sem importar React/Next dentro de `harness/**`).

## Opções Consideradas

- @react-pdf/renderer
- pdfkit
- Puppeteer / HTML→PDF

## Resultado da Decisão

Opção escolhida: **"@react-pdf/renderer"**, porque permite construir o relatório com componentes React e SVG (gráficos), gerando PDF no servidor. Para preservar a pureza do harness, a implementação concreta do PDF vive na camada de aplicação (`src/lib/report/`) e é injetada no pipeline via a interface `ReportGenerator` — o harness continua sem importar React/Next.

### Consequências Positivas

- Componentes React e SVG facilitam a estilização e os gráficos.
- Geração server-side, compatível com o fluxo de email.
- A fronteira de pureza do harness é preservada via injeção de dependência.

### Consequências Negativas

- É uma biblioteca React, exigindo cuidado para não violar a pureza do harness.
- Consumo de memória no servidor durante a renderização.
- Curva de aprendizado para o modelo de componentes do PDF.

## Prós e Contras das Opções

### @react-pdf/renderer ✅ Escolhido

- ✅ Componentes React + SVG para gráficos.
- ✅ Geração server-side.
- ✅ Fácil de estilizar.
- ❌ Biblioteca React — exige fronteira clara com o harness.
- ❌ Custo de memória no servidor.

### pdfkit

- ✅ Server-side puro e leve.
- ✅ Controle total.
- ❌ Gráficos exigem desenho manual ou bibliotecas adicionais.
- ❌ Mais trabalhoso para estilizar.

### Puppeteer / HTML→PDF

- ✅ Visual rico com recharts/HTML.
- ❌ Pesado (browser headless) e maior consumo de recursos.
- ❌ Mais complexo de operar no servidor.

## Links

- [ADR-005: Preservar a pureza do harness com PDF na camada de aplicação](005-preservar-pureza-do-harness.md)
- [ADR-002: Usar Resend para envio de email](002-usar-resend-para-email.md)
