-- The inter-board SSC 2027 schedule published on 24 August 2026 moved the
-- theoretical examination window from 7 January-6 February to
-- 14 March-15 April 2027.

update public.exams
set starts_on = '2027-03-14'::date,
    ends_on = '2027-04-15'::date
where id = 'ssc';

-- Locked SSC events are copies of the reference event. Update existing users
-- immediately; bootstrap will keep this authoritative event current later.
update public.exam_events
set starts_on = '2027-03-14'::date,
    ends_on = '2027-04-15'::date,
    updated_at = now()
where id = 'ssc';

-- Preserve each student's custom preparation phases, but move a final phase
-- that still ends on the old SSC boundary to the equivalent new boundary.
with final_phases as (
  select user_id, max(phase_order) as phase_order
  from public.exam_plan_phases
  group by user_id
)
update public.exam_plan_phases as phase
set ends_on = case
      when phase.ends_on = '2027-01-06'::date then '2027-03-13'::date
      else '2027-03-14'::date
    end,
    updated_at = now()
from final_phases
where phase.user_id = final_phases.user_id
  and phase.phase_order = final_phases.phase_order
  and phase.ends_on in ('2027-01-06'::date, '2027-01-07'::date);
