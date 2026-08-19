create table if not exists public.exam_plan_phases (
  id text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  starts_on date not null,
  ends_on date not null,
  objective text not null default '',
  phase_order int not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id, id),
  check (ends_on >= starts_on),
  unique (user_id, phase_order)
);

alter table public.exam_plan_phases enable row level security;

drop policy if exists "owner select exam_plan_phases" on public.exam_plan_phases;
drop policy if exists "owner insert exam_plan_phases" on public.exam_plan_phases;
drop policy if exists "owner update exam_plan_phases" on public.exam_plan_phases;
drop policy if exists "owner delete exam_plan_phases" on public.exam_plan_phases;

create policy "owner select exam_plan_phases" on public.exam_plan_phases for select to authenticated using ((select auth.uid()) = user_id);
create policy "owner insert exam_plan_phases" on public.exam_plan_phases for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "owner update exam_plan_phases" on public.exam_plan_phases for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "owner delete exam_plan_phases" on public.exam_plan_phases for delete to authenticated using ((select auth.uid()) = user_id);

revoke all privileges on table public.exam_plan_phases from anon;
grant select, insert, update, delete on table public.exam_plan_phases to authenticated;
create index if not exists exam_plan_phases_user_order_idx on public.exam_plan_phases(user_id, phase_order);

notify pgrst, 'reload schema';
