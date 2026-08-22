-- Remove Buddhist and Christian catalog entries and every dependent record.
-- Students who selected either subject are returned to the religion step.
begin;

update public.user_profiles
set
  selected_subjects = array_remove(array_remove(selected_subjects, 'buddhism'), 'christianity'),
  subject_strengths = coalesce(subject_strengths, '{}'::jsonb) - 'buddhism' - 'christianity',
  most_difficult_subject_id = case when most_difficult_subject_id in ('buddhism', 'christianity') then null else most_difficult_subject_id end,
  religion_subject_id = case when religion_subject_id in ('buddhism', 'christianity') then null else religion_subject_id end,
  academic_profile_completed = case when religion_subject_id in ('buddhism', 'christianity') then false else academic_profile_completed end,
  onboarding_completed = case when religion_subject_id in ('buddhism', 'christianity') then false else onboarding_completed end,
  onboarding_step = case when religion_subject_id in ('buddhism', 'christianity') then 1 else onboarding_step end
where selected_subjects && array['buddhism', 'christianity']::text[]
   or subject_strengths ?| array['buddhism', 'christianity']
   or most_difficult_subject_id in ('buddhism', 'christianity')
   or religion_subject_id in ('buddhism', 'christianity');

delete from public.study_tasks
where subject_id in ('buddhism', 'christianity')
   or chapter_id in (select id from public.chapters where subject_id in ('buddhism', 'christianity'));

delete from public.journal_entries
where subject_id in ('buddhism', 'christianity')
   or chapter_id in (select id from public.chapters where subject_id in ('buddhism', 'christianity'));

delete from public.mistakes
where subject_id in ('buddhism', 'christianity')
   or chapter_id in (select id from public.chapters where subject_id in ('buddhism', 'christianity'));

delete from public.mock_results where subject_id in ('buddhism', 'christianity');

delete from public.subjects where id in ('buddhism', 'christianity');

alter table public.subjects drop constraint if exists subjects_religion_subject_check;
alter table public.subjects add constraint subjects_religion_subject_check
  check (religion_subject is null or religion_subject in ('islam', 'hinduism'));

alter table public.curated_textbooks drop constraint if exists curated_textbooks_religion_subject_check;
alter table public.curated_textbooks add constraint curated_textbooks_religion_subject_check
  check (religion_subject is null or religion_subject in ('islam', 'hinduism'));

commit;
