-- 0001_leads.sql
-- Tabela base de leads (cadastro na landing → screener).
-- Reconstruída para bancos novos: a migration original não foi versionada.
-- Padrão das demais: RLS habilitado, sem policies (service-role only).

create extension if not exists citext;

create table if not exists public.leads (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  company    text not null,
  phone      text not null,
  email      citext not null unique,
  role       text not null,
  status     text not null default 'pendente'
             check (status in ('pendente', 'concluido', 'token_gerado')),
  created_at timestamptz not null default now()
);

-- consent/consent_at são adicionados na 0005 (fluxo público LGPD).
-- company/phone ficam nullable na 0005.

-- RLS: negar acesso anon/auth; só service-role acessa
alter table public.leads enable row level security;
-- nenhuma policy para anon/authenticated => acesso negado por padrão
-- service_role bypassa RLS
