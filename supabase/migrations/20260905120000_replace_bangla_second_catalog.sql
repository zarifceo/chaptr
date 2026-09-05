begin;

create temporary table bangla_second_chapters (
  id text primary key,
  chapter_number integer not null,
  title text not null,
  division text not null,
  note text not null,
  legacy_title text
) on commit drop;

insert into bangla_second_chapters (id, chapter_number, title, division, note, legacy_title) values
  ('bangla-2-b2p-001', 1, 'ভাষা ও বাংলা ভাষা', 'ব্যাকরণ', 'পাঠ্যবইয়ের পৃষ্ঠা 1', 'ভাষা ও বাংলা ব্যাকরণ'),
  ('bangla-2-b2p-002', 2, 'বাংলা ব্যাকরণ', 'ব্যাকরণ', 'পাঠ্যবইয়ের পৃষ্ঠা 3', null),
  ('bangla-2-b2p-003', 3, 'বাংলা ভাষার রীতি ও বিভাজন', 'ব্যাকরণ', 'পাঠ্যবইয়ের পৃষ্ঠা 5', null),
  ('bangla-2-b2p-004', 4, 'বাগযন্ত্র', 'ব্যাকরণ', 'পাঠ্যবইয়ের পৃষ্ঠা 9', null),
  ('bangla-2-b2p-005', 5, 'ধ্বনি ও বর্ণ', 'ব্যাকরণ', 'পাঠ্যবইয়ের পৃষ্ঠা 12', 'ধ্বনিতত্ত্ব'),
  ('bangla-2-b2p-006', 6, 'স্বরধ্বনি', 'ব্যাকরণ', 'পাঠ্যবইয়ের পৃষ্ঠা 15', null),
  ('bangla-2-b2p-007', 7, 'ব্যঞ্জনধ্বনি', 'ব্যাকরণ', 'পাঠ্যবইয়ের পৃষ্ঠা 18', null),
  ('bangla-2-b2p-008', 8, 'বর্ণের উচ্চারণ', 'ব্যাকরণ', 'পাঠ্যবইয়ের পৃষ্ঠা 23', null),
  ('bangla-2-b2p-009', 9, 'শব্দ ও পদের গঠন', 'ব্যাকরণ', 'পাঠ্যবইয়ের পৃষ্ঠা 26', 'শব্দতত্ত্ব / রূপতত্ত্ব'),
  ('bangla-2-b2p-010', 10, 'উপসর্গ দিয়ে শব্দ গঠন', 'ব্যাকরণ', 'পাঠ্যবইয়ের পৃষ্ঠা 29', null),
  ('bangla-2-b2p-011', 11, 'প্রত্যয় দিয়ে শব্দ গঠন', 'ব্যাকরণ', 'পাঠ্যবইয়ের পৃষ্ঠা 32', null),
  ('bangla-2-b2p-012', 12, 'সমাস প্রক্রিয়ায় শব্দ গঠন', 'ব্যাকরণ', 'পাঠ্যবইয়ের পৃষ্ঠা 37', null),
  ('bangla-2-b2p-013', 13, 'সন্ধি', 'ব্যাকরণ', 'পাঠ্যবইয়ের পৃষ্ঠা 41', null),
  ('bangla-2-b2p-014', 14, 'শব্দদ্বিত্ব', 'ব্যাকরণ', 'পাঠ্যবইয়ের পৃষ্ঠা 44', null),
  ('bangla-2-b2p-015', 15, 'নরবাচক ও নারীবাচক শব্দ', 'ব্যাকরণ', 'পাঠ্যবইয়ের পৃষ্ঠা 46', null),
  ('bangla-2-b2p-016', 16, 'সংখ্যাবাচক শব্দ', 'ব্যাকরণ', 'পাঠ্যবইয়ের পৃষ্ঠা 48', null),
  ('bangla-2-b2p-017', 17, 'শব্দের শ্রেণিবিভাগ', 'ব্যাকরণ', 'পাঠ্যবইয়ের পৃষ্ঠা 51', null),
  ('bangla-2-b2p-018', 18, 'বিশেষ্য', 'ব্যাকরণ', 'পাঠ্যবইয়ের পৃষ্ঠা 53', null),
  ('bangla-2-b2p-019', 19, 'সর্বনাম', 'ব্যাকরণ', 'পাঠ্যবইয়ের পৃষ্ঠা 55', null),
  ('bangla-2-b2p-020', 20, 'বিশেষণ', 'ব্যাকরণ', 'পাঠ্যবইয়ের পৃষ্ঠা 57', null),
  ('bangla-2-b2p-021', 21, 'ক্রিয়া', 'ব্যাকরণ', 'পাঠ্যবইয়ের পৃষ্ঠা 59', null),
  ('bangla-2-b2p-022', 22, 'ক্রিয়াবিশেষণ', 'ব্যাকরণ', 'পাঠ্যবইয়ের পৃষ্ঠা 62', null),
  ('bangla-2-b2p-023', 23, 'অনুসর্গ', 'ব্যাকরণ', 'পাঠ্যবইয়ের পৃষ্ঠা 64', null),
  ('bangla-2-b2p-024', 24, 'যোজক', 'ব্যাকরণ', 'পাঠ্যবইয়ের পৃষ্ঠা 66', null),
  ('bangla-2-b2p-025', 25, 'আবেগ', 'ব্যাকরণ', 'পাঠ্যবইয়ের পৃষ্ঠা 68', null),
  ('bangla-2-b2p-026', 26, 'নির্দেশক', 'ব্যাকরণ', 'পাঠ্যবইয়ের পৃষ্ঠা 70', null),
  ('bangla-2-b2p-027', 27, 'বচন', 'ব্যাকরণ', 'পাঠ্যবইয়ের পৃষ্ঠা 72', null),
  ('bangla-2-b2p-028', 28, 'বিভক্তি', 'ব্যাকরণ', 'পাঠ্যবইয়ের পৃষ্ঠা 74', null),
  ('bangla-2-b2p-029', 29, 'ক্রিয়াবিভক্তি', 'ব্যাকরণ', 'পাঠ্যবইয়ের পৃষ্ঠা 76', null),
  ('bangla-2-b2p-030', 30, 'ক্রিয়ার কাল', 'ব্যাকরণ', 'পাঠ্যবইয়ের পৃষ্ঠা 79', null),
  ('bangla-2-b2p-031', 31, 'বাক্যের অংশ ও শ্রেণিবিভাগ', 'ব্যাকরণ', 'পাঠ্যবইয়ের পৃষ্ঠা 83', 'বাক্যতত্ত্ব'),
  ('bangla-2-b2p-032', 32, 'বাক্যের বর্গ', 'ব্যাকরণ', 'পাঠ্যবইয়ের পৃষ্ঠা 86', null),
  ('bangla-2-b2p-033', 33, 'উদ্দেশ্য ও বিধেয়', 'ব্যাকরণ', 'পাঠ্যবইয়ের পৃষ্ঠা 88', null),
  ('bangla-2-b2p-034', 34, 'সরল, জটিল ও যৌগিক বাক্য', 'ব্যাকরণ', 'পাঠ্যবইয়ের পৃষ্ঠা 90', null),
  ('bangla-2-b2p-035', 35, 'কারক', 'ব্যাকরণ', 'পাঠ্যবইয়ের পৃষ্ঠা 95', null),
  ('bangla-2-b2p-036', 36, 'বাচ্য', 'ব্যাকরণ', 'পাঠ্যবইয়ের পৃষ্ঠা 98', null),
  ('bangla-2-b2p-037', 37, 'উক্তি', 'ব্যাকরণ', 'পাঠ্যবইয়ের পৃষ্ঠা 101', null),
  ('bangla-2-b2p-038', 38, 'যতিচিহ্ন', 'ব্যাকরণ', 'পাঠ্যবইয়ের পৃষ্ঠা 103', null),
  ('bangla-2-b2p-039', 39, 'বাগর্থ', 'ব্যাকরণ', 'পাঠ্যবইয়ের পৃষ্ঠা 106', 'বাগর্থ'),
  ('bangla-2-b2p-040', 40, 'বাগধারা', 'ব্যাকরণ', 'পাঠ্যবইয়ের পৃষ্ঠা 109', null),
  ('bangla-2-b2p-041', 41, 'প্রতিশব্দ', 'ব্যাকরণ', 'পাঠ্যবইয়ের পৃষ্ঠা 114', null),
  ('bangla-2-b2p-042', 42, 'বিপরীত শব্দ', 'ব্যাকরণ', 'পাঠ্যবইয়ের পৃষ্ঠা 118', null),
  ('bangla-2-b2p-043', 43, 'শব্দজোড়', 'ব্যাকরণ', 'পাঠ্যবইয়ের পৃষ্ঠা 121', null),
  ('bangla-2-b2p-044', 44, 'অনুচ্ছেদ', 'নির্মিতি', 'পাঠ্যবইয়ের পৃষ্ঠা 126', 'অনুচ্ছেদ'),
  ('bangla-2-b2p-045', 45, 'সারাংশ ও সারমর্ম', 'নির্মিতি', 'পাঠ্যবইয়ের পৃষ্ঠা 133', 'সারাংশ ও সারমর্ম'),
  ('bangla-2-b2p-046', 46, 'ভাব-সম্প্রসারণ', 'নির্মিতি', 'পাঠ্যবইয়ের পৃষ্ঠা 142', 'ভাব-সম্প্রসারণ'),
  ('bangla-2-b2p-047', 47, 'চিঠিপত্র', 'নির্মিতি', 'পাঠ্যবইয়ের পৃষ্ঠা 152', 'চিঠিপত্র ও আবেদনপত্র'),
  ('bangla-2-b2p-048', 48, 'সংবাদ প্রতিবেদন', 'নির্মিতি', 'পাঠ্যবইয়ের পৃষ্ঠা 170', 'প্রতিবেদন'),
  ('bangla-2-b2p-049', 49, 'প্রবন্ধ', 'নির্মিতি', 'পাঠ্যবইয়ের পৃষ্ঠা 174', 'প্রবন্ধ রচনা');

