update public.user_profiles
set exam_year = 2027
where exam_year is distinct from 2027;

alter table public.user_profiles
  alter column exam_year set default 2027;

alter table public.user_profiles
  drop constraint if exists user_profiles_exam_year_check;

alter table public.user_profiles
  add constraint user_profiles_exam_year_check check (exam_year = 2027);
