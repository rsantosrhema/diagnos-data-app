-- 0007_market_insights.sql
-- Fila assíncrona (pgmq) + persistência do pipeline de agentes (ADR-009).
-- Segue o padrão das migrations 0003/0005: RLS habilitado, sem policies
-- para anon/authenticated (acesso apenas via service-role).

-- 1. Fila de análise via Supabase Queue (pgmq)
create extension if not exists pgmq;

select pgmq.create('analysis_jobs');

-- 2. market_insights: resultado completo da análise por lead (1:1)
create table if not exists public.market_insights (
  id         uuid primary key default gen_random_uuid(),
  lead_id    uuid not null unique references public.leads(id) on delete cascade,
  research   jsonb not null default '{}'::jsonb,
  analysis   jsonb not null default '{}'::jsonb,
  insights   jsonb not null default '[]'::jsonb,
  sources    jsonb not null default '[]'::jsonb,
  status     text not null default 'pendente'
             check (status in ('pendente','processando','analisado','falha')),
  error      text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists market_insights_lead_id_idx on public.market_insights(lead_id);

-- RLS: negar acesso anon/auth; só service-role (server) acessa
alter table public.market_insights enable row level security;
-- nenhuma policy para anon/authenticated => acesso negado por padrão
-- service_role bypassa RLS

-- 3. Wrappers de fila (service-role via supabase.rpc) — security definer
-- não expõe pgmq_public via PostgREST.
create or replace function public.analysis_queue_enqueue(p_lead_id uuid)
returns void language plpgsql security definer as $$
begin
  perform pgmq.send('analysis_jobs', jsonb_build_object('lead_id', p_lead_id::text));
end $$;

create or replace function public.analysis_queue_pop()
returns jsonb language plpgsql security definer as $$
declare
  msg record;
begin
  select * into msg from pgmq.pop('analysis_jobs');
  if msg.msg_id is null then return null; end if;
  return jsonb_build_object('msg_id', msg.msg_id, 'lead_id', msg.message->>'lead_id');
end $$;
