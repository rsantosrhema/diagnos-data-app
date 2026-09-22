-- 0015_worker_cron.sql
-- Drain automático do worker de relatórios via pg_cron + pg_net.
--
-- O processamento do pipeline de agentes não pode depender só do disparo via
-- HTTP do clique do gerente: em serverless o cold start pode exceder o timeout
-- e o job fica 'pendente'. Este cron chama POST /api/analysis-worker a cada
-- 5 min via pg_net, autenticando com a INTERNAL_API_KEY guardada no Supabase
-- Vault (criptografado em repouso; nunca exposta ao client).
--
-- Re-executável: só cria a secret e agenda o job se ainda não existirem.

do $$
begin
  -- 1. Secret no Vault via create_secret (SECURITY DEFINER — evita INSERT direto
  --    em vault.secrets, que exige permissão nas funções _crypto_aead_det_*).
  if not exists (
    select 1 from vault.decrypted_secrets where name = 'diagnos_internal_api_key'
  ) then
    perform vault.create_secret(
      current_setting('myapp.internal_key', true),
      'diagnos_internal_api_key',
      'INTERNAL_API_KEY usada pelo cron para autenticar o analysis-worker'
    );
  end if;

  -- 2. Job de drain a cada 5 min (idempotente)
  if not exists (
    select 1 from cron.job where jobname = 'drain-analysis-worker'
  ) then
    perform cron.schedule(
      'drain-analysis-worker',
      '*/5 * * * *',
      'select net.http_post(
        url := ''https://diagnos-data-app.vercel.app/api/analysis-worker'',
        headers := jsonb_build_object(
          ''Content-Type'', ''application/json'',
          ''x-internal-api-key'', (select decrypted_secret from vault.decrypted_secrets where name = ''diagnos_internal_api_key'')
        ),
        timeout_milliseconds := 55000
      );'
    );
  end if;
end $$;
