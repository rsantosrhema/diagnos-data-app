-- validate_data_model.sql
-- Valida relacionamentos (FK) e constraints (unique, check, cascade) do modelo.
-- Re-executável (idempotente) e autossuficiente: cria um lead temporário,
-- roda as verificações e o remove ao final. Falha com exception (saída
-- não-zero) se algo estiver errado.
--
-- Uso: rodar via supabase-mcp execute_sql (ou psql). Espera-se "PASS" sem exception.

do $$
declare
  v_lead_id uuid;
  v_orphans bigint;
begin
  -- ============================================================
  -- 0. Lead temporário para os testes de constraint
  -- ============================================================
  insert into public.leads (name, company, phone, email, role, status)
  values ('Validacao', 'Validacao', '1', 'validate@diagnos.app', 'CTO', 'pendente')
  on conflict (email) do update set name = 'Validacao';

  select id into v_lead_id from public.leads where email = 'validate@diagnos.app';

  delete from public.diagnostics where lead_id = v_lead_id;
  delete from public.assessment_responses where lead_id = v_lead_id;
  delete from public.market_insights where lead_id = v_lead_id;

  -- ============================================================
  -- 1. FKs: nenhum orfao (todo filho aponta para um lead existente)
  -- ============================================================
  select count(*) into v_orphans
  from public.diagnostics d
  left join public.leads l on l.id = d.lead_id
  where l.id is null;
  if v_orphans > 0 then
    raise exception 'FAIL: diagnostics com lead_id orfao (% linhas)', v_orphans;
  end if;

  select count(*) into v_orphans
  from public.assessment_responses ar
  left join public.leads l on l.id = ar.lead_id
  where l.id is null;
  if v_orphans > 0 then
    raise exception 'FAIL: assessment_responses com lead_id orfao (% linhas)', v_orphans;
  end if;

  select count(*) into v_orphans
  from public.market_insights mi
  left join public.leads l on l.id = mi.lead_id
  where l.id is null;
  if v_orphans > 0 then
    raise exception 'FAIL: market_insights com lead_id orfao (% linhas)', v_orphans;
  end if;

  -- ============================================================
  -- 2. Unique constraints (rejeitam duplicidade)
  -- ============================================================
  -- Insere as primeiras linhas (deve funcionar)...
  insert into public.diagnostics (lead_id, overall_score, overall_level)
  values (v_lead_id, 4.0, 4);

  insert into public.assessment_responses (lead_id, context, answers, commercial_answer, consent, agent_payload)
  values (v_lead_id, '{}'::jsonb, '[]'::jsonb, '{}'::jsonb, '{}'::jsonb, '{}'::jsonb);

  insert into public.market_insights (lead_id)
  values (v_lead_id);

  -- ...e tenta duplicar (deve falhar com unique_violation)
  -- leads.email
  begin
    insert into public.leads (name, company, phone, email, role, status)
    values ('Dup', 'Dup', '1', 'validate@diagnos.app', 'CTO', 'pendente');
    raise exception 'FAIL: leads.email nao rejeitou duplicidade';
  exception when unique_violation then
    null; -- esperado
  end;

  -- diagnostics.lead_id (1:1)
  begin
    insert into public.diagnostics (lead_id, overall_score, overall_level)
    values (v_lead_id, 4.5, 4);
    raise exception 'FAIL: diagnostics.lead_id nao rejeitou duplicidade';
  exception when unique_violation then
    null; -- esperado
  end;

  -- assessment_responses.lead_id (1:1)
  begin
    insert into public.assessment_responses (lead_id, context, answers, commercial_answer, consent, agent_payload)
    values (v_lead_id, '{}'::jsonb, '[]'::jsonb, '{}'::jsonb, '{}'::jsonb, '{}'::jsonb);
    raise exception 'FAIL: assessment_responses.lead_id nao rejeitou duplicidade';
  exception when unique_violation then
    null; -- esperado
  end;

  -- market_insights.lead_id (1:1)
  begin
    insert into public.market_insights (lead_id)
    values (v_lead_id);
    raise exception 'FAIL: market_insights.lead_id nao rejeitou duplicidade';
  exception when unique_violation then
    null; -- esperado
  end;

  -- ============================================================
  -- 3. Check constraints (rejeitam valores invalidos)
  -- ============================================================
  -- leads.status (dominio do novo fluxo: pendente | concluido)
  begin
    insert into public.leads (name, company, phone, email, role, status)
    values ('Bad', 'Bad', '1', 'bad-status-validate@diagnos.app', 'CTO', 'token_gerado');
    raise exception 'FAIL: leads.status nao rejeitou token_gerado';
  exception when check_violation then
    null; -- esperado
  end;

  -- diagnostics.overall_level fora de 0-5
  begin
    insert into public.diagnostics (lead_id, overall_score, overall_level)
    values (v_lead_id, 3.0, 6);
    raise exception 'FAIL: diagnostics.overall_level nao rejeitou 6';
  exception when check_violation then
    null; -- esperado
  end;

  -- diagnostics.overall_score fora de 0-5
  begin
    insert into public.diagnostics (lead_id, overall_score, overall_level)
    values (v_lead_id, 5.01, 5);
    raise exception 'FAIL: diagnostics.overall_score nao rejeitou 5.01';
  exception when check_violation then
    null; -- esperado
  end;

  -- ============================================================
  -- 4. FK rejeita lead_id inexistente
  -- ============================================================
  begin
    insert into public.diagnostics (lead_id, overall_score, overall_level)
    values (gen_random_uuid(), 3.0, 3);
    raise exception 'FAIL: diagnostics FK nao rejeitou lead_id inexistente';
  exception when foreign_key_violation then
    null; -- esperado
  end;

  -- ============================================================
  -- 5. Cascade: deletar lead remove filhos
  -- ============================================================
  delete from public.leads where id = v_lead_id;

  select count(*) into v_orphans from public.diagnostics where lead_id = v_lead_id;
  if v_orphans > 0 then
    raise exception 'FAIL: cascade nao removeu diagnostics';
  end if;

  select count(*) into v_orphans from public.assessment_responses where lead_id = v_lead_id;
  if v_orphans > 0 then
    raise exception 'FAIL: cascade nao removeu assessment_responses';
  end if;

  select count(*) into v_orphans from public.market_insights where lead_id = v_lead_id;
  if v_orphans > 0 then
    raise exception 'FAIL: cascade nao removeu market_insights';
  end if;

  -- ============================================================
  -- PASS
  -- ============================================================
  raise notice 'PASS: todos os relacionamentos e constraints validados';
end $$;
