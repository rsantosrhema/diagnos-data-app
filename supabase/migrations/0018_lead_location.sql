-- 0018_lead_location.sql
-- Localização da empresa no cadastro do lead (cidade + UF), usada como
-- contexto na busca de concorrentes. Colunas nullable: leads antigos
-- permanecem sem localização.

alter table public.leads
  add column city text,
  add column state text;

alter table public.leads
  add constraint leads_state_uf_check
  check (state is null or state in ('AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'));
