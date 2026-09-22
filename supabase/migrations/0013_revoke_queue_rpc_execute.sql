-- Endurecimento de funções SECURITY DEFINER expostas via PostgREST.
--
-- Por padrão, o Postgres concede EXECUTE em funções ao PUBLIC, e o Supabase
-- expõe funções do schema public para os papéis anon/authenticated via Data API.
-- Sem o REVOKE abaixo, um chamador anônimo poderia invocar diretamente as RPCs
-- da fila de análise (enfileirar jobs arbitrários, arquivar mensagens, forçar
-- fail_stale), causando custo de LLM/DoS.
--
-- A aplicação chama essas funções apenas com a service role (Supabase server
-- client), que recebe GRANT explícito abaixo.

DO $$
DECLARE
  fn record;
BEGIN
  FOR fn IN
    SELECT p.proname
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname LIKE 'analysis_queue%'
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION public.%I FROM PUBLIC', fn.proname);
    EXECUTE format('REVOKE EXECUTE ON FUNCTION public.%I FROM anon', fn.proname);
    EXECUTE format('REVOKE EXECUTE ON FUNCTION public.%I FROM authenticated', fn.proname);
    EXECUTE format('GRANT EXECUTE ON FUNCTION public.%I TO service_role', fn.proname);
  END LOOP;
END $$;
