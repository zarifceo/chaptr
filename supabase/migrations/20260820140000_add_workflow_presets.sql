create table if not exists public.study_workflow_presets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  description text not null default '' check (char_length(description) <= 240),
  phase text not null check (phase in ('learn', 'revise', 'practice', 'exam')),
  subject_type text not null check (subject_type in ('theory', 'mathematical', 'custom')),
  steps jsonb not null default '[]'::jsonb check (jsonb_typeof(steps) = 'array'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, name)
);

alter table public.study_workflow_presets enable row level security;

drop policy if exists "study_workflow_presets_select_own" on public.study_workflow_presets;
drop policy if exists "study_workflow_presets_insert_own" on public.study_workflow_presets;
drop policy if exists "study_workflow_presets_update_own" on public.study_workflow_presets;
drop policy if exists "study_workflow_presets_delete_own" on public.study_workflow_presets;

create policy "study_workflow_presets_select_own"
  on public.study_workflow_presets for select
  using ((select auth.uid()) = user_id);

create policy "study_workflow_presets_insert_own"
  on public.study_workflow_presets for insert
  with check ((select auth.uid()) = user_id);

create policy "study_workflow_presets_update_own"
  on public.study_workflow_presets for update
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "study_workflow_presets_delete_own"
  on public.study_workflow_presets for delete
  using ((select auth.uid()) = user_id);

create index if not exists study_workflow_presets_user_phase_idx
  on public.study_workflow_presets(user_id, phase);
