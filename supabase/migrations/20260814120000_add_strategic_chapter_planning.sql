create table public.chapter_preferences (
  user_id uuid not null references auth.users(id) on delete cascade,
  chapter_id text not null references public.chapters(id) on delete cascade,
  included_for_ssc boolean not null default true,
  target_month date,
  excluded boolean not null default false,
  exclusion_reason text,
  priority smallint not null default 3 check (priority between 1 and 5),
  updated_at timestamptz not null default now(),
  primary key (user_id, chapter_id),
  check (target_month is null or target_month = date_trunc('month', target_month)::date),
  check (not excluded or target_month is null),
  check (not excluded or not included_for_ssc)
);

comment on table public.chapter_preferences is
  'Per-user strategic syllabus choices. Exclusion is reversible and never deletes the canonical chapter.';

alter table public.chapter_preferences enable row level security;

create policy "owner select chapter_preferences"
  on public.chapter_preferences for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "owner insert chapter_preferences"
  on public.chapter_preferences for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "owner update chapter_preferences"
  on public.chapter_preferences for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "owner delete chapter_preferences"
  on public.chapter_preferences for delete to authenticated
  using ((select auth.uid()) = user_id);

revoke all privileges on table public.chapter_preferences from anon;
revoke all privileges on table public.chapter_preferences from authenticated;
grant select, insert, update, delete on table public.chapter_preferences to authenticated;

create index chapter_preferences_user_month
  on public.chapter_preferences(user_id, target_month)
  where target_month is not null and not excluded;

create index chapter_preferences_user_ssc
  on public.chapter_preferences(user_id, included_for_ssc)
  where included_for_ssc and not excluded;
