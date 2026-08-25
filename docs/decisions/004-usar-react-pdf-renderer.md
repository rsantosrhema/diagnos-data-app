# ADR-004: Usar @react-pdf/renderer para o relatório PDF

- **Data**: 2026-08-19
- **Status**: Aceito (atualizado: harness removido — ver ADR-008/009)
- **Decisores**: Time de produto e engenharia
- **Tags**: relatório, PDF, gráficos

## Contexto e Declaração do Problema

O relatório de diagnóstico é um documento padrão com estágio de maturidade, gráficos e análises objetivas. Ele precisa ser gerado no servidor e enviado por email. O screener produz dados estruturados de dimension scores e precisamos renderizá-los num PDF com gráficos.

## Drivers de Decisão

- Deve gerar PDF no servidor (server-side).
- Deve permitir gráficos (barras / score por dimensão) dentro do PDF.
- Deve ser fácil de estilizar e manter.

## Opções Consideradas

- @react-pdf/renderer
- pdfkit
- Puppeteer / HTML→PDF

## Resultado da Decisão

Opção escolhida: **"@react-pdf/renderer"**, porque permite construir o relatório com componentes React e SVG (gráficos), gerando PDF no servidor. A implementação concreta (`src/lib/report/report-generator.ts`) é chamada pela camada Service (`src/lib/service/screen-service.ts`) durante o envio da triagem.

### Consequências Positivas

- Componentes React e SVG facilitam a estilização e os gráficos.
- Geração server-side, compatível com o fluxo de email.
- Implementação isolada em `src/lib/report/`, fácil de evoluir.

### Consequências Negativas

- É uma biblioteca React, exigindo cuidado para mantê-la server-side.
- Consumo de memória no servidor durante a renderização.
- Curva de aprendizado para o modelo de componentes do PDF.

## Prós e Contras das Opções

### @react-pdf/renderer ✅ Escolhido

- ✅ Componentes React + SVG para gráficos.
- ✅ Geração server-side.
- ✅ Fácil de estilizar.
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

- [ADR-002: Usar Resend para envio de email](002-usar-resend-para-email.md)
- [ADR-008: Diagnóstico de maturidade de dados como lead-gen](008-diagnostico-maturidade-dados-como-lead-gen.md)
