alter table public.study_resources
  add column if not exists source text not null default 'url' check (source in ('url', 'upload')),
  add column if not exists storage_path text,
  add column if not exists file_name text,
  add column if not exists mime_type text,
  add column if not exists file_size bigint;

create index if not exists study_resources_user_source_idx
  on public.study_resources(user_id, source, updated_at desc);

create table if not exists public.curated_textbooks (
  id text primary key,
  subject_id text not null references public.subjects(id) on delete cascade,
  title text not null,
  board text not null default 'NCTB',
  academic_year integer not null,
  url text not null,
  alternate_url text,
  source_page text not null,
  source_label text not null default 'NCTB official source',
  note text,
  sort_order integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.curated_textbooks enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'curated_textbooks' and policyname = 'authenticated reads curated textbooks') then
    create policy "authenticated reads curated textbooks" on public.curated_textbooks for select to authenticated using (active = true);
  end if;
end $$;

grant select on public.curated_textbooks to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'study-resources',
  'study-resources',
  false,
  125829120,
  array['application/pdf', 'text/plain', 'text/markdown', 'image/jpeg', 'image/png', 'image/webp', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/msword', 'application/octet-stream']
)
on conflict (id) do update set
  public = false,
  file_size_limit = 125829120,
  allowed_mime_types = excluded.allowed_mime_types;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'study resources owner select') then
    create policy "study resources owner select" on storage.objects for select to authenticated using (bucket_id = 'study-resources' and (storage.foldername(name))[1] = (select auth.uid())::text);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'study resources owner insert') then
    create policy "study resources owner insert" on storage.objects for insert to authenticated with check (bucket_id = 'study-resources' and (storage.foldername(name))[1] = (select auth.uid())::text);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'study resources owner update') then
    create policy "study resources owner update" on storage.objects for update to authenticated using (bucket_id = 'study-resources' and (storage.foldername(name))[1] = (select auth.uid())::text) with check (bucket_id = 'study-resources' and (storage.foldername(name))[1] = (select auth.uid())::text);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'study resources owner delete') then
    create policy "study resources owner delete" on storage.objects for delete to authenticated using (bucket_id = 'study-resources' and (storage.foldername(name))[1] = (select auth.uid())::text);
  end if;
end $$;

grant select, insert, update, delete on storage.objects to authenticated;

grant select on public.curated_textbooks to anon, authenticated;

