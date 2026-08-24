# Workflow preset audit — 25 August 2026

## Reported journey

1. Open Settings and create or edit a reusable study preset.
2. Open Add task and choose the task's workflow and a saved preset.
3. Switch subjects and receive the correct subject-based workflow default.

## Findings

- P0 functional: saving presets failed in production. Postgres logs confirmed a duplicate-key failure on `study_workflow_presets_user_id_name_key`.
- P0 data safety: the API deleted every saved preset before attempting the replacement insert, so a failed insert could leave the user with no presets.
- P1 usability: task creation did not expose workflow type or saved preset selection.
- P1 navigation: task creation had no route to the preset configuration section.
- P1 logic: the mathematical subject classification existed for Mathematics, Higher Mathematics, and Accounting, but users could not see or override the selected type.
- P2 hierarchy: Settings mixed workflow type, study goal, system templates, saved presets, metadata, and step editing into one undifferentiated block.

## Implemented correction

- Preset names are unique per user + study goal + workflow type, not across the entire account.
- Preset sync upserts first and removes stale rows afterward; a failed save no longer wipes existing presets.
- Task creation now exposes Workflow type and Preset controls, defaults the type from the subject, applies an explicitly selected saved preset, and keeps task-level step editing.
- The Configure presets action closes the task dialog and opens `Settings#study-workflows`.
- Settings now presents the workflow in order: workflow type, study goal, saved/system presets, preset details, then editable steps.
- Save and duplicate states use explicit, actionable messages.

## Evidence and verification

- Before screenshots: `01-settings-presets-before.jpg`, `02-task-modal-before.jpg`.
- Live database evidence: duplicate key on the old user/name constraint; zero saved preset rows remained after the failed replacement save.
- Supabase migration applied and catalog-verified as `UNIQUE (user_id, phase, subject_type, name)`.
- ESLint passed.
- Next.js 16 production build passed with webpack. Turbopack could not spawn its pooled worker in this Windows sandbox (`os error 5`), which is an environment limitation rather than a source failure.
- Post-fix authenticated browser capture requires the code to be deployed; production still serves the pre-fix bundle during this local turn.
