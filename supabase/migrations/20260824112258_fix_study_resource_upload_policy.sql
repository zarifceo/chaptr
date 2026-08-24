-- File size is enforced by storage.buckets.file_size_limit. The previous policy
-- read metadata.size before Storage had populated it, so every INSERT saw zero
-- bytes and failed RLS. Keep direct uploads owner-scoped and count-bounded;
-- the app issues signed upload URLs after checking the aggregate user quota.
grant select, insert, update, delete on public.study_resources to authenticated;
grant select, insert, update, delete on storage.objects to authenticated;

drop policy if exists "study resources owner insert" on storage.objects;
drop function if exists public.can_upload_study_resource(text, jsonb);

create or replace function public.can_upload_study_resource(p_name text)
returns boolean
language sql
stable
security invoker
set search_path = public, storage
as $$
  select
    (select auth.uid()) is not null
    and (storage.foldername(p_name))[1] = (select auth.uid())::text
    and (
      select count(*) < 100
      from storage.objects
      where bucket_id = 'study-resources'
        and (storage.foldername(name))[1] = (select auth.uid())::text
    );
$$;

revoke all on function public.can_upload_study_resource(text) from public, anon;
grant execute on function public.can_upload_study_resource(text) to authenticated;

create policy "study resources owner insert"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'study-resources'
    and (select public.can_upload_study_resource(name))
  );

notify pgrst, 'reload schema';
