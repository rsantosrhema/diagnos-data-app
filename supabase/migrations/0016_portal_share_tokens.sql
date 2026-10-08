-- 0016_portal_share_tokens.sql
-- Tokens opacos do link público /r/[token] (portal-analise).
-- Segue o padrão das migrations 0003/0005/0007: RLS habilitado, sem policies
-- para anon/authenticated (acesso apenas via service-role).

create table if not exists public.share_tokens (
  id          uuid primary key default gen_random_uuid(),
  lead_id     uuid not null references public.leads(id) on delete cascade,
  token_hash  text not null unique,
  expires_at  timestamptz not null,
  revoked_at  timestamptz null,
  created_by  uuid null,
  created_at  timestamptz not null default now()
);

create index if not exists share_tokens_lead_id_idx on public.share_tokens(lead_id);

-- RLS: negar acesso anon/auth; só service-role (server) acessa
alter table public.share_tokens enable row level security;
-- sem policies para anon/authenticated: service-role only
