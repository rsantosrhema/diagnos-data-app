-- 0011_report_log_email_pdf.sql
-- Robustez + monitorabilidade do pipeline de relatórios (follow-up ADR-010).
--
--  1. analysis_job_logs.step ganha os valores 'pdf_failed', 'email_failed' e
--     'requeue' (antes não existiam: falha de PDF/e-mail não podia ser logada).
--  2. Corrige analysis_queue_fail_stale: só arquiva mensagens VISÍVEIS/STALE
--     (read_ct = 0 ou vt <= now()). Antes arquivava qualquer mensagem ativa
--     cujo lead_id batesse, incluindo mensagens em voo (read_ct >= 1 dentro
--     do visibility timeout) — o que tirava o retry de um job em processamento.
--
-- Re-executável (create or replace / drop constraint if exists).

-- ============================================================
-- 1. analysis_job_logs: novos steps de erro/retry
-- ============================================================
alter table public.analysis_job_logs
  drop constraint if exists analysis_job_logs_step_check;

alter table public.analysis_job_logs
  add constraint analysis_job_logs_step_check
  check (step in ('enqueued','started','researcher','analyst',
                  'writer','pdf','email','completed','failed',
                  'pdf_failed','email_failed','requeue'));

-- ============================================================
-- 2. analysis_queue_fail_stale: arquiva apenas mensagens stale/visíveis
-- ============================================================
create or replace function public.analysis_queue_fail_stale(p_max_age interval)
returns integer language plpgsql security definer as $$
declare
  v_stale bigint;
  v_rec   record;
  v_msg_id bigint;
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

    -- Arquiva apenas mensagens visíveis/stale (read_ct = 0 ou vt expirado).
    -- Mensagens em voo (read_ct >= 1 com vt ativo) NÃO são arquivadas: o
    -- worker ainda pode concluí-las ou a própria análise decide o ack.
    select q.msg_id into v_msg_id
    from pgmq.q_analysis_jobs q
    where q.message->>'lead_id' = v_rec.lead_id::text
      and (q.read_ct = 0 or q.vt <= now())
    limit 1;

    if v_msg_id is not null then
      perform pgmq.archive('analysis_jobs', v_msg_id);
    end if;
  end loop;

  return v_stale;
end $$;
