-- 0008_remove_token_flow.sql
-- Remove o fluxo de token de acesso (ADR supersedido): lead agora se cadastra
-- na landing e inicia o diagnóstico direto, sem token/sessão. O relatório passa
-- a ser gerado sob demanda pelo gerente no painel admin (enfileira pgmq).
--
-- Passos:
--   1. Limpa leads antigos sem diagnóstico concluído (teste/abandonados,
--      em cascata remove access_tokens, sessions, session_drafts, insights órfãos).
--   2. Alinha o check de status de leads ao novo fluxo (sem 'token_gerado').
--   3. Dropa access_tokens, sessions, session_drafts e a RPC mark_expired_tokens.
--
-- Re-executável: drops são idempotentes (if exists).

-- ============================================================
-- 1. Limpeza de leads antigos
-- Mantém apenas leads 'concluido' com assessment_responses (dados reais
-- do diagnóstico). Remove leads 'pendente'/'token_gerado' (nunca concluíram;
-- no novo fluxo o cadastro é direto, sem token). O delete em leads cascateia
-- para diagnostics, assessment_responses, market_insights, access_tokens,
-- sessions e session_drafts (FKs on delete cascade).
-- ============================================================
delete from public.leads l
where not (
  l.status = 'concluido'
  and exists (select 1 from public.assessment_responses ar where ar.lead_id = l.id)
);

-- ============================================================
-- 2. Status de leads: remove 'token_gerado' do domínio válido
-- (criado na migration não versionada de leads; sem drop condicional de
-- constraint no PG, recria o check garantindo o estado esperado).
-- ============================================================
do $$
declare
  v_constraint text;
begin
  select conname into v_constraint
  from pg_constraint
  where conrelid = 'public.leads'::regclass
    and contype = 'c'
    and pg_get_constraintdef(oid) like '%status%';

  if v_constraint is not null then
    execute format('alter table public.leads drop constraint %I', v_constraint);
  end if;
end $$;

alter table public.leads
  add constraint leads_status_check
  check (status in ('pendente', 'concluido'));

-- ============================================================
-- 3. Drop das tabelas do fluxo de token/sessão
-- ============================================================
drop table if exists public.session_drafts;
drop table if exists public.sessions;
drop table if exists public.access_tokens;

-- ============================================================
-- 4. RPC de expiração de tokens (usada pelo dashboard antigo)
-- ============================================================
drop function if exists public.mark_expired_tokens();
