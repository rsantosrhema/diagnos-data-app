-- 0004_seed_test_data.sql
-- Seed de dados de teste para validar relacionamentos e constraints.
-- Idempotente: usa on conflict do nothing nas chaves únicas.
-- Emails identificáveis (teste@...) para não confundir com leads reais.

-- Lead de teste
insert into public.leads (name, company, phone, email, role, status)
values ('Cliente Teste', 'Empresa Teste', '11999999999', 'teste@diagnos.app', 'CTO', 'pendente')
on conflict (email) do nothing;

-- access_token de teste (um disponivel por lead)
insert into public.access_tokens (lead_id, token_hash, status, expires_at)
select l.id, 'a' || repeat('b', 63), 'disponivel', now() + interval '20 minutes'
from public.leads l
where l.email = 'teste@diagnos.app'
on conflict (token_hash) do nothing;

-- session de teste (2h)
insert into public.sessions (token_hash, lead_id, expires_at)
select 's' || repeat('c', 63), l.id, now() + interval '2 hours'
from public.leads l
where l.email = 'teste@diagnos.app'
on conflict (token_hash) do nothing;

-- session_draft de teste (1:1 por lead)
insert into public.session_drafts (lead_id, answers)
select l.id, '{"q-governance": 3}'::jsonb
from public.leads l
where l.email = 'teste@diagnos.app'
on conflict (lead_id) do nothing;

-- diagnostic de teste (1:1 por lead)
insert into public.diagnostics (lead_id, overall_score, overall_level, dimension_scores, narrative, chart_data, pdf_path)
select l.id, 3.25, 3, '[]'::jsonb, '{"summary": "diagnostico de teste"}'::jsonb, '{}'::jsonb, 'teste/diagnostico.pdf'
from public.leads l
where l.email = 'teste@diagnos.app'
on conflict (lead_id) do nothing;
