-- 0019_market_insights_arsenal.sql
-- Arsenal Comercial: coluna jsonb em market_insights e novos steps no log do pipeline.
-- Re-executável (add column if not exists / drop constraint if exists).

alter table public.market_insights
  add column if not exists arsenal jsonb;

alter table public.analysis_job_logs
  drop constraint if exists analysis_job_logs_step_check;

alter table public.analysis_job_logs
  add constraint analysis_job_logs_step_check
  check (step in ('enqueued','started','researcher','analyst',
                  'writer','pdf','email','completed','failed',
                  'pdf_failed','email_failed','requeue',
                  'arsenal','arsenal_failed'));
