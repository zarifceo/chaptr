create table if not exists public.maths_formulas (
  id text primary key,
  subject_id text not null references public.subjects(id) on delete cascade,
  chapter_id text references public.chapters(id) on delete cascade,
  division text not null check (division in ('Core basics', 'Algebra', 'Geometry', 'Trigonometry & Mensuration', 'Statistics')),
  title text not null,
  expression text not null,
  explanation text not null,
  tags text[] not null default '{}',
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(subject_id, division, title)
);

alter table public.maths_formulas enable row level security;

revoke all privileges on table public.maths_formulas from anon, authenticated;
grant select on table public.maths_formulas to authenticated;

drop policy if exists "authenticated reads maths formulas" on public.maths_formulas;
create policy "authenticated reads maths formulas" on public.maths_formulas
  for select to authenticated using (true);

create index if not exists maths_formulas_subject_division_order_idx
  on public.maths_formulas(subject_id, division, sort_order);

notify pgrst, 'reload schema';
