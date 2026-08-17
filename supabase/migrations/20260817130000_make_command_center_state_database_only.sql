create table if not exists public.workflow_steps (
  workflow_kind text primary key,
  steps text[] not null default '{}',
  updated_at timestamptz not null default now()
);

create table if not exists public.exam_events (
  id text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  starts_on date not null,
  ends_on date not null,
  kind text not null check (kind in ('official','school','mock','custom')),
  scope text[] not null default '{}',
  note text,
  locked boolean not null default false,
  archived boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (user_id, id),
  check (ends_on >= starts_on)
);

create table if not exists public.planning_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  main_start time not null default '15:00',
  main_end time not null default '19:00',
  math_start time not null default '20:00',
  math_end time not null default '22:00',
  daily_target int not null default 240 check (daily_target between 15 and 600),
  math_days_per_week int not null default 6 check (math_days_per_week between 1 and 7),
  agriculture_days_per_week int not null default 4 check (agriculture_days_per_week between 1 and 7),
  reminders_enabled boolean not null default false,
  updated_at timestamptz not null default now()
);

create table if not exists public.adaptive_plan_summaries (
  user_id uuid primary key references auth.users(id) on delete cascade,
  used_minutes int not null default 0,
  available_minutes int not null default 240,
  deferred_count int not null default 0,
  generated_revision_count int not null default 0,
  rationale text[] not null default '{}',
  planned_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.workflow_steps enable row level security;
alter table public.exam_events enable row level security;
alter table public.planning_settings enable row level security;
alter table public.adaptive_plan_summaries enable row level security;

create policy "authenticated reads workflow_steps" on public.workflow_steps for select to authenticated using (true);

do $$ declare t text; begin
  foreach t in array array['exam_events','planning_settings','adaptive_plan_summaries'] loop
    execute format('create policy "owner select %1$s" on public.%1$I for select to authenticated using ((select auth.uid()) = user_id)', t);
    execute format('create policy "owner insert %1$s" on public.%1$I for insert to authenticated with check ((select auth.uid()) = user_id)', t);
    execute format('create policy "owner update %1$s" on public.%1$I for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id)', t);
    execute format('create policy "owner delete %1$s" on public.%1$I for delete to authenticated using ((select auth.uid()) = user_id)', t);
  end loop;
end $$;

create index if not exists exam_events_user_start_idx on public.exam_events(user_id, starts_on, archived);
