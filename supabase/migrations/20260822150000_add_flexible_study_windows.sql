alter table public.planning_settings
  add column if not exists study_windows jsonb not null default '[{"id":"window-1","start":"09:00","end":"12:00"}]'::jsonb;

update public.planning_settings
set study_windows = case
  when main_start = '15:00'::time and main_end = '19:00'::time and math_start = '20:00'::time and math_end = '22:00'::time
    then '[{"id":"window-1","start":"09:00","end":"12:00"}]'::jsonb
  else jsonb_build_array(jsonb_build_object(
    'id', 'window-1',
    'start', to_char(main_start, 'HH24:MI'),
    'end', to_char(main_end, 'HH24:MI')
  ))
end
where study_windows = '[{"id":"window-1","start":"09:00","end":"12:00"}]'::jsonb;

alter table public.planning_settings
  add constraint planning_settings_study_windows_shape
  check (jsonb_typeof(study_windows) = 'array' and jsonb_array_length(study_windows) between 1 and 4);

comment on column public.planning_settings.study_windows is 'User-defined daily study windows. Each item has id, start, and end in HH:MM format; subjects are never assigned to a specific window.';

create index if not exists planning_settings_windows_gin_idx on public.planning_settings using gin (study_windows);
