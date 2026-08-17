alter table public.study_tasks
  add column if not exists deferred_until timestamptz;

comment on column public.study_tasks.deferred_until is 'When an unfinished task becomes eligible for adaptive planning again.';
