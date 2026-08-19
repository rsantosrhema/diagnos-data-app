# ADR-005: Preservar a pureza do harness com PDF na camada de aplicação

- **Data**: 2026-08-19
- **Status**: Aceito
- **Decisores**: Time de produto e engenharia
- **Tags**: arquitetura, harness, fronteira de módulos

## Contexto e Declaração do Problema

O harness (`harness/**`) é o núcleo framework-agnóstico da aplicação e, por convenção, **não pode importar** de `src/**` nem de módulos React/Next. A biblioteca escolhida para o PDF (`@react-pdf/renderer`) é React. Isso cria um conflito: gerar o PDF dentro do harness violaria a pureza, mas o pipeline precisa de um gerador de relatório.

## Drivers de Decisão

- O harness deve permanecer puro e testável sem React/Next.
- O pipeline precisa de um `ReportGenerator` para produzir o PDF.
- A implementação concreta do PDF deve poder evoluir sem tocar no harness.

## Opções Consideradas

- Injetar o gerador de PDF na camada de aplicação via interface
- Implementar o PDF dentro do harness (violando a pureza)
- Duplicar a lógica de relatório fora do harness

## Resultado da Decisão

Opção escolhida: **"Injetar o gerador de PDF na camada de aplicação via interface"**. O harness mantém a interface `ReportGenerator` e o contrato de `DiagnosticResult`. A implementação concreta com `@react-pdf/renderer` vive em `src/lib/report/` e é injetada no pipeline por meio de `PipelineDeps`. O `runDiagnostic` aceita um `reportGenerator` opcional (default = placeholder), e a aplicação injeta o real.

### Consequências Positivas

- O harness permanece puro e testável sem React/Next.
- A implementação do PDF pode evoluir sem alterar o harness.
- O contrato público (`runDiagnostic`) permanece estável.

### Consequências Negativas

- A aplicação precisa montar e injetar o gerador concreto.
- Exige disciplina para não importar módulos React dentro de `harness/**`.

## Prós e Contras das Opções

### Injetar o gerador via interface ✅ Escolhido

- ✅ Preserva a pureza do harness.
- ✅ Permite evolução independente do PDF.
- ✅ Contrato público estável.
- ❌ A aplicação precisa montar a injeção.

### Implementar o PDF dentro do harness

- ✅ Simples, sem injeção.
- ❌ Viola a regra de pureza do harness.
- ❌ Acopla o núcleo a uma biblioteca React.

### Duplicar a lógica de relatório fora do harness

- ✅ Mantém o harness puro.
- ❌ Duplicação de código e risco de divergência.

## Links

- [ADR-004: Usar @react-pdf/renderer para o relatório PDF](004-usar-react-pdf-renderer.md)
- [AGENTS.md](../../AGENTS.md) — seção "Harness purity"
