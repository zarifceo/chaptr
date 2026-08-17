alter table public.study_sessions
  add column if not exists subject_id text references public.subjects(id) on delete cascade,
  add column if not exists chapter_id text references public.chapters(id) on delete cascade,
  add column if not exists mode text not null default 'focus' check (mode in ('focus','exam')),
  add column if not exists completed boolean not null default false,
  add column if not exists questions_attempted int,
  add column if not exists questions_correct int;

create index if not exists study_sessions_user_started_idx
  on public.study_sessions(user_id, started_at desc);

create table if not exists public.study_resources (
  id text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  subject_id text not null references public.subjects(id) on delete cascade,
  chapter_id text not null references public.chapters(id) on delete cascade,
  title text not null,
  url text not null,
  kind text not null default 'other' check (kind in ('textbook','question-bank','video','notes','website','other')),
  note text,
  archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key(user_id, id)
);

create index if not exists study_resources_user_chapter_idx
  on public.study_resources(user_id, chapter_id, updated_at desc);
