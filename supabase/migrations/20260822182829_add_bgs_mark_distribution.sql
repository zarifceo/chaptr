delete from public.marks_distributions
where subject_id = 'bgs';

insert into public.marks_distributions (subject_id, part, question_type, choice_rule, marks)
values
  ('bgs', null, 'MCQ', 'MCQ section', 30),
  ('bgs', null, 'Short', 'Short question section', 20),
  ('bgs', null, 'CQ', 'Creative question section', 50);
