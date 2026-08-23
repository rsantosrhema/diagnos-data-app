-- 0005_screener_responses.sql
-- Ajusta leads (company/phone nullable, consent) e cria assessment_responses
-- para o fluxo público de autoavaliação (ADR-008).

-- 1. leads: company e phone ficam nullable (fluxo público não coleta)
alter table public.leads alter column company drop not null;
alter table public.leads alter column phone drop not null;

-- 2. leads: consentimento LGPD
alter table public.leads add column if not exists consent boolean not null default false;
alter table public.leads add column if not exists consent_at timestamptz;

-- 3. assessment_responses: respostas completas + agent_payload
create table if not exists public.assessment_responses (
  id                uuid primary key default gen_random_uuid(),
  lead_id           uuid not null references public.leads(id) on delete cascade,
  context           jsonb not null,
  answers           jsonb not null,
  commercial_answer jsonb not null,
  consent           jsonb not null,
  agent_payload     jsonb not null,
  created_at        timestamptz not null default now(),
  unique (lead_id)
);

create index if not exists assessment_responses_lead_id_idx
  on public.assessment_responses(lead_id);

-- RLS: service-role only (padrão das demais tabelas)
alter table public.assessment_responses enable row level security;
