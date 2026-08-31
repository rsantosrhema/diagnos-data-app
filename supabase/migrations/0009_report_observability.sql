-- 0009_report_observability.sql
-- Observabilidade do pipeline de relatórios (ADR-010).
-- Mudança de semântica da fila: `pgmq.pop()` apagava a mensagem ao ler
-- (at-most-once — job perdido em falha do worker e fila "sempre vazia").
-- A partir daqui: `pgmq.read()` (visibility timeout) + `pgmq.archive()` no
-- ack — retry automático se o worker cair, histórico preservado.
--
-- Passos:
--   1. market_insights ganha timestamps de estado + contador de tentativas.
--   2. Nova tabela analysis_job_logs (log por etapa do pipeline).
--   3. RPCs de fila reescritas: enqueue (dedup) / read / ack / requeue / stats.
--   4. Drop da antiga RPC analysis_queue_pop.
--
-- Re-executável (create or replace / add column if not exists).

-- ============================================================
-- 1. market_insights: estado por job
-- ============================================================
alter table public.market_insights
  add column if not exists queued_at             timestamptz,
  add column if not exists processing_started_at timestamptz,
  add column if not exists completed_at          timestamptz,
  add column if not exists attempts              integer not null default 0;

-- ============================================================
-- 2. analysis_job_logs: log de processamento por etapa
-- ============================================================
create table if not exists public.analysis_job_logs (
  id          uuid primary key default gen_random_uuid(),
  lead_id     uuid not null references public.leads(id) on delete cascade,
  step        text not null
              check (step in ('enqueued','started','researcher','analyst',
                              'writer','pdf','email','completed','failed')),
  message     text,
  duration_ms integer,
  created_at  timestamptz not null default now()
);

create index if not exists analysis_job_logs_lead_created_idx
  on public.analysis_job_logs(lead_id, created_at);

create index if not exists analysis_job_logs_created_idx
  on public.analysis_job_logs(created_at);

-- RLS: negar acesso anon/auth; só service-role (server) acessa
alter table public.analysis_job_logs enable row level security;
-- nenhuma policy para anon/authenticated => acesso negado por padrão
-- service_role bypassa RLS

-- ============================================================
-- 3. RPCs da fila (security definer — não expõe pgmq_public via PostgREST)
-- ============================================================

-- Enfileira um job; dedup por lead: se já existe job pendente/processando
-- para o lead, não re-enfileira (evita custo duplo de LLM).
-- Retorna { ok, queued } — queued=false indica job já em andamento.
create or replace function public.analysis_queue_enqueue(p_lead_id uuid)
returns jsonb language plpgsql security definer as $$
declare
  v_existing text;
  v_msg_id   bigint;
begin
  select mi.status into v_existing
  from public.market_insights mi
  where mi.lead_id = p_lead_id;

  if v_existing in ('pendente', 'processando') then
    return jsonb_build_object('ok', true, 'queued', false);
  end if;

  -- Upsert por lead_id: estado pendente + queued_at (reseta erro/tentativas
  -- de uma tentativa anterior; cria a linha se for o primeiro enqueue).
  insert into public.market_insights
    (lead_id, status, queued_at, processing_started_at, completed_at, attempts, error)
  values
    (p_lead_id, 'pendente', now(), null, null, 0, null)
  on conflict (lead_id) do update
    set status = 'pendente',
        queued_at = now(),
        processing_started_at = null,
        completed_at = null,
        attempts = 0,
        error = null,
        updated_at = now();

  insert into public.analysis_job_logs (lead_id, step, message)
  values (p_lead_id, 'enqueued', 'Job enfileirado na fila analysis_jobs');

  select pgmq.send('analysis_jobs',
                   jsonb_build_object('lead_id', p_lead_id::text))
  into v_msg_id;

  if v_msg_id is null then
    raise exception 'analysis_jobs: falha ao enviar mensagem';
  end if;

  return jsonb_build_object('ok', true, 'queued', true);
