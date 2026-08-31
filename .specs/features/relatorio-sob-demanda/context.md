# Relatório Sob Demanda — Context / Decisions

## Gray area resolved: disparo imediato = fire-and-forget (Opção A)

O usuário confirmou a **Opção A**: ao clicar "Gerar relatório", o endpoint de reprocess enfileira e **dispara em background** `POST /api/analysis-worker` (fetch não-await) com `x-internal-api-key`, retornando `{ ok: true, queued: true }` na hora. O admin não espera o pipeline (~50s) nem o cron.

Motivos:
- Plano Hobby da Vercel bloqueia cron frequente; timeout de função pode cortar request síncrono longo.
- O worker (`analysis-worker`) já implementa o pipeline completo e testado (research/analyst/writer/pdf/email), reutilizando `analysis-service.processNext()`.
- A fila pgmq continua como trilha de estado/dedup/retry (ADR-008).

### Deferred Ideas

- Substituir o fire-and-forget por uma rota interna que invoque `processNext()` no mesmo processo (eliminaria o fetch), mas exigiria refactor do route worker → fora do escopo.
- Cron Vercel real (plano Pro) como segunda camada de drenagem → fora do escopo.
