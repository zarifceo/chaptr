alter table public.mistakes
  add column if not exists revision_count int not null default 0,
  add column if not exists last_attempted_at timestamptz,
  add column if not exists last_attempt_note text;

comment on column public.mistakes.revision_count is 'Number of deliberate revision attempts recorded for this mistake.';
comment on column public.mistakes.last_attempted_at is 'Timestamp of the most recent revision attempt.';
comment on column public.mistakes.last_attempt_note is 'Short note captured during the most recent revision attempt.';
