alter table public.chapter_progress
  add column if not exists difficulty int not null default 3 check (difficulty between 1 and 5);

notify pgrst, 'reload schema';
