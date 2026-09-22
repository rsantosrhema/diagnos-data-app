-- 0002_token_flow.sql
-- Fluxo antigo de token/sessão (superseded pela 0008_remove_token_flow).
-- Reconstruída para bancos novos: a migration original não foi versionada.
-- Necessária porque 0004 (seed) insere access_tokens/sessions/session_drafts
-- e 0008 dropa essas tabelas + a RPC mark_expired_tokens.
-- Padrão: RLS habilitado, sem policies (service-role only).

-- 1. access_tokens: um token disponível por lead
create table if not exists public.access_tokens (
  id         uuid primary key default gen_random_uuid(),
  lead_id    uuid not null references public.leads(id) on delete cascade,
  token_hash text not null unique,
  status     text not null default 'disponivel'
             check (status in ('disponivel', 'utilizado', 'expirado')),
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists access_tokens_lead_id_idx on public.access_tokens(lead_id);

alter table public.access_tokens enable row level security;

-- 2. sessions: sessão ativa a partir de um token válido
create table if not exists public.sessions (
  id         uuid primary key default gen_random_uuid(),
  token_hash text not null unique,
  lead_id    uuid not null references public.leads(id) on delete cascade,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists sessions_lead_id_idx on public.sessions(lead_id);

alter table public.sessions enable row level security;

-- 3. session_draft: rascunho de respostas 1:1 por lead
create table if not exists public.session_drafts (
  lead_id    uuid primary key references public.leads(id) on delete cascade,
  answers    jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.session_drafts enable row level security;

-- 4. RPC usada pelo dashboard antigo (dropada na 0008)
create or replace function public.mark_expired_tokens()
returns void
language plpgsql
security definer
as $$
begin
  update public.access_tokens
     set status = 'expirado'
   where status = 'disponivel'
     and expires_at < now();
end $$;
