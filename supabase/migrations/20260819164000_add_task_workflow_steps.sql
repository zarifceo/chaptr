alter table public.study_tasks
  add column if not exists workflow_steps jsonb;

notify pgrst, 'reload schema';
