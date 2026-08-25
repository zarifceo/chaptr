begin;

update public.exam_events
set locked = true,
    updated_at = now()
where id = 'test';

commit;
