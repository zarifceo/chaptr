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
| Google Calendar two-way sync | Ready for live verification | Add Google OAuth credentials and token encryption key, then authorize Calendar in Settings. |
| Vercel production URL | Ready to deploy | Link this local project to the connected Vercel project and supply the same environment values. |

