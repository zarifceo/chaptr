create table if not exists public.learning_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  preferred_methods text[] not null default array['textbook', 'question-bank'],
  preferred_resource_kinds text[] not null default array['textbook', 'question-bank'],
  session_length_minutes integer not null default 45 check (session_length_minutes between 15 and 180),
  sessions_per_day integer not null default 2 check (sessions_per_day between 1 and 8),
  available_days text[] not null default array['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'],
  weekday_minutes integer not null default 120 check (weekday_minutes between 30 and 600),
  weekend_minutes integer not null default 180 check (weekend_minutes between 30 and 720),
  target_grade text not null default 'A',
  guidance_mode text not null default 'guided' check (guidance_mode in ('guided', 'balanced', 'quiet')),
  plan_strictness text not null default 'flexible' check (plan_strictness in ('flexible', 'balanced', 'strict')),
  instruction_ratio integer not null default 30 check (instruction_ratio between 0 and 100),
  practice_ratio integer not null default 50 check (practice_ratio between 0 and 100),
  review_ratio integer not null default 20 check (review_ratio between 0 and 100),
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint learning_preferences_ratio_total check (instruction_ratio + practice_ratio + review_ratio = 100)
);

create table if not exists public.subject_assessments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  subject_id text not null,
  difficulty smallint not null default 3 check (difficulty between 1 and 5),
  confidence smallint not null default 3 check (confidence between 1 and 5),
  priority smallint not null default 3 check (priority between 1 and 5),
  starting_point text not null default 'uncertain' check (starting_point in ('comfortable', 'mixed', 'difficult', 'uncertain')),
  preferred_methods text[] not null default '{}',
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (user_id, subject_id)
);

create table if not exists public.recommendation_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  task_id text,
  subject_id text,
  chapter_id text,
  feedback_type text not null check (feedback_type in ('useful', 'too-easy', 'too-hard', 'not-useful', 'not-today')),
  method text,
  note text,
  created_at timestamptz not null default now()
);

alter table public.learning_preferences enable row level security;
alter table public.subject_assessments enable row level security;
alter table public.recommendation_feedback enable row level security;

drop policy if exists learning_preferences_select_own on public.learning_preferences;
drop policy if exists learning_preferences_insert_own on public.learning_preferences;
drop policy if exists learning_preferences_update_own on public.learning_preferences;
drop policy if exists subject_assessments_select_own on public.subject_assessments;
drop policy if exists subject_assessments_insert_own on public.subject_assessments;
drop policy if exists subject_assessments_update_own on public.subject_assessments;
drop policy if exists recommendation_feedback_select_own on public.recommendation_feedback;
drop policy if exists recommendation_feedback_insert_own on public.recommendation_feedback;

create policy learning_preferences_select_own on public.learning_preferences for select to authenticated using (auth.uid() = user_id);
create policy learning_preferences_insert_own on public.learning_preferences for insert to authenticated with check (auth.uid() = user_id);
create policy learning_preferences_update_own on public.learning_preferences for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy subject_assessments_select_own on public.subject_assessments for select to authenticated using (auth.uid() = user_id);
create policy subject_assessments_insert_own on public.subject_assessments for insert to authenticated with check (auth.uid() = user_id);
create policy subject_assessments_update_own on public.subject_assessments for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy recommendation_feedback_select_own on public.recommendation_feedback for select to authenticated using (auth.uid() = user_id);
create policy recommendation_feedback_insert_own on public.recommendation_feedback for insert to authenticated with check (auth.uid() = user_id);
