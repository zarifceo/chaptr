-- Keep the private app out of the anonymous Data API role.
revoke all privileges on table
  public.subjects,
  public.chapters,
  public.marks_distributions,
  public.exams,
  public.chapter_progress,
  public.study_tasks,
  public.study_sessions,
  public.journal_entries,
  public.mistakes,
  public.mock_results,
  public.calendar_links,
  public.sync_state
from anon;

-- Supabase may grant broad table privileges by default. RLS still controls rows,
-- but least-privilege table grants make the intended API surface explicit.
revoke all privileges on table
  public.subjects,
  public.chapters,
  public.marks_distributions,
  public.exams,
  public.chapter_progress,
  public.study_tasks,
  public.study_sessions,
  public.journal_entries,
  public.mistakes,
  public.mock_results,
  public.calendar_links,
  public.sync_state
from authenticated;

grant select on table
  public.subjects,
  public.chapters,
  public.marks_distributions,
  public.exams
to authenticated;

grant select, insert, update, delete on table
  public.chapter_progress,
  public.study_tasks,
  public.study_sessions,
  public.journal_entries,
  public.mistakes,
  public.mock_results,
  public.calendar_links,
  public.sync_state
to authenticated;

-- This SECURITY DEFINER function is an internal event-trigger helper. The event
-- trigger can invoke it without exposing direct execution to API roles.
revoke execute on function public.rls_auto_enable() from public, anon, authenticated;


