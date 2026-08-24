# SSC Command Center — Design QA

## Visual target

- Reference set: `original-742b3e408933880a745b3bd34383bd06.webp`, `original-49bbdf682074224f4ac33ef4989f28b4.webp`, and `original-239ba6d0f7cb928646f0f84b8d7d2025.webp`.
- Direction: near-black learning interface, rounded layered cards, restrained pastel accents, floating mobile navigation, and a blue-first palette.
- App mark: minimal blue `S` and diagonal progress stroke on near-black, exported at 192 px and 512 px.

## Passed

| Check | Result | Evidence |
|---|---|---|
| Mobile layout | Passed | Checked at 390 × 844; hero, countdowns, cards, text, and floating navigation remain readable without horizontal overflow. |
| Desktop layout | Passed | Checked at 1440 × 1000; persistent sidebar, dense dashboard grid, and study queue use the available width cleanly. |
| Reference comparison | Passed | Reference and mobile prototype were reviewed together; the app retains the source's dark, rounded, pastel-card language while intentionally shifting the accent system to blue/cyan. |
| Minimal logo | Passed | Blue mark is visible in the mobile header, desktop sidebar, manifest, and install icons. |
| Main study journey | Passed | Dashboard → Today → subject-specific workflow is functional. |
| Personal learning methods | Passed | NotebookLM theory flow and the separate Accounting, Bangla, English, and Mathematics flows are present. |
| Keyboard/accessibility basics | Passed | Skip link, labelled controls, focus-visible states, reduced-motion support, and live dialog status are included. |
| Production validation | Passed | ESLint and the optimized Next.js production build complete successfully. |

## Conditional cloud checks

| Check | Status | Requirement |
|---|---|---|
| Supabase persistence and RLS | Ready for live verification | Add the project environment values and run the included migration. |
| In-app study calendar | Ready for live verification | Verify task creation, date placement, month navigation, and opening scheduled tasks from the calendar. |
| Vercel production URL | Ready to deploy | Link this local project to the connected Vercel project and supply the same environment values. |

## Home hierarchy correction — 22 August 2026

- Source visual truth: `C:\Users\iftkr\OneDrive\Pictures\Screenshots\Screenshot 2026-08-22 134817.png`.
- Implementation evidence: `audit-evidence/13-home-layout-local.png`.
- Side-by-side comparison: `audit-evidence/14-home-layout-comparison.png`.
- Viewport: 1919 × 950 browser viewport; screenshots were normalized to equal widths for comparison.
- State: representative Finance recommendation, 45 planned minutes, 1 completed minute, Full-Syllabus Test, and SSC 2027 countdowns.
- Full-view result: Best Next Move leads the page and spans the dashboard width; the three summaries sit directly below it without the previous empty right column.
- Focused-region result: Today's Target reports `aria-valuenow="2"` and its rendered fill is `width: 2%`; no browser console errors were present.
- Iteration history: first implementation pass passed the focused visual and behavior check; no refinement pass was required.
- Final result: passed.

## Daily-capacity card responsiveness — 24 August 2026

- Source visual truth: `C:\Users\iftkr\AppData\Local\Temp\codex-clipboard-ae3aa7c2-302e-4ffd-bf91-d805dd4f93be.png`.
- Browser verification: isolated production markup rendered with the app's real CSS at 1536 × 797 and 390 × 844.
- Desktop result: the 850 px card resolves to two balanced 394 px tracks; the copy remains readable and the controls no longer force the text into a narrow column.
- Mobile result: copy, presets, custom-minutes input, action, and status messages resolve to one readable column with no horizontal overflow.
- Reference comparison: the reported desktop screenshot and repaired desktop render were reviewed together; the visible hierarchy and spacing defect is removed without changing the card's visual language.
- Functional structure: preset buttons remain a labelled group, the selected state remains exposed through `aria-pressed`, and status messages retain their live-region roles.
- Severity review: no P0, P1, or P2 responsive defects remain in this card at the verified viewports.
- Final result: passed.

## Onboarding subject priority — 24 August 2026

- Source visual truth: `C:\Users\iftkr\AppData\Local\Temp\codex-clipboard-0f3cb211-8088-4eba-82b3-cc9367a87229.png` and the existing Syllabus priority control.
- Browser verification: the production onboarding markup and real app CSS were checked at 1440 × 900 and 390 × 844.
- Desktop result: every subject row presents a labelled Strength control beside a labelled Priority control; the five-level scale matches Syllabus and the page has no horizontal overflow.
- Mobile result: subject, Strength, and Priority stack into one readable column; every select remains 270 px wide within the 390 px viewport and the document has no horizontal overflow.
- State coverage: saved priority values 2 and 4 render correctly, and changing priorities through the native select updates the selected value at both desktop and mobile sizes.
- Persistence check: onboarding already writes the full selected assessment rows through the authenticated onboarding endpoint, and the live `subject_assessments.priority` column accepts values 1–5.
- Planner check: recommendations and the adaptive daily planner already consume the saved subject priority alongside difficulty, progress, and other evidence.
- Severity review: no P0, P1, or P2 usability defect remains in this onboarding step at the verified viewports.
- Final result: passed.

