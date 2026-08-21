create table if not exists public.policy_acceptance_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  terms_version text not null,
  privacy_version text not null,
  accepted_at timestamptz not null default now(),
  source text not null check (source in ('signup', 'reacceptance', 'legacy_profile_backfill'))
);

create index if not exists policy_acceptance_logs_user_accepted_idx
  on public.policy_acceptance_logs(user_id, accepted_at desc);

alter table public.policy_acceptance_logs enable row level security;

drop policy if exists "policy acceptance logs owner select" on public.policy_acceptance_logs;
create policy "policy acceptance logs owner select" on public.policy_acceptance_logs
  for select to authenticated using ((select auth.uid()) = user_id);

revoke all on public.policy_acceptance_logs from anon;
revoke all on public.policy_acceptance_logs from authenticated;
grant select on public.policy_acceptance_logs to authenticated;

create or replace function public.prevent_policy_acceptance_log_mutation()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  raise exception 'Policy acceptance logs are append-only';
end;
$$;

drop trigger if exists policy_acceptance_logs_immutable on public.policy_acceptance_logs;
create trigger policy_acceptance_logs_immutable
  before update or delete on public.policy_acceptance_logs
  for each row execute function public.prevent_policy_acceptance_log_mutation();

create or replace function public.accept_current_policy_versions(
  p_terms_version text,
  p_privacy_version text,
  p_source text default 'reacceptance'
)
returns jsonb
language plpgsql
security definer
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

insert into public.policy_acceptance_logs (user_id, terms_version, privacy_version, accepted_at, source)
select
  user_id,
  terms_version,
  privacy_version,
  greatest(terms_accepted_at, privacy_accepted_at),
  'legacy_profile_backfill'
from public.user_profiles
where terms_version is not null
  and privacy_version is not null
  and terms_accepted_at is not null
  and privacy_accepted_at is not null
  and not exists (
    select 1
    from public.policy_acceptance_logs existing
    where existing.user_id = user_profiles.user_id
  );
