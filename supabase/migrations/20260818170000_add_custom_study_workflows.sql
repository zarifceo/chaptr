create table if not exists public.study_workflows (
  user_id uuid not null references auth.users(id) on delete cascade,
  phase text not null check (phase in ('learn', 'revise', 'practice', 'exam')),
  steps jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (user_id, phase)
);

alter table public.study_workflows enable row level security;

create policy "study_workflows_select_own"
  on public.study_workflows for select
  using ((select auth.uid()) = user_id);

create policy "study_workflows_insert_own"
  on public.study_workflows for insert
  with check ((select auth.uid()) = user_id);

create policy "study_workflows_update_own"
  on public.study_workflows for update
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "study_workflows_delete_own"
  on public.study_workflows for delete
  using ((select auth.uid()) = user_id);

create index if not exists study_workflows_user_id_idx on public.study_workflows(user_id);