## Progress confidence card clarity — 24 August 2026

- Source visual truth: `C:\Users\iftkr\AppData\Local\Temp\codex-clipboard-31cb715b-6bd7-41c3-96cd-09f8d1aec991.png`.
- Implementation evidence: `audit-evidence/15-progress-confidence-desktop.jpg` and `audit-evidence/16-progress-confidence-mobile.jpg`.
- Side-by-side comparison: `audit-evidence/17-progress-confidence-comparison.png`.
- Browser verification: representative production markup rendered with the app's real CSS at desktop and 390 × 844 mobile viewports.
- Meaning correction: the card now states that each bar is the average 1–5 confidence rating across chapters that have study evidence; it explicitly says this is not a predicted exam mark and uses a dash when there is no evidence.
- Evidence context: every subject row also reports the number of evidenced chapters against the subject's chapter total, preventing a high score based on a small sample from appearing like complete readiness.
- Hierarchy correction: the section header is exempted from the row grid, so `Confidence by subject` receives the full card width and stays on one line at both verified viewports.
- Responsive result: desktop rows retain a compact label/bar/value layout; mobile rows wrap the bar beneath the label and value without horizontal overflow.
- Accessibility result: all 12 bars expose progressbar roles, numeric values, and human-readable confidence text.
- Console result: no browser warnings or errors were present at either verified viewport.
- Final result: passed.

## Adaptive planner CTA repair — 25 August 2026

- Source visual truth: `C:\Users\iftkr\OneDrive\Pictures\Screenshots\Screenshot 2026-08-24 223817.png` (1535 × 783 px).
- State: Home → Your daily loop → Today's capacity, 120 custom minutes, idle planner action.
- Finding: the deployed button renders `Build today&apos;s plan` because the entity is inside a JavaScript string, where React treats it as literal text. The visible label is therefore noisy and consumes unnecessary horizontal space.
- Fix implemented: replace the entity-bearing string with `Build today’s plan`, add an explicit button type and busy-state semantics, and give the CTA a dedicated 198 px non-wrapping layout with a non-shrinking Phosphor icon.
- Static verification: TypeScript, targeted ESLint, and the optimized Next.js production build pass.
- Browser evidence: the current production render confirms the original 199 px button and literal entity defect with no console warnings. A post-fix browser screenshot is unavailable because this local workspace has no Supabase environment configuration and the local app stops at its database gate; the production deployment does not yet contain the local patch.
- Required fidelity surfaces: typography, spacing, tokens, icon source, and copy were checked in source. The post-fix rendered comparison remains unavailable, so Product Design visual QA cannot pass yet.
- Final result: blocked.

## Workflow preset creation and task use — 25 August 2026

- Source visual truth: `C:\Users\iftkr\AppData\Local\Temp\codex-clipboard-0ef4da14-4f15-4a24-9611-4a81f2d8c51f.png` and `C:\Users\iftkr\AppData\Local\Temp\codex-clipboard-29f4ff9e-1cbd-49d1-9fb8-fb90a17015a7.png`.
- Before evidence: `audit-evidence/workflow-audit/01-settings-presets-before.jpg` and `audit-evidence/workflow-audit/02-task-modal-before.jpg`.
- Functional finding: production Postgres logs confirmed that preset creation failed on the account-wide `study_workflow_presets_user_id_name_key` constraint; the replacement API also deleted existing rows before attempting the failing insert.
- Persistence correction: the live constraint is now scoped to user + study goal + workflow type, and the API upserts before deleting stale records.
- Task-creation correction: Workflow type and Preset are now first-class controls. The type defaults to Mathematical for Mathematics, Higher Mathematics, and Accounting and to Theoretical for other subjects; users can override it per task and apply any matching saved preset.
- Navigation correction: Configure presets opens the precise Settings workflow section.
- Settings hierarchy: workflow type → study goal → saved/system presets → name/description → editable steps → save/delete.
- Static verification: ESLint and the optimized Next.js production build pass. The Supabase constraint was applied and verified through the live catalog.
- Visual verification: source layout and responsive rules were reviewed at desktop/mobile breakpoints. A post-fix authenticated screenshot remains blocked until the code is deployed because this workspace has no local Supabase environment values.
- Final result: functional pass; post-deploy visual comparison pending.

