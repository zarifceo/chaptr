drop policy if exists "policy acceptance logs owner insert" on public.policy_acceptance_logs;
create policy "policy acceptance logs owner insert" on public.policy_acceptance_logs
  for insert to authenticated
  with check (
    (select auth.uid()) = user_id
    and terms_version = '2026-08-22'
    and privacy_version = '2026-08-22'
    and source in ('signup', 'reacceptance')
  );

grant insert on public.policy_acceptance_logs to authenticated;

create or replace function public.accept_current_policy_versions(
  p_terms_version text,
  p_privacy_version text,
  p_source text default 'reacceptance'
)
returns jsonb
language plpgsql
security invoker
set search_path = public
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
    user_id,
    terms_accepted_at,
    privacy_accepted_at,
    terms_version,
    privacy_version,
    updated_at
  ) values (
    v_user_id,
    v_accepted_at,
    v_accepted_at,
    p_terms_version,
    p_privacy_version,
    v_accepted_at
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

revoke all on function public.accept_current_policy_versions(text, text, text) from public;
revoke all on function public.accept_current_policy_versions(text, text, text) from anon;
grant execute on function public.accept_current_policy_versions(text, text, text) to authenticated;
