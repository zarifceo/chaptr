create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net;

alter table public.account_deletion_requests
  add column if not exists grace_period_days smallint not null default 14,
  add column if not exists processing_started_at timestamptz,
  add column if not exists last_failure_at timestamptz,
  add column if not exists last_error text;

alter table public.account_deletion_requests
  drop constraint if exists account_deletion_requests_status_check;

alter table public.account_deletion_requests
  add constraint account_deletion_requests_status_check
  check (status in ('requested', 'pending_review', 'processing', 'completed', 'cancelled'));

alter table public.account_deletion_requests
  alter column scheduled_for set default (now() + interval '14 days');

update public.account_deletion_requests
set scheduled_for = requested_at + (grace_period_days * interval '1 day')
where scheduled_for is null
  and status in ('requested', 'pending_review');

create index if not exists account_deletion_requests_due_idx
  on public.account_deletion_requests(status, scheduled_for)
  where status in ('requested', 'pending_review', 'processing');

alter table public.account_deletion_requests enable row level security;
drop policy if exists "account_deletion_requests_update_own" on public.account_deletion_requests;
create policy "account_deletion_requests_update_own"
  on public.account_deletion_requests
  for update
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

grant update on public.account_deletion_requests to authenticated;

create or replace function public.cancel_deletion_request_on_sign_in()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if new.last_sign_in_at is distinct from old.last_sign_in_at
     and new.last_sign_in_at is not null then
    update public.account_deletion_requests
    set status = 'cancelled',
        cancelled_at = coalesce(cancelled_at, now()),
        processing_started_at = null,
        last_error = null,
        audit_metadata = coalesce(audit_metadata, '{}'::jsonb) || jsonb_build_object(
          'cancelled_reason', 'signed_in_during_grace_period',
          'cancelled_at', now()
        )
    where user_id = new.id
      and status in ('requested', 'pending_review')
      and (scheduled_for is null or scheduled_for > now());
  end if;
  return new;
end;
$$;

revoke all on function public.cancel_deletion_request_on_sign_in() from public;

drop trigger if exists cancel_deletion_request_on_sign_in on auth.users;
create trigger cancel_deletion_request_on_sign_in
after update of last_sign_in_at on auth.users
for each row
when (old.last_sign_in_at is distinct from new.last_sign_in_at)
execute function public.cancel_deletion_request_on_sign_in();

create or replace function public.verify_account_deletion_cron_token(candidate text)
returns boolean
language sql
security definer
set search_path = public, vault
as $$
  select candidate is not null
    and candidate = (
      select decrypted_secret
      from vault.decrypted_secrets
      where name = 'chaptr_account_deletion_cron_token'
      limit 1
    );
$$;

revoke all on function public.verify_account_deletion_cron_token(text) from public;
grant execute on function public.verify_account_deletion_cron_token(text) to anon;

do $$
begin
  if not exists (
    select 1 from vault.secrets where name = 'chaptr_account_deletion_cron_token'
  ) then
    perform vault.create_secret(
      encode(gen_random_bytes(32), 'hex'),
      'chaptr_account_deletion_cron_token',
      'Private token used only by the scheduled account deletion Edge Function.'
    );
  end if;

  if not exists (
    select 1 from vault.secrets where name = 'chaptr_account_deletion_publishable_key'
  ) then
    perform vault.create_secret(
      'sb_publishable_WZQsGCcaqr_7_rm85uQaug_jzdm6zK8',
      'chaptr_account_deletion_publishable_key',
      'Publishable project key used by the scheduled account deletion Edge Function request.'
    );
  end if;
end;
$$;

do $$
declare
  existing_job_id bigint;
begin
  select jobid into existing_job_id
  from cron.job
  where jobname = 'chaptr-account-deletion-reconciler';

  if existing_job_id is not null then
    perform cron.unschedule(existing_job_id);
  end if;

  perform cron.schedule(
    'chaptr-account-deletion-reconciler',
    '15 2 * * *',
    $cron$
      select net.http_post(
        url := 'https://jjqmeuizldwymbvqynfw.supabase.co/functions/v1/process-account-deletions',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'apikey', (select decrypted_secret from vault.decrypted_secrets where name = 'chaptr_account_deletion_publishable_key'),
          'x-cron-token', (select decrypted_secret from vault.decrypted_secrets where name = 'chaptr_account_deletion_cron_token')
        ),
        body := jsonb_build_object('triggered_at', now())
      ) as request_id;
    $cron$
  );
end;
$$;

comment on table public.account_deletion_requests is 'Authenticated deletion requests with a 14-day grace period. A qualifying sign-in cancels the request; a protected daily reconciler deletes due accounts and owned data.';
notify pgrst, 'reload schema';
