alter table public.study_resources enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'study_resources' and policyname = 'owner select study_resources') then
    create policy "owner select study_resources" on public.study_resources for select to authenticated using ((select auth.uid()) = user_id);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'study_resources' and policyname = 'owner insert study_resources') then
    create policy "owner insert study_resources" on public.study_resources for insert to authenticated with check ((select auth.uid()) = user_id);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'study_resources' and policyname = 'owner update study_resources') then
    create policy "owner update study_resources" on public.study_resources for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'study_resources' and policyname = 'owner delete study_resources') then
    create policy "owner delete study_resources" on public.study_resources for delete to authenticated using ((select auth.uid()) = user_id);
  end if;
end $$;
