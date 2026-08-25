-- 0006_sessions_is_master.sql
-- Adiciona coluna is_master em sessions para suportar token master de testes.
-- O token master cria sessões com is_master=true que ignoram a trava de reenvio.

alter table public.sessions
  add column if not exists is_master boolean not null default false;
