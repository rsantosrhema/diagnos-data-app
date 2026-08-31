-- 0010_report_queue_timeout.sql
-- Timeout de staleness da fila de relatórios (ADR-010, follow-up de ops).
-- Jobs que permanecem em 'pendente'/'processando' por mais tempo que o
-- limite configurado (30 min no worker) são marcados como 'falha', ganham
-- evento 'failed' no log e, se ainda estiverem ativos na fila pgmq, são
-- arquivados para não serem reprocessados.
--
-- Re-executável (create or replace).

create or replace function public.analysis_queue_fail_stale(p_max_age interval)
returns integer language plpgsql security definer as $$
declare
  v_stale bigint;
  v_rec   record;
begin
  select count(*) into v_stale
  from public.market_insights mi
  where mi.status in ('pendente', 'processando')
    and mi.queued_at < now() - p_max_age;

  if v_stale = 0 then
    return 0;
  end if;

  for v_rec in
    select mi.lead_id, mi.status
    from public.market_insights mi
    where mi.status in ('pendente', 'processando')
      and mi.queued_at < now() - p_max_age
  loop
    update public.market_insights
       set status = 'falha',
           error = 'Tempo de espera na fila excedeu o limite (' ||
                   to_char(p_max_age, 'HH24:MI') || '). Job considerado expirado.',
           updated_at = now()
     where lead_id = v_rec.lead_id;

    insert into public.analysis_job_logs (lead_id, step, message)
    values (v_rec.lead_id, 'failed',
            'Job expirado por exceder o tempo máximo na fila');

    perform pgmq.archive(
      'analysis_jobs',
      (select q.msg_id from pgmq.q_analysis_jobs q
        where q.message->>'lead_id' = v_rec.lead_id::text)
    );
  end loop;

  return v_stale;
end $$;
