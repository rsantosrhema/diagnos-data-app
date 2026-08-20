-- 0003_diagnostics.sql
-- Tabela central que persiste o resultado do diagnóstico por lead.
-- Segue o padrão das migrations 0001/0002: RLS habilitado, sem policies
-- para anon/authenticated (acesso apenas via service-role).

create table if not exists public.diagnostics (
  id               uuid primary key default gen_random_uuid(),
  lead_id          uuid not null references public.leads(id) on delete cascade,
  overall_score    numeric(3,2) not null check (overall_score >= 0 and overall_score <= 5),
  overall_level    smallint not null check (overall_level between 0 and 5),
  dimension_scores jsonb not null default '[]'::jsonb,
  narrative        jsonb not null default '{}'::jsonb,
  chart_data       jsonb not null default '{}'::jsonb,
  pdf_path         text,
  created_at       timestamptz not null default now(),
  -- um diagnóstico por lead (ADR-003)
  unique (lead_id)
);

create index if not exists diagnostics_lead_id_idx on public.diagnostics(lead_id);

-- RLS: negar acesso anon/auth; só service-role (server) acessa
alter table public.diagnostics enable row level security;
-- nenhuma policy para anon/authenticated => acesso negado por padrão
-- service_role bypassa RLS
