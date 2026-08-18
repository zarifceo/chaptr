delete from public.marks_distributions
where subject_id in ('mathematics', 'agriculture');

insert into public.marks_distributions (subject_id, part, question_type, choice_rule, marks)
values
  ('mathematics', 'Written', 'MCQ', 'MCQ section', 30),
  ('mathematics', 'Written', 'CQ', 'Creative question section', 50),
  ('mathematics', 'Written', 'Short', 'Short question section', 20),
  ('agriculture', 'Written', 'MCQ', 'MCQ section', 25),
  ('agriculture', 'Written', 'CQ', 'Creative question section', 40),
  ('agriculture', 'Written', 'Short', 'Short question section', 10),
  ('agriculture', 'Practical', 'Practical', 'Practical examination', 25);
