begin;

create temporary table english_first_lessons (
  id text primary key,
  chapter_number integer not null,
  title text not null,
  division text not null,
  note text not null,
  legacy_title text
) on commit drop;

insert into english_first_lessons (id, chapter_number, title, division, note, legacy_title) values
  ('english-1-eft-001', 1, '“Mr. Moti” by Rahad Abir', 'Unit 1 · Sense of Self', 'Lesson 1 · Story', null),
  ('english-1-eft-002', 2, '“Girl” by Jamaica Kincaid', 'Unit 1 · Sense of Self', 'Lesson 2 · Story', null),
  ('english-1-eft-003', 3, 'O Me! O Life!', 'Unit 1 · Sense of Self', 'Lesson 3 · Poem', null),
  ('english-1-eft-004', 4, 'The Greed of the Mighty Rivers', 'Unit 2 · Climate Change', 'Lesson 1', null),
  ('english-1-eft-005', 5, 'Environmental Pollution', 'Unit 2 · Climate Change', 'Lesson 2', null),
  ('english-1-eft-006', 6, 'Human Being and Climate', 'Unit 2 · Climate Change', 'Lesson 3', null),
  ('english-1-eft-007', 7, 'The Wheel of Cyclone', 'Unit 2 · Climate Change', 'Lesson 4', null),
  ('english-1-eft-008', 8, 'Have You Any Favourite Pastime?', 'Unit 3 · Pastimes', 'Lesson 1', null),
  ('english-1-eft-009', 9, 'Reading Really Helps!', 'Unit 3 · Pastimes', 'Lesson 2', null),
  ('english-1-eft-010', 10, 'Change in Pastime', 'Unit 3 · Pastimes', 'Lesson 3', null),
  ('english-1-eft-011', 11, 'Change in Pastimes in Bangladesh', 'Unit 3 · Pastimes', 'Lesson 4', null),
  ('english-1-eft-012', 12, 'Mother’s Day', 'Unit 4 · Events and Festivals', 'Lesson 1', null),
  ('english-1-eft-013', 13, 'May Day', 'Unit 4 · Events and Festivals', 'Lesson 2', null),
  ('english-1-eft-014', 14, 'International Mother Language Day - 1', 'Unit 4 · Events and Festivals', 'Lesson 3', null),
  ('english-1-eft-015', 15, 'International Mother Language Day - 2', 'Unit 4 · Events and Festivals', 'Lesson 4', null),
  ('english-1-eft-016', 16, 'Independence Day', 'Unit 4 · Events and Festivals', 'Lesson 5', null),
  ('english-1-eft-017', 17, 'Pahela Boishakh', 'Unit 4 · Events and Festivals', 'Lesson 6', null),
  ('english-1-eft-018', 18, 'The Ferry Boat', 'Unit 5 · Problems Around Us', 'Lesson 1 · Story', null),
  ('english-1-eft-019', 19, 'Are We Too Many?', 'Unit 5 · Problems Around Us', 'Lesson 2', null),
  ('english-1-eft-020', 20, 'Our Food and Shelter', 'Unit 5 · Problems Around Us', 'Lesson 3', null),
  ('english-1-eft-021', 21, 'The Story of Lipi', 'Unit 5 · Problems Around Us', 'Lesson 4 · Story', null),
  ('english-1-eft-022', 22, 'Let’s Become Skilled Workforce', 'Unit 5 · Problems Around Us', 'Lesson 5', null),
  ('english-1-eft-023', 23, 'Nepal, the Land of the Everest', 'Unit 6 · Our Neighbours', 'Lesson 1', null),
  ('english-1-eft-024', 24, 'Sri Lanka: The Pearl of the Indian Ocean', 'Unit 6 · Our Neighbours', 'Lesson 2', null),
  ('english-1-eft-025', 25, 'The Maldives', 'Unit 6 · Our Neighbours', 'Lesson 3', null),
  ('english-1-eft-026', 26, 'India: Unity in Diversity', 'Unit 6 · Our Neighbours', 'Lesson 4', null),
  ('english-1-eft-027', 27, 'Bhutan: The Land of Happiness', 'Unit 6 · Our Neighbours', 'Lesson 5', null),
  ('english-1-eft-028', 28, 'Zainul Abedin, The Great Artist', 'Unit 7 · People Who Stand Out', 'Lesson 1', null),
  ('english-1-eft-029', 29, 'The Art of Silence', 'Unit 7 · People Who Stand Out', 'Lesson 2', null),
  ('english-1-eft-030', 30, 'The Beginning', 'Unit 7 · People Who Stand Out', 'Lesson 3', null),
  ('english-1-eft-031', 31, 'Love for Humanity', 'Unit 7 · People Who Stand Out', 'Lesson 4', null),
  ('english-1-eft-032', 32, 'The Wizard of Apple', 'Unit 7 · People Who Stand Out', 'Lesson 6', null),
  ('english-1-eft-033', 33, 'Jobs’ Childhood', 'Unit 7 · People Who Stand Out', 'Lesson 7', null),
  ('english-1-eft-034', 34, 'The Shat Gambuj Mosque', 'Unit 8 · World Heritage', 'Lesson 1', null),
  ('english-1-eft-035', 35, 'The Somapura Mahavihara', 'Unit 8 · World Heritage', 'Lesson 2', null),
  ('english-1-eft-036', 36, 'The Statue of Liberty', 'Unit 8 · World Heritage', 'Lesson 3', null),
  ('english-1-eft-037', 37, 'Lake Baikal', 'Unit 8 · World Heritage', 'Lesson 4', null),
  ('english-1-eft-038', 38, 'Jobs that People Do', 'Unit 9 · Unconventional Jobs', 'Lesson 1', null),
  ('english-1-eft-039', 39, 'Wierd Jobs Around', 'Unit 9 · Unconventional Jobs', 'Lesson 2', null),
  ('english-1-eft-040', 40, 'Floral career', 'Unit 9 · Unconventional Jobs', 'Lesson 3', null),
  ('english-1-eft-041', 41, 'I Have a Dream', 'Unit 10 · Dreams', 'Lesson 1', null),
  ('english-1-eft-042', 42, 'What I Dream to Be', 'Unit 10 · Dreams', 'Lesson 2', null),
  ('english-1-eft-043', 43, 'They Had Dreams (Part-1)', 'Unit 10 · Dreams', 'Lesson 3', null),
  ('english-1-eft-044', 44, 'They Had Dreams (Part 2)', 'Unit 10 · Dreams', 'Lesson 4', null),
  ('english-1-eft-045', 45, 'Books', 'Unit 11 · Reading from English Literature', 'Lesson 1 · Poem', null),
  ('english-1-eft-046', 46, 'Two Mothers Remembered', 'Unit 11 · Reading from English Literature', 'Lesson 2 · Poem', null),
  ('english-1-eft-047', 47, 'The Sands of Dee', 'Unit 11 · Reading from English Literature', 'Lesson 3 · Poem', null),
  ('english-1-eft-048', 48, 'Time, You Old Gipsy Man', 'Unit 11 · Reading from English Literature', 'Lesson 4 · Poem', 'Time, You Old Gipsy Man'),
  ('english-1-eft-049', 49, 'Stopping by Woods on a Snowy Evening', 'Unit 11 · Reading from English Literature', 'Lesson 5 · Poem', 'Stopping by Woods on a Snowy Evening'),
  ('english-1-eft-050', 50, 'The Purple Jar (Part-1)', 'Unit 11 · Reading from English Literature', 'Lesson 6 · Story', 'The Purple Jar'),
  ('english-1-eft-051', 51, 'The Purple Jar (Part-2)', 'Unit 11 · Reading from English Literature', 'Lesson 7 · Story', null),
  ('english-1-eft-052', 52, 'The Purple Jar (Part-3)', 'Unit 11 · Reading from English Literature', 'Lesson 8 · Story', null),
  ('english-1-eft-053', 53, 'A Pound of Flesh', 'Unit 11 · Reading from English Literature', 'Lesson 9 · Story', 'A Pound of Flesh, Three Caskets, The Trial'),
  ('english-1-eft-054', 54, 'The Three Caskets', 'Unit 11 · Reading from English Literature', 'Lesson 10 · Story', null),
  ('english-1-eft-055', 55, 'The Trial', 'Unit 11 · Reading from English Literature', 'Lesson 11 · Story', null),
  ('english-1-eft-056', 56, 'My Roots', 'Unit 12 · Roots', 'Lesson 1', null),
  ('english-1-eft-057', 57, 'My Roots -2', 'Unit 12 · Roots', 'Lesson 2', null),
  ('english-1-eft-058', 58, 'The Return of the Native', 'Unit 12 · Roots', 'Lesson 3', null),
  ('english-1-eft-059', 59, 'Loneliness: Causes, Effects and Prevention', 'Unit 13 · Loneliness', 'Lesson 1', null),
  ('english-1-eft-060', 60, 'Solitude', 'Unit 13 · Loneliness', 'Lesson 2 · Poem', 'Solitude'),
  ('english-1-eft-061', 61, 'The Story of an Hour', 'Unit 13 · Loneliness', 'Lesson 3 · Story', 'The Story of an Hour'),
  ('english-1-eft-062', 62, 'Renewable Energy Sources (Part 1)', 'Unit 14 · Renewable Energy', 'Lesson 1', null),
  ('english-1-eft-063', 63, 'Renewable Energy Sources (Part 2)', 'Unit 14 · Renewable Energy', 'Lesson 2', null),
  ('english-1-eft-064', 64, 'Media and Modes of E-communication', 'Unit 15 · Media and Modes of E-communication', 'Lesson 1', null),
  ('english-1-eft-065', 65, 'Social Network Services', 'Unit 15 · Media and Modes of E-communication', 'Lesson 2', null),
  ('english-1-eft-066', 66, 'E-learning', 'Unit 15 · Media and Modes of E-communication', 'Lesson 3', null),
  ('english-1-eft-067', 67, 'Graffiti', 'Unit 16 · Graffiti', 'Lesson 1', null);

update public.chapters chapter
set
  chapter_number = lesson.chapter_number,
  title = lesson.title,
  division = lesson.division,
  note = lesson.note,
  question_formats = array['Reading', 'Writing']::text[],
  syllabus_eligible = true
from english_first_lessons lesson
where chapter.subject_id = 'english-1'
  and lesson.legacy_title is not null
  and chapter.title = lesson.legacy_title;

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
  lesson.id,
  'english-1',
  lesson.chapter_number,
  lesson.title,
  lesson.division,
  lesson.note,
  array['Reading', 'Writing']::text[],
  true
from english_first_lessons lesson
where not exists (
  select 1
  from public.chapters chapter
  where chapter.subject_id = 'english-1'
    and chapter.chapter_number = lesson.chapter_number
    and chapter.title = lesson.title
);

update public.chapters chapter
set syllabus_eligible = false,
    division = case when chapter.division = 'Exam format' then 'Exam skills' else chapter.division end
where chapter.subject_id = 'english-1'
  and not exists (
    select 1
    from english_first_lessons lesson
    where lesson.chapter_number = chapter.chapter_number
      and lesson.title = chapter.title
  );

commit;
