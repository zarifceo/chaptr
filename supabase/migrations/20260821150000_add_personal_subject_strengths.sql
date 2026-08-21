alter table public.user_profiles
  add column if not exists subject_strengths jsonb not null default '{}'::jsonb;

alter table public.user_profiles
  drop constraint if exists user_profiles_subject_strengths_object_check;

alter table public.user_profiles
  add constraint user_profiles_subject_strengths_object_check
  check (jsonb_typeof(subject_strengths) = 'object');

comment on column public.user_profiles.subject_strengths is 'Per-user self-rated subject strengths: strongest, very-strong, moderate, or toughest.';

notify pgrst, 'reload schema';
