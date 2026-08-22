-- Protect destructive workflows and consent evidence from direct Data API mutation.

drop policy if exists "account_deletion_requests_insert_own" on public.account_deletion_requests;
drop policy if exists "account_deletion_requests_update_own" on public.account_deletion_requests;
revoke insert, update, delete on public.account_deletion_requests from authenticated;

drop policy if exists "policy acceptance logs owner insert" on public.policy_acceptance_logs;
revoke insert, update, delete on public.policy_acceptance_logs from authenticated;

revoke insert, update on public.user_profiles from authenticated;
grant insert (
  user_id, display_name, board, exam_year, selected_subjects, daily_target,
  main_start, main_end, onboarding_step, onboarding_completed, updated_at,
  academic_profile_completed, academic_year, book_language, fourth_subject_id,
  most_difficult_subject_id, quick_start_status, religion_subject_id,
  subject_strengths, study_group
) on public.user_profiles to authenticated;
grant update (
  display_name, board, exam_year, selected_subjects, daily_target,
  main_start, main_end, onboarding_step, onboarding_completed, updated_at,
  academic_profile_completed, academic_year, book_language, fourth_subject_id,
  most_difficult_subject_id, quick_start_status, religion_subject_id,
  subject_strengths, study_group
) on public.user_profiles to authenticated;

create or replace function public.accept_current_policy_versions(
  p_terms_version text,
  p_privacy_version text,
  p_source text default 'reacceptance'
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_accepted_at timestamptz := now();
  v_log_id uuid;
begin
  if v_user_id is null then
    raise exception 'Authentication is required';
  end if;
  if p_terms_version <> '2026-08-22' or p_privacy_version <> '2026-08-22' then
    raise exception 'The current policy versions must be accepted';
  end if;
  if p_source not in ('signup', 'reacceptance') then
    raise exception 'Invalid policy acceptance source';
  end if;

  insert into public.policy_acceptance_logs (user_id, terms_version, privacy_version, accepted_at, source)
  values (v_user_id, p_terms_version, p_privacy_version, v_accepted_at, p_source)
  returning id into v_log_id;

  insert into public.user_profiles (
    user_id, terms_accepted_at, privacy_accepted_at, terms_version, privacy_version, updated_at
  ) values (
    v_user_id, v_accepted_at, v_accepted_at, p_terms_version, p_privacy_version, v_accepted_at
  )
  on conflict (user_id) do update set
    terms_accepted_at = excluded.terms_accepted_at,
    privacy_accepted_at = excluded.privacy_accepted_at,
    terms_version = excluded.terms_version,
    privacy_version = excluded.privacy_version,
    updated_at = excluded.updated_at;

  return jsonb_build_object(
    'id', v_log_id,
    'user_id', v_user_id,
    'terms_version', p_terms_version,
    'privacy_version', p_privacy_version,
    'accepted_at', v_accepted_at,
    'source', p_source
  );
end;
$$;

revoke all on function public.accept_current_policy_versions(text, text, text) from public, anon;
grant execute on function public.accept_current_policy_versions(text, text, text) to authenticated;

-- Bound private study uploads by actual object size, count, and aggregate stored bytes.
update storage.buckets
set file_size_limit = 26214400,
    allowed_mime_types = array[
      'application/pdf', 'text/plain', 'text/markdown', 'image/jpeg', 'image/png',
      'image/webp', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword'
    ]
where id = 'study-resources';

create or replace function public.can_upload_study_resource(p_name text, p_metadata jsonb)
returns boolean
language sql
stable
security invoker
set search_path = public, storage
as $$
  select
    (select auth.uid()) is not null
    and (storage.foldername(p_name))[1] = (select auth.uid())::text
    and coalesce((p_metadata ->> 'size')::bigint, 0) between 1 and 26214400
    and (
      select count(*) < 100
        and coalesce(sum(coalesce((metadata ->> 'size')::bigint, 0)), 0)
          + coalesce((p_metadata ->> 'size')::bigint, 0) <= 524288000
      from storage.objects
      where bucket_id = 'study-resources'
        and (storage.foldername(name))[1] = (select auth.uid())::text
    );
$$;

revoke all on function public.can_upload_study_resource(text, jsonb) from public, anon;
grant execute on function public.can_upload_study_resource(text, jsonb) to authenticated;

drop policy if exists "study resources owner insert" on storage.objects;
create policy "study resources owner insert"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'study-resources'
    and (select public.can_upload_study_resource(name, metadata))
  );

-- Cover current foreign-key join and delete paths flagged by the database advisor.
create index if not exists curated_textbooks_subject_id_idx on public.curated_textbooks(subject_id);
create index if not exists exam_sessions_chapter_id_idx on public.exam_sessions(chapter_id);
create index if not exists exam_sessions_subject_id_idx on public.exam_sessions(subject_id);
create index if not exists maths_formulas_chapter_id_idx on public.maths_formulas(chapter_id);
create index if not exists study_resources_chapter_id_idx on public.study_resources(chapter_id);
create index if not exists study_resources_subject_id_idx on public.study_resources(subject_id);
create index if not exists study_sessions_chapter_id_idx on public.study_sessions(chapter_id);
create index if not exists study_sessions_subject_id_idx on public.study_sessions(subject_id);
create index if not exists user_profiles_fourth_subject_id_idx on public.user_profiles(fourth_subject_id);
create index if not exists user_profiles_religion_subject_id_idx on public.user_profiles(religion_subject_id);

notify pgrst, 'reload schema';
