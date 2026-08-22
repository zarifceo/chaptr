-- Consent evidence remains immutable during ordinary application writes, but an
-- Auth user deletion must be able to cascade through the owning foreign key.
create or replace function public.prevent_policy_acceptance_log_mutation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'DELETE'
     and not exists (
       select 1
       from auth.users
       where id = old.user_id
     ) then
    return old;
  end if;

  raise exception 'Policy acceptance logs are append-only';
end;
$$;
