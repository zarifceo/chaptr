alter table public.study_tasks
  add column if not exists workflow_stage int,
  add column if not exists workflow_stage_count int,
  add column if not exists workflow_stage_label text,
  add column if not exists workflow_group_id text;

alter table public.study_tasks
  add constraint study_tasks_workflow_stage_shape
  check (
    workflow_stage is null
    or (
      workflow_stage >= 1
      and workflow_stage_count is not null
      and workflow_stage_count >= workflow_stage
      and workflow_stage_label is not null
      and workflow_group_id is not null
    )
  );

create index if not exists study_tasks_workflow_group_idx
  on public.study_tasks(user_id, workflow_group_id, workflow_stage);
