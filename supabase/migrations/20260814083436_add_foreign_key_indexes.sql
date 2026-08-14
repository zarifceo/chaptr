create index chapters_subject_id_idx
  on public.chapters(subject_id);

create index chapter_progress_chapter_id_idx
  on public.chapter_progress(chapter_id);

create index study_tasks_subject_id_idx
  on public.study_tasks(subject_id);

create index study_tasks_chapter_id_idx
  on public.study_tasks(chapter_id);

create index study_sessions_user_task_idx
  on public.study_sessions(user_id, task_id);

create index journal_entries_subject_id_idx
  on public.journal_entries(subject_id);

create index journal_entries_chapter_id_idx
  on public.journal_entries(chapter_id);

create index mistakes_subject_id_idx
  on public.mistakes(subject_id);

create index mistakes_chapter_id_idx
  on public.mistakes(chapter_id);

create index mock_results_subject_id_idx
  on public.mock_results(subject_id);


