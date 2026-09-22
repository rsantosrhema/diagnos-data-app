-- Habilita RLS na tabela scoring_versions (alerta do Security Advisor: tabela
-- pública sem RLS). Sem políticas, apenas a service role acessa — que é
-- exatamente o modelo de acesso usado pela aplicação (todas as escritas
-- passam pelas rotas internas autenticadas).

ALTER TABLE public.scoring_versions ENABLE ROW LEVEL SECURITY;
