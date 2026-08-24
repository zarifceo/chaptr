-- Preset names only need to be unique inside the flow where students use them.
-- The former user-wide constraint made ordinary names such as "My study preset"
-- collide across Learn, Revise, Practice, and Exam flows.
alter table public.study_workflow_presets
  drop constraint if exists study_workflow_presets_user_id_name_key;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.study_workflow_presets'::regclass
      and conname = 'study_workflow_presets_user_context_name_key'
  ) then
    alter table public.study_workflow_presets
      add constraint study_workflow_presets_user_context_name_key
      unique (user_id, phase, subject_type, name);
  end if;
end
$$;

grant select, insert, update, delete
  on table public.study_workflow_presets
  to authenticated;

notify pgrst, 'reload schema';
