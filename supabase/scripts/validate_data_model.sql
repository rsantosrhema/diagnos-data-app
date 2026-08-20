-- validate_data_model.sql
-- Valida relacionamentos (FK) e constraints (unique, check, cascade) do modelo.
-- Re-executável (idempotente). Falha com exception (saída não-zero) se algo estiver errado.
--
-- Uso: rodar via supabase-mcp execute_sql (ou psql). Espera-se "PASS" sem exception.

do $$
declare
  v_lead_id uuid;
  v_orphans bigint;
  v_ok boolean;
begin
  -- Localiza o lead de teste
  select id into v_lead_id from public.leads where email = 'teste@diagnos.app';
  if v_lead_id is null then
    raise exception 'FAIL: lead de teste nao encontrado (rode o seed 0004)';
  end if;

  -- ============================================================
  -- 1. FKs: nenhum orfao (todo filho aponta para um lead existente)
  -- ============================================================
  select count(*) into v_orphans
  from public.access_tokens at
  left join public.leads l on l.id = at.lead_id
  where l.id is null;
  if v_orphans > 0 then
    raise exception 'FAIL: access_tokens com lead_id orfao (% linhas)', v_orphans;
  end if;

  select count(*) into v_orphans
  from public.sessions s
  left join public.leads l on l.id = s.lead_id
  where l.id is null;
  if v_orphans > 0 then
    raise exception 'FAIL: sessions com lead_id orfao (% linhas)', v_orphans;
  end if;

  select count(*) into v_orphans
  from public.session_drafts sd
  left join public.leads l on l.id = sd.lead_id
  where l.id is null;
  if v_orphans > 0 then
    raise exception 'FAIL: session_drafts com lead_id orfao (% linhas)', v_orphans;
  end if;

  select count(*) into v_orphans
  from public.diagnostics d
  left join public.leads l on l.id = d.lead_id
  where l.id is null;
  if v_orphans > 0 then
    raise exception 'FAIL: diagnostics com lead_id orfao (% linhas)', v_orphans;
  end if;

  -- ============================================================
  -- 2. Unique constraints (rejeitam duplicidade)
  -- ============================================================
  -- leads.email
  begin
    insert into public.leads (name, company, phone, email, role, status)
    values ('Dup', 'Dup', '1', 'teste@diagnos.app', 'CTO', 'pendente');
    raise exception 'FAIL: leads.email nao rejeitou duplicidade';
  exception when unique_violation then
    null; -- esperado
  end;

  -- access_tokens.token_hash
  begin
    insert into public.access_tokens (lead_id, token_hash, status, expires_at)
    values (v_lead_id, 'a' || repeat('b', 63), 'disponivel', now() + interval '20 minutes');
    raise exception 'FAIL: access_tokens.token_hash nao rejeitou duplicidade';
  exception when unique_violation then
    null; -- esperado
  end;

  -- one_active_token: so um 'disponivel' por lead
  begin
    insert into public.access_tokens (lead_id, token_hash, status, expires_at)
    values (v_lead_id, 'z' || repeat('9', 63), 'disponivel', now() + interval '20 minutes');
    raise exception 'FAIL: one_active_token nao rejeitou segundo token disponivel';
  exception when unique_violation then
    null; -- esperado
  end;

  -- session_drafts.lead_id (1:1)
  begin
    insert into public.session_drafts (lead_id, answers)
    values (v_lead_id, '{}'::jsonb);
    raise exception 'FAIL: session_drafts.lead_id nao rejeitou duplicidade';
  exception when unique_violation then
    null; -- esperado
  end;

  -- diagnostics.lead_id (1:1)
  begin
    insert into public.diagnostics (lead_id, overall_score, overall_level)
    values (v_lead_id, 4.0, 4);
    raise exception 'FAIL: diagnostics.lead_id nao rejeitou duplicidade';
  exception when unique_violation then
    null; -- esperado
  end;

  -- ============================================================
  -- 3. Check constraints (rejeitam valores invalidos)
  -- ============================================================
  -- leads.status
  begin
    insert into public.leads (name, company, phone, email, role, status)
    values ('Bad', 'Bad', '1', 'bad-status@diagnos.app', 'CTO', 'invalido');
    raise exception 'FAIL: leads.status nao rejeitou valor invalido';
  exception when check_violation then
    null; -- esperado
  end;

  -- access_tokens.status
  begin
    insert into public.access_tokens (lead_id, token_hash, status, expires_at)
    values (v_lead_id, 'q' || repeat('7', 63), 'invalido', now() + interval '20 minutes');
    raise exception 'FAIL: access_tokens.status nao rejeitou valor invalido';
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
  -- Cria um lead temporario com filhos, captura o id, deleta, e confirma
  -- que nenhum filho referencia o id deletado (cascade removeu).
  insert into public.leads (name, company, phone, email, role, status)
  values ('Cascade', 'Cascade', '1', 'cascade@diagnos.app', 'CTO', 'pendente')
  on conflict (email) do nothing;

  select id into v_lead_id from public.leads where email = 'cascade@diagnos.app';

  insert into public.access_tokens (lead_id, token_hash, status, expires_at)
  values (v_lead_id, 'c' || repeat('1', 63), 'disponivel', now() + interval '20 minutes')
  on conflict (token_hash) do nothing;

  insert into public.sessions (token_hash, lead_id, expires_at)
  values ('c' || repeat('2', 63), v_lead_id, now() + interval '2 hours')
  on conflict (token_hash) do nothing;

  insert into public.session_drafts (lead_id, answers)
  values (v_lead_id, '{}'::jsonb)
  on conflict (lead_id) do nothing;

  insert into public.diagnostics (lead_id, overall_score, overall_level)
  values (v_lead_id, 2.0, 2)
  on conflict (lead_id) do nothing;

  delete from public.leads where id = v_lead_id;

  select count(*) into v_orphans from public.access_tokens where lead_id = v_lead_id;
  if v_orphans > 0 then
    raise exception 'FAIL: cascade nao removeu access_tokens';
  end if;

  select count(*) into v_orphans from public.sessions where lead_id = v_lead_id;
  if v_orphans > 0 then
    raise exception 'FAIL: cascade nao removeu sessions';
  end if;

  select count(*) into v_orphans from public.session_drafts where lead_id = v_lead_id;
  if v_orphans > 0 then
    raise exception 'FAIL: cascade nao removeu session_drafts';
  end if;

  select count(*) into v_orphans from public.diagnostics where lead_id = v_lead_id;
  if v_orphans > 0 then
    raise exception 'FAIL: cascade nao removeu diagnostics';
  end if;

  -- ============================================================
  -- PASS
  -- ============================================================
  raise notice 'PASS: todos os relacionamentos e constraints validados';
end $$;
