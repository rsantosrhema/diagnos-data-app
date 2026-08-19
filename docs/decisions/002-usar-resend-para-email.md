# ADR-002: Usar Resend para envio de email com anexo PDF

- **Data**: 2026-08-19
- **Status**: Aceito
- **Decisores**: Time de produto e engenharia
- **Tags**: email, notificações, integração

## Contexto e Declaração do Problema

Após a geração do relatório de diagnóstico, o PDF precisa ser enviado ao time comercial. O envio deve ser transacional, confiável e capaz de anexar o arquivo PDF gerado. O time quer uma solução simples de integrar, sem operar servidores de email.

## Drivers de Decisão

- Deve enviar anexos (PDF) de forma confiável.
- Deve ter integração simples com o backend Next.js.
- Deve minimizar configuração e operação de infraestrutura de email.

## Opções Consideradas

- Resend
- Nodemailer + SMTP
- SendGrid

## Resultado da Decisão

Opção escolhida: **"Resend"**, porque oferece uma API simples e moderna para email transacional, suporta anexos PDF nativamente e se integra facilmente ao Next.js, sem exigir configuração de servidor SMTP próprio.

### Consequências Positivas

- API simples e bem documentada, com SDK para Node/Next.js.
- Suporte nativo a anexos (PDF).
- Sem necessidade de operar servidor SMTP.
- Boa taxa de entrega para emails transacionais.

### Consequências Negativas

- Dependência de um provedor SaaS de email.
- Custo por volume de envio.
- Limites de envio conforme o plano.

## Prós e Contras das Opções

### Resend ✅ Escolhido

- ✅ API simples e SDK para Next.js.
- ✅ Suporte nativo a anexos PDF.
- ✅ Boa entrega transacional.
- ❌ Dependência de provedor SaaS.

### Nodemailer + SMTP

- ✅ Usa SMTP próprio (Gmail, Outlook etc.), sem custo de API.
- ❌ Mais configuração e manutenção.
- ❌ Entrega e limites dependem do provedor SMTP.

### SendGrid

- ✅ Provedor maduro de email transacional.
- ✅ Suporte a anexos.
- ❌ API mais verbosa e configuração mais pesada que a do Resend.

## Links

- [ADR-004: Usar @react-pdf/renderer para o relatório PDF](004-usar-react-pdf-renderer.md)
