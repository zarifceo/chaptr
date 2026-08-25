begin;

create temporary table chapter_dedup_map on commit drop as
with ranked as (
  select
    id,
    first_value(id) over (
      partition by subject_id, coalesce(chapter_number, -1), title
      order by id
    ) as canonical_id,
    row_number() over (
      partition by subject_id, coalesce(chapter_number, -1), title
      order by id
    ) as identity_rank
  from public.chapters
)
select id as stale_id, canonical_id
from ranked
where identity_rank > 1;

do $$
begin
  if exists (
    select 1
    from chapter_dedup_map mapping
    join public.chapter_preferences stale on stale.chapter_id = mapping.stale_id
    join public.chapter_preferences canonical
      on canonical.user_id = stale.user_id
     and canonical.chapter_id = mapping.canonical_id
    where canonical.included_for_ssc is distinct from stale.included_for_ssc
       or canonical.target_month is distinct from stale.target_month
       or canonical.excluded is distinct from stale.excluded
       or canonical.exclusion_reason is distinct from stale.exclusion_reason
       or canonical.priority is distinct from stale.priority
  ) then
    raise exception 'Chapter deduplication stopped: conflicting chapter preferences require manual review';
  end if;

  if exists (
    select 1
    from chapter_dedup_map mapping
    join public.chapter_progress stale on stale.chapter_id = mapping.stale_id
    join public.chapter_progress canonical
      on canonical.user_id = stale.user_id
     and canonical.chapter_id = mapping.canonical_id
    where canonical.status is distinct from stale.status
       or canonical.confidence is distinct from stale.confidence
       or canonical.last_studied is distinct from stale.last_studied
       or canonical.next_review is distinct from stale.next_review
       or canonical.questions_attempted is distinct from stale.questions_attempted
       or canonical.questions_correct is distinct from stale.questions_correct
       or canonical.timed_score is distinct from stale.timed_score
       or canonical.difficulty is distinct from stale.difficulty
  ) then
    raise exception 'Chapter deduplication stopped: conflicting chapter progress requires manual review';
  end if;
end
$$;

delete from public.chapter_preferences stale
using chapter_dedup_map mapping
where stale.chapter_id = mapping.stale_id
  and exists (
    select 1
    from public.chapter_preferences canonical
    where canonical.user_id = stale.user_id
      and canonical.chapter_id = mapping.canonical_id
  );

delete from public.chapter_progress stale
using chapter_dedup_map mapping
where stale.chapter_id = mapping.stale_id
  and exists (
    select 1
    from public.chapter_progress canonical
    where canonical.user_id = stale.user_id
      and canonical.chapter_id = mapping.canonical_id
  );

update public.chapter_preferences value
set chapter_id = mapping.canonical_id
from chapter_dedup_map mapping
where value.chapter_id = mapping.stale_id;

update public.chapter_progress value
set chapter_id = mapping.canonical_id
from chapter_dedup_map mapping
where value.chapter_id = mapping.stale_id;

update public.exam_sessions value
set chapter_id = mapping.canonical_id
from chapter_dedup_map mapping
where value.chapter_id = mapping.stale_id;

update public.journal_entries value
set chapter_id = mapping.canonical_id
from chapter_dedup_map mapping
where value.chapter_id = mapping.stale_id;

update public.maths_formulas value
set chapter_id = mapping.canonical_id
from chapter_dedup_map mapping
where value.chapter_id = mapping.stale_id;

update public.mistakes value
set chapter_id = mapping.canonical_id
from chapter_dedup_map mapping
where value.chapter_id = mapping.stale_id;

update public.study_resources value
set chapter_id = mapping.canonical_id
from chapter_dedup_map mapping
where value.chapter_id = mapping.stale_id;

update public.study_sessions value
set chapter_id = mapping.canonical_id
from chapter_dedup_map mapping
where value.chapter_id = mapping.stale_id;

update public.study_tasks value
set chapter_id = mapping.canonical_id
from chapter_dedup_map mapping
where value.chapter_id = mapping.stale_id;

delete from public.chapters chapter
using chapter_dedup_map mapping
where chapter.id = mapping.stale_id;

create unique index chapters_logical_identity_key
  on public.chapters (subject_id, coalesce(chapter_number, -1), title);

commit;
