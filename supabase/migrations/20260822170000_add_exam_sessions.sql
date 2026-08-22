create table if not exists public.exam_sessions (
  id text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  subject_id text not null references public.subjects(id) on delete cascade,
  chapter_id text not null references public.chapters(id) on delete cascade,
  status text not null default 'draft' check (status in ('draft','running','paused','completed')),
  target_minutes int not null default 45 check (target_minutes between 5 and 600),
  elapsed_seconds int not null default 0 check (elapsed_seconds >= 0),
  last_resumed_at timestamptz,
  started_at timestamptz,
  ended_at timestamptz,
  mcq_attempted int not null default 0 check (mcq_attempted >= 0),
  mcq_correct int not null default 0 check (mcq_correct between 0 and mcq_attempted),
  cq_attempted int not null default 0 check (cq_attempted >= 0),
  cq_correct int not null default 0 check (cq_correct between 0 and cq_attempted),
  sq_attempted int not null default 0 check (sq_attempted >= 0),
  sq_correct int not null default 0 check (sq_correct between 0 and sq_attempted),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key(user_id, id)
);

alter table public.exam_sessions enable row level security;

do $$ begin
  create policy "owner select exam_sessions" on public.exam_sessions for select to authenticated using ((select auth.uid()) = user_id);
  create policy "owner insert exam_sessions" on public.exam_sessions for insert to authenticated with check ((select auth.uid()) = user_id);
  create policy "owner update exam_sessions" on public.exam_sessions for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
  create policy "owner delete exam_sessions" on public.exam_sessions for delete to authenticated using ((select auth.uid()) = user_id);
exception when duplicate_object then null;
end $$;

create index if not exists exam_sessions_user_status_idx
  on public.exam_sessions(user_id, status, updated_at desc);
create index if not exists exam_sessions_user_chapter_idx
  on public.exam_sessions(user_id, chapter_id, updated_at desc);
