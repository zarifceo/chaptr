alter table public.user_profiles
  add column if not exists quick_start_status text;

alter table public.user_profiles
  drop constraint if exists user_profiles_quick_start_status_check;

alter table public.user_profiles
  add constraint user_profiles_quick_start_status_check
  check (quick_start_status is null or quick_start_status in ('active', 'dismissed', 'completed'));

update public.user_profiles
set quick_start_status = 'completed'
where quick_start_status is null
  and onboarding_completed = true;

comment on column public.user_profiles.quick_start_status is 'Persisted first-run quick-start state. New profiles start active; dismissed profiles can reopen it; completed profiles have finished the initial study loop.';

notify pgrst, 'reload schema';
