-- The original UNIQUE constraint treated NULL parts as distinct, allowing
-- repeated subject-level distributions whenever the reference seed ran after
-- a migration. Keep the user-confirmed SSC 2027 values and make the natural
-- key authoritative for both NULL and non-NULL parts.

delete from public.marks_distributions
where subject_id in ('bgs', 'hinduism')
  and question_type = 'CQ'
  and marks = 70;

with ranked as (
  select
    id,
    row_number() over (
      partition by subject_id, part, question_type
      order by id
    ) as duplicate_rank
  from public.marks_distributions
)
delete from public.marks_distributions distributions
using ranked
where distributions.id = ranked.id
  and ranked.duplicate_rank > 1;

alter table public.marks_distributions
  drop constraint if exists marks_distributions_subject_id_part_question_type_key;

alter table public.marks_distributions
  add constraint marks_distributions_subject_id_part_question_type_key
  unique nulls not distinct (subject_id, part, question_type);

notify pgrst, 'reload schema';
