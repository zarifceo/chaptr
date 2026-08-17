alter table public.study_tasks add column if not exists study_method text;
alter table public.study_tasks add column if not exists recommendation_factors jsonb not null default '{}'::jsonb;
