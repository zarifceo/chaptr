create extension if not exists pgcrypto;

create type public.mastery_status as enum ('not-started','learning','practising','exam-ready','needs-revision');
create type public.task_status as enum ('planned','in-progress','completed','skipped');

create table public.subjects (
  id text primary key,
  name text not null,
  short_name text not null,
  strength_level text not null,
  priority int not null default 50 check (priority between 0 and 100),
  maintenance_target int not null default 1,
  workflow_kind text not null,
  created_at timestamptz not null default now()
);

create table public.chapters (
  id text primary key,
  subject_id text not null references public.subjects(id) on delete cascade,
  chapter_number int,
  title text not null,
  division text,
  note text,
  question_formats text[] not null default '{}',
  syllabus_eligible boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.marks_distributions (
  id uuid primary key default gen_random_uuid(),
  subject_id text not null references public.subjects(id) on delete cascade,
  part text,
  question_type text not null,
  choice_rule text not null,
  marks int not null check (marks >= 0),
  unique(subject_id, part, question_type)
);

create table public.exams (
  id text primary key,
  name text not null,
  starts_on date not null,
  ends_on date not null,
  stage text not null,
  syllabus_scope text not null
);

create table public.chapter_progress (
  id text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  chapter_id text not null references public.chapters(id) on delete cascade,
  status public.mastery_status not null default 'not-started',
  confidence int not null default 1 check (confidence between 1 and 5),
  last_studied timestamptz,
  next_review timestamptz,
  questions_attempted int not null default 0,
  questions_correct int not null default 0,
  timed_score numeric,
  updated_at timestamptz not null default now(),
  primary key(user_id, id),
  unique(user_id, chapter_id)
);

create table public.study_tasks (
  id text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  subject_id text not null references public.subjects(id),
  chapter_id text not null references public.chapters(id),
  title text not null,
  origin text not null check (origin in ('recommended','manual')),
  pinned boolean not null default false,
  planned_start timestamptz,
  planned_end timestamptz,
  duration_minutes int not null default 45,
  priority_score numeric not null default 0,
  priority_explanation text,
  status public.task_status not null default 'planned',
  current_step int not null default 0,
  updated_at timestamptz not null default now(),
  primary key(user_id, id)
);

create table public.study_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  task_id text not null,
  started_at timestamptz not null,
  ended_at timestamptz,
  focused_seconds int not null default 0,
  pause_seconds int not null default 0,
  updated_at timestamptz not null default now(),
  foreign key(user_id, task_id) references public.study_tasks(user_id, id) on delete cascade
);

create table public.journal_entries (
  id text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  task_id text,
  subject_id text not null references public.subjects(id),
  chapter_id text not null references public.chapters(id),
  learning_goal text,
  resources text[] not null default '{}',
  minutes int not null default 0,
  attempted int not null default 0,
  correct int not null default 0,
  confidence_before int check (confidence_before between 1 and 5),
  confidence_after int check (confidence_after between 1 and 5),
  mistakes_text text,
  written_score numeric,
  reflection text,
  next_action text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key(user_id, id)
);

create table public.mistakes (
  id text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  subject_id text not null references public.subjects(id),
  chapter_id text not null references public.chapters(id),
  prompt text not null,
  error_type text not null,
  explanation text,
  reattempt_date date,
  resolved boolean not null default false,
  resolved_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key(user_id, id)
);

create table public.mock_results (
  id text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  subject_id text not null references public.subjects(id),
  paper_type text,
  score numeric not null,
  total numeric not null,
  duration_minutes int,
  breakdown jsonb not null default '{}',
  taken_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key(user_id, id)
);

create table public.calendar_links (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  task_id text not null,
  calendar_id text not null default 'primary',
  event_id text not null,
  event_etag text,
  conflict_state text,
  last_app_update timestamptz,
  last_calendar_update timestamptz,
  updated_at timestamptz not null default now(),
  unique(user_id, event_id),
  foreign key(user_id, task_id) references public.study_tasks(user_id, id) on delete cascade
);

create table public.sync_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  encrypted_access_token text,
  encrypted_refresh_token text,
  token_expiry timestamptz,
  calendar_sync_token text,
  watch_channel_id text,
  watch_resource_id text,
  watch_expires_at timestamptz,
  last_successful_sync timestamptz,
  updated_at timestamptz not null default now()
);

alter table public.subjects enable row level security;
alter table public.chapters enable row level security;
alter table public.marks_distributions enable row level security;
alter table public.exams enable row level security;
alter table public.chapter_progress enable row level security;
alter table public.study_tasks enable row level security;
alter table public.study_sessions enable row level security;
alter table public.journal_entries enable row level security;
alter table public.mistakes enable row level security;
alter table public.mock_results enable row level security;
alter table public.calendar_links enable row level security;
alter table public.sync_state enable row level security;

create policy "authenticated reads subjects" on public.subjects for select to authenticated using (true);
create policy "authenticated reads chapters" on public.chapters for select to authenticated using (true);
create policy "authenticated reads marks" on public.marks_distributions for select to authenticated using (true);
create policy "authenticated reads exams" on public.exams for select to authenticated using (true);

do $$ declare t text; begin
  foreach t in array array['chapter_progress','study_tasks','study_sessions','journal_entries','mistakes','mock_results','calendar_links','sync_state'] loop
    execute format('create policy "owner select %1$s" on public.%1$I for select to authenticated using ((select auth.uid()) = user_id)', t);
    execute format('create policy "owner insert %1$s" on public.%1$I for insert to authenticated with check ((select auth.uid()) = user_id)', t);
    execute format('create policy "owner update %1$s" on public.%1$I for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id)', t);
    execute format('create policy "owner delete %1$s" on public.%1$I for delete to authenticated using ((select auth.uid()) = user_id)', t);
  end loop;
end $$;

create index study_tasks_user_status on public.study_tasks(user_id, status);
create index journal_entries_user_created on public.journal_entries(user_id, created_at desc);
create index mistakes_user_open on public.mistakes(user_id, resolved, reattempt_date);
create index calendar_links_user_task on public.calendar_links(user_id, task_id);

comment on table public.marks_distributions is 'Official question-type marks only. Never infer per-chapter marks.';