end $$;

-- Lê um job da fila (pgmq.read com VT de 600s) e marca o lead como
-- processando. A mensagem NÃO é apagada — fica invisível por 10 min.
create or replace function public.analysis_queue_read()
returns jsonb language plpgsql security definer as $$
declare
  v_msg record;
  v_lead uuid;
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

-- Confirma/arquiva um job: sucesso (analisado) ou falha (falha + erro).
-- Arquiva a mensagem no pgmq (preserva histórico em pgmq_archived).
create or replace function public.analysis_queue_ack(
  p_msg_id    bigint,
  p_lead_id   uuid,
  p_status    text,
  p_error     text default null,
  p_duration_ms integer default null
) returns void language plpgsql security definer as $$
begin
  if p_status = 'analisado' then
    update public.market_insights
       set status = 'analisado',
           completed_at = now(),
           error = null,
           updated_at = now()
     where lead_id = p_lead_id;
    insert into public.analysis_job_logs (lead_id, step, message, duration_ms)
    values (p_lead_id, 'completed', 'Pipeline de agentes concluído', p_duration_ms);
  elsif p_status = 'falha' then
    update public.market_insights
       set status = 'falha',
           error = coalesce(p_error, 'erro desconhecido'),
           updated_at = now()
     where lead_id = p_lead_id;
    insert into public.analysis_job_logs (lead_id, step, message, duration_ms)
    values (p_lead_id, 'failed', coalesce(p_error, 'erro desconhecido'), p_duration_ms);
  else
    raise exception 'analysis_queue_ack: status inválido %', p_status;
  end if;

  if p_msg_id is not null then
    perform pgmq.archive('analysis_jobs', p_msg_id);
  end if;
end $$;

-- Retry manual: torna a mensagem visível imediatamente (set_vt 0).
create or replace function public.analysis_queue_requeue(p_msg_id bigint)
returns void language plpgsql security definer as $$
begin
  perform pgmq.set_vt('analysis_jobs', p_msg_id, 0);
end $$;

-- Timeout de staleness: marca como falha jobs que permanecem em
-- 'pendente'/'processando' por mais tempo que o limite informado (ex.: 30 min).
-- Jobs 'processando' cuja mensagem voltou à fila (VT expirou e o worker caiu)
-- também são encerrados aqui. Usado no início de cada drain do worker.
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

    -- Se a mensagem ainda está ativa na fila, arquiva para não ser reprocessada
    perform pgmq.archive(
      'analysis_jobs',
      (select q.msg_id from pgmq.q_analysis_jobs q
        where q.message->>'lead_id' = v_rec.lead_id::text)
    );
  end loop;

  return v_stale;
end $$;

-- Estatísticas da fila + estado por status do market_insights.
create or replace function public.analysis_queue_stats()
returns jsonb language plpgsql security definer as $$
declare
  v_metrics  record;
  v_pendente bigint;
  v_processando bigint;
  v_analisado bigint;
  v_falha    bigint;
begin
  select * into v_metrics from pgmq.metrics('analysis_jobs');

  select count(*) into v_pendente    from public.market_insights where status = 'pendente';
  select count(*) into v_processando from public.market_insights where status = 'processando';
  select count(*) into v_analisado   from public.market_insights where status = 'analisado';
  select count(*) into v_falha       from public.market_insights where status = 'falha';

  return jsonb_build_object(
    'queue_length', coalesce(v_metrics.queue_length, 0),
    'oldest_age_sec', v_metrics.oldest_msg_age_sec,
    'pendente', v_pendente,
    'processando', v_processando,
    'analisado', v_analisado,
    'falha', v_falha
  );
end $$;

-- ============================================================
-- 4. Drop da antiga RPC (substituída por read/ack)
-- ============================================================
drop function if exists public.analysis_queue_pop();