-- Reuse old broad-topic rows where the correspondence is unambiguous so that
-- existing chapter preferences, progress, tasks, and journal evidence survive.
update public.chapters chapter
set
  chapter_number = catalog.chapter_number,
  title = catalog.title,
  division = catalog.division,
  note = catalog.note,
  question_formats = array['MCQ', 'Written']::text[],
  syllabus_eligible = true
from bangla_second_chapters catalog
where chapter.subject_id = 'bangla-2'
  and catalog.legacy_title is not null
  and chapter.title = catalog.legacy_title
  and not exists (
    select 1
    from public.chapters exact
    where exact.subject_id = 'bangla-2'
      and exact.chapter_number = catalog.chapter_number
      and exact.title = catalog.title
      and exact.id <> chapter.id
  );

update public.chapters chapter
set
  division = catalog.division,
  note = catalog.note,
  question_formats = array['MCQ', 'Written']::text[],
  syllabus_eligible = true
from bangla_second_chapters catalog
where chapter.subject_id = 'bangla-2'
  and chapter.chapter_number = catalog.chapter_number
  and chapter.title = catalog.title;

insert into public.chapters (
  id,
  subject_id,
  chapter_number,
  title,
  division,
  note,
  question_formats,
  syllabus_eligible
)
select
  catalog.id,
  'bangla-2',
  catalog.chapter_number,
  catalog.title,
  catalog.division,
  catalog.note,
  array['MCQ', 'Written']::text[],
  true
from bangla_second_chapters catalog
where not exists (
  select 1
  from public.chapters chapter
  where chapter.subject_id = 'bangla-2'
    and chapter.chapter_number = catalog.chapter_number
    and chapter.title = catalog.title
);

-- Keep obsolete aggregates for referential history, but remove them from the
-- current syllabus so the bootstrap seeder cannot surface them again.
update public.chapters chapter
set syllabus_eligible = false
where chapter.subject_id = 'bangla-2'
  and not exists (
    select 1
    from bangla_second_chapters catalog
    where catalog.chapter_number = chapter.chapter_number
      and catalog.title = chapter.title
  );

commit;
