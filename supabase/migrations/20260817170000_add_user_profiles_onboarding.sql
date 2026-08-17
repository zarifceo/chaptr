create table if not exists public.user_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  board text not null default 'Dhaka',
  exam_year int not null default 2027 check (exam_year between 2025 and 2035),
  selected_subjects text[] not null default '{}',
  daily_target int not null default 240 check (daily_target between 15 and 600),
  main_start time not null default '15:00',
  main_end time not null default '19:00',
  onboarding_step int not null default 0 check (onboarding_step between 0 and 7),
  onboarding_completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.user_profiles enable row level security;

drop policy if exists "user_profiles owner select" on public.user_profiles;
drop policy if exists "user_profiles owner insert" on public.user_profiles;
drop policy if exists "user_profiles owner update" on public.user_profiles;
drop policy if exists "user_profiles owner delete" on public.user_profiles;

create policy "user_profiles owner select" on public.user_profiles
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "user_profiles owner insert" on public.user_profiles
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "user_profiles owner update" on public.user_profiles
  for update to authenticated using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "user_profiles owner delete" on public.user_profiles
  for delete to authenticated using ((select auth.uid()) = user_id);

revoke all on public.user_profiles from anon;
grant select, insert, update, delete on public.user_profiles to authenticated;

create index if not exists user_profiles_onboarding_idx
  on public.user_profiles(user_id, onboarding_completed, onboarding_step);
