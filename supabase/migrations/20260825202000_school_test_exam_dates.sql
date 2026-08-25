begin;

update public.exams
set name = 'School Test Exam',
    stage = 'test-exam',
    syllabus_scope = 'School Test Exam syllabus'
where id = 'test';

update public.exam_events
set name = 'School Test Exam',
    kind = 'school',
    scope = array['Full school Test Exam syllabus', 'School exam conditions']::text[],
    locked = false,
    archived = false,
    updated_at = now()
where id = 'test';

commit;
