delete from public.marks_distributions
where subject_id in (
  'physics',
  'chemistry',
  'biology',
  'higher-mathematics',
  'home-science',
  'civics',
  'economics',
  'geography',
  'history',
  'hinduism'
);

insert into public.marks_distributions (subject_id, part, question_type, choice_rule, marks)
select
  subject_id,
  part,
  question_type,
  choice_rule,
  marks
from (
  values
    ('physics', 'Written', 'MCQ', 'MCQ section', 25),
    ('physics', 'Written', 'CQ', 'Creative question section', 40),
    ('physics', 'Written', 'SQ', 'Short question section', 10),
    ('physics', 'Practical', 'Practical', 'Practical examination', 25),
    ('chemistry', 'Written', 'MCQ', 'MCQ section', 25),
    ('chemistry', 'Written', 'CQ', 'Creative question section', 40),
    ('chemistry', 'Written', 'SQ', 'Short question section', 10),
    ('chemistry', 'Practical', 'Practical', 'Practical examination', 25),
    ('biology', 'Written', 'MCQ', 'MCQ section', 25),
    ('biology', 'Written', 'CQ', 'Creative question section', 40),
    ('biology', 'Written', 'SQ', 'Short question section', 10),
    ('biology', 'Practical', 'Practical', 'Practical examination', 25),
    ('higher-mathematics', 'Written', 'MCQ', 'MCQ section', 25),
    ('higher-mathematics', 'Written', 'CQ', 'Creative question section', 40),
    ('higher-mathematics', 'Written', 'SQ', 'Short question section', 10),
    ('higher-mathematics', 'Practical', 'Practical', 'Practical examination', 25),
    ('home-science', 'Written', 'MCQ', 'MCQ section', 25),
    ('home-science', 'Written', 'CQ', 'Creative question section', 40),
    ('home-science', 'Written', 'SQ', 'Short question section', 10),
    ('home-science', 'Practical', 'Practical', 'Practical examination', 25),
    ('civics', null, 'MCQ', 'MCQ section', 30),
    ('civics', null, 'CQ', 'Creative question section', 70),
    ('economics', null, 'MCQ', 'MCQ section', 30),
    ('economics', null, 'CQ', 'Creative question section', 70),
    ('geography', null, 'MCQ', 'MCQ section', 30),
    ('geography', null, 'CQ', 'Creative question section', 70),
    ('history', null, 'MCQ', 'MCQ section', 30),
    ('history', null, 'CQ', 'Creative question section', 70),
    ('hinduism', null, 'MCQ', 'MCQ section', 30),
    ('hinduism', null, 'SQ', 'Short question section', 20),
    ('hinduism', null, 'CQ', 'Creative question section', 50)
) as distributions(subject_id, part, question_type, choice_rule, marks);
