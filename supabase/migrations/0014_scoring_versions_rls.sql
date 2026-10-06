-- Habilita RLS na tabela scoring_versions (alerta do Security Advisor: tabela
-- pública sem RLS). Sem políticas, apenas a service role acessa — que é
-- exatamente o modelo de acesso usado pela aplicação (todas as escritas
-- passam pelas rotas internas autenticadas).
--
-- A tabela era criada manualmente no Supabase Cloud e nunca foi versionada;
-- o CREATE abaixo garante que uma instalação a partir do zero reproduza o
-- schema antes do RLS.

create table if not exists public.scoring_versions (
  id uuid primary key default gen_random_uuid(),
  version text not null,
  config jsonb not null,
  is_active boolean not null default false,
  created_by text not null,
  created_at timestamptz not null default now()
);

create unique index if not exists scoring_versions_version_key
  on public.scoring_versions (version);

create unique index if not exists scoring_versions_one_active
  on public.scoring_versions (is_active) where is_active;

ALTER TABLE public.scoring_versions ENABLE ROW LEVEL SECURITY;
