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

