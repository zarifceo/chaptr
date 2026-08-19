alter table public.study_tasks
  add column if not exists workflow_phase text
  check (workflow_phase in ('learn', 'revise', 'practice', 'exam'));

notify pgrst, 'reload schema';
