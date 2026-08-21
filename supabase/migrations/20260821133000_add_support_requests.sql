create table if not exists public.support_requests (
  id uuid primary key default gen_random_uuid(),
  reference_code text not null unique default ('CHP-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8))),
  user_id uuid not null references auth.users(id) on delete cascade,
  category text not null check (category in ('getting-started', 'tasks-study-flow', 'syllabus-goals', 'calendar', 'resources', 'account-privacy', 'planning-recommendations')),
  page_context text check (page_context is null or char_length(page_context) <= 120),
  description text not null check (char_length(description) between 10 and 4000),
  expected_behavior text check (expected_behavior is null or char_length(expected_behavior) <= 2000),
  diagnostic_details jsonb check (diagnostic_details is null or jsonb_typeof(diagnostic_details) = 'object'),
  status text not null default 'open' check (status in ('open', 'in_review', 'resolved', 'closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists support_requests_user_created_idx on public.support_requests(user_id, created_at desc);
alter table public.support_requests enable row level security;
drop policy if exists "support_requests_select_own" on public.support_requests;
drop policy if exists "support_requests_insert_own" on public.support_requests;
create policy "support_requests_select_own" on public.support_requests for select using ((select auth.uid()) = user_id);
create policy "support_requests_insert_own" on public.support_requests for insert with check ((select auth.uid()) = user_id);

create table if not exists public.account_deletion_requests (
  id uuid primary key default gen_random_uuid(),
  reference_code text not null unique default ('DEL-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8))),
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'requested' check (status in ('requested', 'pending_review', 'completed', 'cancelled')),
  requested_at timestamptz not null default now(),
  confirmed_at timestamptz not null default now(),
  scheduled_for timestamptz,
  completed_at timestamptz,
  cancelled_at timestamptz,
  audit_metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(audit_metadata) = 'object')
);
create index if not exists account_deletion_requests_user_requested_idx on public.account_deletion_requests(user_id, requested_at desc);
create unique index if not exists account_deletion_requests_one_active_idx on public.account_deletion_requests(user_id) where status in ('requested', 'pending_review');
alter table public.account_deletion_requests enable row level security;
drop policy if exists "account_deletion_requests_select_own" on public.account_deletion_requests;
drop policy if exists "account_deletion_requests_insert_own" on public.account_deletion_requests;
create policy "account_deletion_requests_select_own" on public.account_deletion_requests for select using ((select auth.uid()) = user_id);
create policy "account_deletion_requests_insert_own" on public.account_deletion_requests for insert with check ((select auth.uid()) = user_id);
revoke all on public.support_requests from anon;
revoke all on public.account_deletion_requests from anon;
grant select, insert on public.support_requests to authenticated;
grant select, insert on public.account_deletion_requests to authenticated;
comment on table public.support_requests is 'Authenticated student support requests owned by the submitting user.';
comment on table public.account_deletion_requests is 'Authenticated account deletion requests; execution is handled by a protected operational workflow.';
notify pgrst, 'reload schema';
