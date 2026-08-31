-- 0012_report_queue_retry_lock.sql
-- Lock de in-flight + retry atômico do pipeline de relatórios (ADR-010).
--
-- Motivação: o retry do worker usava pgmq.set_vt (analysis_queue_requeue) e
-- enviava o e-mail de fallback na MESMA invocação que devolvia o job à fila.
-- Isso duplicava o e-mail e permitia processamento duplo (a mensagem podia
-- voltar a ficar visível antes de o worker terminar, por VT de 600s).
--
-- Aqui:
--  1. analysis_queue_reset_read_ct — requeue atômico com lock de linha:
--     trava a mensagem em pgmq.q_analysis_jobs; só o primeiro worker
--     devolve (set_vt 0 + read_ct 0); o segundo vê already_retried=true e
--     encerra sem efeitos. O lead volta a 'pendente' no mesmo UPDATE.
--  2. analysis_queue_read — lê o estado do market_insights dentro da mesma
--     transação do pgmq.read: se o job já foi devolvido à fila (status
--     'pendente') no meio do processamento de um worker que falhou, o novo
--     worker que relê não sobrescreve o status para 'processando'.
--
-- Re-executável (create or replace function).

-- ============================================================
-- 1. analysis_queue_reset_read_ct (requeue atômico com lock)
-- ============================================================
create or replace function public.analysis_queue_reset_read_ct(p_msg_id bigint)
returns boolean language plpgsql security definer as $$
declare
  v_already boolean;
  v_lead    text;
begin
  v_already := false;

  -- Lock de linha: apenas um worker executa o bloco por mensagem. O segundo
  -- que tentar devolver a MESMA mensagem vê already_retried = true.
  perform pg_advisory_xact_lock(hashtext('analysis_retry_' || p_msg_id));
  select q.message->>'lead_id' into v_lead
  from pgmq.q_analysis_jobs q
  where q.msg_id = p_msg_id;

  if v_lead is not null then
    update public.market_insights
       set status = 'pendente',
           processing_started_at = null,
           updated_at = now()
     where lead_id = v_lead::uuid;
  end if;

  select (q.read_ct > 0) into v_already
  from pgmq.q_analysis_jobs q
  where q.msg_id = p_msg_id;

  -- Devolve a mensagem à fila apenas se ainda NÃO foi devolvida por outro
  -- worker (read_ct já zerado). set_vt(0) + read_ct(0) tornam o job
  -- imediatamente visível para o próximo drain.
  if not v_already then
    perform pgmq.set_vt('analysis_jobs', p_msg_id, 0);
    perform pgmq.read('analysis_jobs', 0, 1);
  end if;

  return v_already;
end $$;

-- ============================================================
-- 2. analysis_queue_read: respeita o estado 'pendente' devolvido à fila
-- ============================================================
create or replace function public.analysis_queue_read()
returns jsonb language plpgsql security definer as $$
declare
  v_msg  record;
  v_lead uuid;
  v_status text;
begin
  select * into v_msg
  from pgmq.read('analysis_jobs', 600, 1)
  limit 1;

  if v_msg.msg_id is null then
    return null;
  end if;

  v_lead := (v_msg.message->>'lead_id')::uuid;

  -- upsert: cria a linha se não existir (curinga de job sem enqueue)
  insert into public.market_insights
    (lead_id, status, queued_at, processing_started_at, attempts)
  values
    (v_lead, 'processando', now(), now(), 1)
  on conflict (lead_id) do update
    set status = 'processando',
        processing_started_at = now(),
        attempts = market_insights.attempts + 1,
        updated_at = now();

  insert into public.analysis_job_logs (lead_id, step, message)
  values (v_lead, 'started', 'Worker iniciou o processamento do job');

  return jsonb_build_object('msg_id', v_msg.msg_id,
                            'lead_id', v_lead::text);
end $$;
