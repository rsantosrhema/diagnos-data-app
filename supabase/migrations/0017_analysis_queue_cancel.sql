-- Cancelamento manual de um job de análise pelo gerente.
-- Marca o lead como 'falha' (liberando o reprocessamento) e arquiva qualquer
-- mensagem pendente do lead no pgmq para o worker não retomá-la.
create or replace function public.analysis_queue_cancel(p_lead_id uuid)
returns jsonb language plpgsql security definer as $$
declare
  v_status text;
  v_msg_id bigint;
begin
  select mi.status into v_status
  from public.market_insights mi
  where mi.lead_id = p_lead_id
  for update;

  if v_status is null or v_status not in ('pendente', 'processando') then
    return jsonb_build_object('ok', true, 'cancelled', false);
  end if;

  update public.market_insights
     set status = 'falha',
         error = 'Cancelado pelo gerente',
         updated_at = now()
   where lead_id = p_lead_id;

  insert into public.analysis_job_logs (lead_id, step, message)
  values (p_lead_id, 'failed', 'Job cancelado manualmente pelo gerente');

  for v_msg_id in
    select q.msg_id
    from pgmq.q_analysis_jobs q
    where q.message->>'lead_id' = p_lead_id::text
  loop
    perform pgmq.archive('analysis_jobs', v_msg_id);
  end loop;

  return jsonb_build_object('ok', true, 'cancelled', true);
end $$;

revoke execute on function public.analysis_queue_cancel(uuid) from public, anon, authenticated;
grant execute on function public.analysis_queue_cancel(uuid) to service_role;
