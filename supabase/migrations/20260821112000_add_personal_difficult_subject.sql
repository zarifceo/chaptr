alter table public.user_profiles
  add column if not exists most_difficult_subject_id text references public.subjects(id) on delete set null;

create index if not exists user_profiles_most_difficult_subject_idx
  on public.user_profiles(most_difficult_subject_id);

comment on column public.user_profiles.most_difficult_subject_id is 'The single subject the student currently identifies as most difficult for personalized planning; null means no personal difficulty signal has been set.';

notify pgrst, 'reload schema';
