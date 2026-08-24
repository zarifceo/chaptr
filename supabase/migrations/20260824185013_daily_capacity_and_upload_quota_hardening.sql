-- Make learning_preferences the application-level source of truth for daily
-- capacity. Legacy columns are retained for a reversible production rollout,
-- but no current route reads or writes them.

comment on column public.user_profiles.daily_target is
  'Deprecated compatibility field. Daily capacity lives in learning_preferences.';
comment on column public.user_profiles.main_start is
  'Deprecated compatibility field. Chaptr no longer uses study windows.';
comment on column public.user_profiles.main_end is
  'Deprecated compatibility field. Chaptr no longer uses study windows.';
comment on column public.planning_settings.study_windows is
  'Deprecated compatibility field. Chaptr plans by daily capacity and does not read this value.';
comment on column public.planning_settings.daily_target is
  'Deprecated compatibility field. Daily capacity lives in learning_preferences.';
comment on column public.learning_preferences.sessions_per_day is
  'Deprecated compatibility field. Focus-block count is derived from daily capacity.';
comment on column public.learning_preferences.available_days is
  'Deprecated compatibility field. Weekday and weekend per-day capacities apply across the full week.';

comment on column public.learning_preferences.weekday_minutes is
  'Per-day capacity for Sunday through Thursday in Bangladesh.';
comment on column public.learning_preferences.weekend_minutes is
  'Per-day capacity for Friday and Saturday in Bangladesh.';
comment on column public.learning_preferences.session_length_minutes is
  'Preferred focus-block length; the app derives block count from daily capacity.';

-- Signed upload tokens are the only write path for private study files. A
-- service-role-only reservation ledger makes count and aggregate-byte quotas
-- authoritative even if clients request several tokens concurrently or lie
-- about the eventual Content-Length. Signed upload URLs are valid for 2 hours,
-- so reservations use the same lifetime.

create table if not exists public.study_resource_upload_reservations (
  storage_path text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  reserved_bytes bigint not null check (reserved_bytes between 1 and 26214400),
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists study_resource_upload_reservations_user_expiry_idx
  on public.study_resource_upload_reservations(user_id, expires_at);

alter table public.study_resource_upload_reservations enable row level security;
revoke all on public.study_resource_upload_reservations from public, anon, authenticated;
grant select, insert, update, delete on public.study_resource_upload_reservations to service_role;

drop policy if exists "study resources owner insert" on storage.objects;
revoke insert on storage.objects from authenticated;
drop function if exists public.can_upload_study_resource(text);
drop function if exists public.can_upload_study_resource(text, jsonb);

create or replace function public.reserve_study_resource_upload(
  p_user_id uuid,
  p_storage_path text,
  p_reserved_bytes bigint
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_file_count bigint := 0;
  v_used_bytes bigint := 0;
  v_pending_count bigint := 0;
  v_pending_bytes bigint := 0;
begin
  if p_user_id is null
    or p_storage_path is null
    or split_part(p_storage_path, '/', 1) <> p_user_id::text
    or p_reserved_bytes not between 1 and 26214400 then
    raise exception 'invalid_resource_upload_reservation';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_user_id::text, 0));

  delete from public.study_resource_upload_reservations
  where expires_at <= now();

  select count(*), coalesce(sum(coalesce((metadata ->> 'size')::bigint, 0)), 0)
    into v_file_count, v_used_bytes
  from storage.objects
  where bucket_id = 'study-resources'
    and (storage.foldername(name))[1] = p_user_id::text;

  select count(*), coalesce(sum(r.reserved_bytes), 0)
    into v_pending_count, v_pending_bytes
  from public.study_resource_upload_reservations r
  where r.user_id = p_user_id
    and r.expires_at > now()
    and not exists (
      select 1
      from storage.objects o
      where o.bucket_id = 'study-resources'
        and o.name = r.storage_path
    );

  if v_file_count + v_pending_count >= 100 then
    raise exception 'resource_file_limit_exceeded';
  end if;

  if v_used_bytes + v_pending_bytes + p_reserved_bytes > 524288000 then
    raise exception 'resource_byte_limit_exceeded';
  end if;

  insert into public.study_resource_upload_reservations (
    storage_path, user_id, reserved_bytes, expires_at
  ) values (
    p_storage_path, p_user_id, p_reserved_bytes, now() + interval '2 hours'
  );

  return true;
end;
$$;

revoke all on function public.reserve_study_resource_upload(uuid, text, bigint)
  from public, anon, authenticated;
grant execute on function public.reserve_study_resource_upload(uuid, text, bigint)
  to service_role;

notify pgrst, 'reload schema';
