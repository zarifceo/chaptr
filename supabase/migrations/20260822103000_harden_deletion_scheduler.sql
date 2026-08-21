revoke all on function public.cancel_deletion_request_on_sign_in() from public, anon, authenticated;
revoke all on function public.verify_account_deletion_cron_token(text) from public, anon, authenticated;
grant execute on function public.verify_account_deletion_cron_token(text) to service_role;

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
