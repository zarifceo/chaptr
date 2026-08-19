alter table public.subjects
  add column if not exists category text not null default 'common' check (category in ('common', 'group', 'religion', 'fourth')),
  add column if not exists study_group text check (study_group in ('science', 'commerce', 'humanities')),
  add column if not exists religion_subject text check (religion_subject in ('islam', 'hinduism', 'buddhism', 'christianity')),
  add column if not exists fourth_subject text check (fourth_subject in ('higher-mathematics', 'agriculture', 'home-science')),
  add column if not exists book_language text not null default 'bn' check (book_language = 'bn');

alter table public.user_profiles
  add column if not exists study_group text check (study_group in ('science', 'commerce', 'humanities')),
  add column if not exists religion_subject_id text references public.subjects(id) on delete set null,
  add column if not exists fourth_subject_id text references public.subjects(id) on delete set null,
  add column if not exists academic_year int not null default 2026 check (academic_year between 2025 and 2035),
  add column if not exists book_language text not null default 'bn' check (book_language = 'bn'),
  add column if not exists academic_profile_completed boolean not null default false;

alter table public.user_profiles drop constraint if exists user_profiles_onboarding_step_check;
alter table public.user_profiles add constraint user_profiles_onboarding_step_check check (onboarding_step between 0 and 9);

alter table public.curated_textbooks
  add column if not exists language text not null default 'bn' check (language = 'bn'),
  add column if not exists study_group text check (study_group in ('science', 'commerce', 'humanities')),
  add column if not exists religion_subject text check (religion_subject in ('islam', 'hinduism', 'buddhism', 'christianity')),
  add column if not exists fourth_subject text check (fourth_subject in ('higher-mathematics', 'agriculture', 'home-science'));

create index if not exists subjects_category_idx on public.subjects(category, study_group, religion_subject, fourth_subject);
create index if not exists curated_textbooks_profile_idx on public.curated_textbooks(language, study_group, religion_subject, fourth_subject, active, sort_order);
create index if not exists user_profiles_academic_profile_idx on public.user_profiles(study_group, religion_subject_id, fourth_subject_id, academic_profile_completed);

-- Existing users must choose their academic profile instead of inheriting the old Commerce/Islam assumptions.
update public.user_profiles set academic_profile_completed = false where academic_profile_completed is distinct from false;

notify pgrst, 'reload schema';
