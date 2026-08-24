-- Keep the internal upload-reservation table invisible to browser roles while
-- making the deny-by-default intent explicit to the database advisor.
drop policy if exists "browser roles cannot access upload reservations"
  on public.study_resource_upload_reservations;
create policy "browser roles cannot access upload reservations"
  on public.study_resource_upload_reservations
  for all
  to anon, authenticated
  using (false)
  with check (false);

-- Study windows are retired; their legacy compatibility column remains for a
-- reversible rollout, but its GIN index would only add write overhead.
drop index if exists public.planning_settings_windows_gin_idx;