insert into public.curated_textbooks (id, subject_id, title, board, academic_year, url, alternate_url, source_page, source_label, note, sort_order)
values
  ('nctb-2026-bangla-literature', 'bangla-1', 'Bangla Literature', 'NCTB', 2026, 'https://drive.google.com/file/d/1yjdxHcyFeQLBKLD8tykuqGABh_CaCXIn/view?usp=drive_link', 'https://drive.egovcloud.gov.bd/index.php/s/bspYlB4Rwd4VFUM', 'http://nctb.gov.bd/pages/static-pages/695b99afc4774958d7b70612', 'NCTB 2026 official textbook list', 'Official Class 9–10 board textbook link.', 10),
  ('nctb-2026-bangla-companion', 'bangla-1', 'Bangla Companion', 'NCTB', 2026, 'https://drive.google.com/file/d/1NqVcm3tt4olBGRPqi_tVksF__yknMNL8/view?usp=drive_link', 'https://drive.egovcloud.gov.bd/index.php/s/DJ6TEuMohVdTuht', 'http://nctb.gov.bd/pages/static-pages/695b99afc4774958d7b70612', 'NCTB 2026 official textbook list', 'Official Class 9–10 board textbook link.', 20),
  ('nctb-2026-bangla-grammar', 'bangla-2', 'Bangla Language Grammar and Composition', 'NCTB', 2026, 'https://drive.google.com/file/d/1yqoG73PYj6F8xlB-WTNfGSUk9Yf1z_tR/view?usp=drive_link', 'https://drive.egovcloud.gov.bd/index.php/s/z7CNJUJAw9UuPv5', 'http://nctb.gov.bd/pages/static-pages/695b99afc4774958d7b70612', 'NCTB 2026 official textbook list', 'Official Class 9–10 board textbook link.', 30),
  ('nctb-2026-english-today', 'english-1', 'English For Today', 'NCTB', 2026, 'https://drive.google.com/file/d/119HUFSrDZ9GrG_cLGAgVVzM4XMPkA_1g/view?usp=drive_link', 'https://drive.egovcloud.gov.bd/index.php/s/CobRtJNoc1ISrGv', 'http://nctb.gov.bd/pages/static-pages/695b99afc4774958d7b70612', 'NCTB 2026 official textbook list', 'Official Class 9–10 board textbook link.', 40),
  ('nctb-2026-english-grammar', 'english-2', 'English Grammar and Composition', 'NCTB', 2026, 'https://drive.google.com/file/d/1bcIWidHEPsNpwx4Q9EXHdCbFA6HBQWbr/view?usp=drive_link', 'https://drive.egovcloud.gov.bd/index.php/s/6cNd5kYL7lbK62r', 'http://nctb.gov.bd/pages/static-pages/695b99afc4774958d7b70612', 'NCTB 2026 official textbook list', 'Official Class 9–10 board textbook link.', 50),
  ('nctb-2026-mathematics', 'mathematics', 'Mathematics', 'NCTB', 2026, 'https://drive.google.com/file/d/1-Dj-9Y1Q79AWN7fViMR8fj4jvzDVNYYl/view?usp=drive_link', 'https://drive.egovcloud.gov.bd/index.php/s/HwrCrAtDhb9K484', 'http://nctb.gov.bd/pages/static-pages/695b99afc4774958d7b70612', 'NCTB 2026 official textbook list', 'Official Class 9–10 board textbook link.', 60),
  ('nctb-2026-ict', 'ict', 'Information and Communication Technology', 'NCTB', 2026, 'https://drive.google.com/file/d/1jgAhqSmR6zXZzcSr0fpkWbcw3_07pPGe/view?usp=drive_link', 'https://drive.egovcloud.gov.bd/index.php/s/PjriLZ5LTTdrkDc', 'http://nctb.gov.bd/pages/static-pages/695b99afc4774958d7b70612', 'NCTB 2026 official textbook list', 'Official Class 9–10 board textbook link.', 70),
  ('nctb-2026-science', 'science', 'Science', 'NCTB', 2026, 'https://drive.google.com/file/d/1AYg7uY_WjVYJmoskhb0-D58iFPvgwmpJ/view?usp=drive_link', 'https://drive.egovcloud.gov.bd/index.php/s/NupFtnqI21e6svU', 'http://nctb.gov.bd/pages/static-pages/695b99afc4774958d7b70612', 'NCTB 2026 official textbook list', 'Official Class 9–10 board textbook link.', 80),
  ('nctb-2026-agriculture', 'agriculture', 'Agriculture Studies', 'NCTB', 2026, 'https://drive.google.com/file/d/1vcbOBJYqqH9RrWM7q1FTSAWkFwhrhSwj/view?usp=drive_link', 'https://drive.egovcloud.gov.bd/index.php/s/WlPU0WZt9GuN5mR', 'http://nctb.gov.bd/pages/static-pages/695b99afc4774958d7b70612', 'NCTB 2026 official textbook list', 'Official Class 9–10 board textbook link.', 90),
  ('nctb-2026-accounting', 'accounting', 'Accounting', 'NCTB', 2026, 'https://drive.google.com/file/d/1rdxqp5pbj4L_YOARjByJQm4YH8WhYm-D/view?usp=drive_link', 'https://drive.egovcloud.gov.bd/index.php/s/IxTLwFRfjGP6AO4', 'http://nctb.gov.bd/pages/static-pages/695b99afc4774958d7b70612', 'NCTB 2026 official textbook list', 'Official Class 9–10 board textbook link.', 100),
  ('nctb-2026-finance', 'finance', 'Finance and Banking', 'NCTB', 2026, 'https://drive.google.com/file/d/1mTSzCxZWjbmGZQWaiwV6y0Y170pwrNDD/view?usp=drive_link', 'https://drive.egovcloud.gov.bd/index.php/s/hMQenv7qpYI7A9k', 'http://nctb.gov.bd/pages/static-pages/695b99afc4774958d7b70612', 'NCTB 2026 official textbook list', 'Official Class 9–10 board textbook link.', 110),
  ('nctb-2026-business', 'business', 'Business Entrepreneurship', 'NCTB', 2026, 'https://drive.google.com/file/d/1eR_R_nf_GGgeDvRPiSeZa35o1gOtSO-3/view?usp=drive_link', 'https://drive.egovcloud.gov.bd/index.php/s/ZSSo3l4WrIIuMZW', 'http://nctb.gov.bd/pages/static-pages/695b99afc4774958d7b70612', 'NCTB 2026 official textbook list', 'Official Class 9–10 board textbook link.', 120),
  ('nctb-2026-islam', 'islam', 'Islamic Studies', 'NCTB', 2026, 'https://drive.google.com/file/d/1-2tcr1JJFEB56yOlVhqRpssKJOIaXNM6/view?usp=drive_link', 'https://drive.egovcloud.gov.bd/index.php/s/P4DQEn2UadaVBjS', 'http://nctb.gov.bd/pages/static-pages/695b99afc4774958d7b70612', 'NCTB 2026 official textbook list', 'Official Class 9–10 board textbook link.', 130)
on conflict (id) do update set
  title = excluded.title,
  subject_id = excluded.subject_id,
  academic_year = excluded.academic_year,
  url = excluded.url,
  alternate_url = excluded.alternate_url,
  source_page = excluded.source_page,
  source_label = excluded.source_label,
  note = excluded.note,
  sort_order = excluded.sort_order,
  active = true,
  updated_at = now();

notify pgrst, 'reload schema';
