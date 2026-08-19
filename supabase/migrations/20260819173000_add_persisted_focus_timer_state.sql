alter table public.study_sessions
  add column if not exists timer_state text not null default 'completed' check (timer_state in ('running', 'paused', 'completed')),
  add column if not exists last_resumed_at timestamptz;

create index if not exists study_sessions_active_timer_idx
  on public.study_sessions(user_id, timer_state)
  where timer_state in ('running', 'paused');

notify pgrst, 'reload schema';
