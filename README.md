<div align="center">

# Chaptr

**An open-source, evidence-driven adaptive study workspace for Bangladesh SSC 2027 students.**

[![License: MIT](https://img.shields.io/badge/License-MIT-167EFA.svg)](./LICENSE)
[![Next.js](https://img.shields.io/badge/Next.js-16.3-000000.svg)](https://nextjs.org)
[![React](https://img.shields.io/badge/React-19.2-149ECA.svg)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6.svg)](https://www.typescriptlang.org)
[![Supabase](https://img.shields.io/badge/Supabase-Postgres_%2B_RLS-3ECF8E.svg)](https://supabase.com)

[Live App](https://chaptr.space) · [Developer Context](./chaptr-context.md) · [Contributing](./CONTRIBUTING.md) · [Security Policy](./SECURITY.md)

</div>

---

## Overview

**Chaptr** turns a student's academic profile, chapter coverage, confidence, difficulty ratings, study preferences, mistakes, question practice, focus sessions, and exam timeline into a practical daily loop.

Unlike generic task managers, Chaptr is purpose-built around a single promise:

> **Tell the student what to do now, explain why it matters, let them study in their own way, and preserve evidence for the next decision.**

### The Core Daily Loop

1. **Do now** — Start the highest-value task that fits the student's current daily capacity, subject strengths, and readiness.
2. **If you have more time** — Pick up optional work, practice, due mistake revision, or the next workflow stage without rebuilding a schedule from scratch.
3. **Close the loop** — Record what was attempted, accuracy or written score, confidence before/after, resources used, mistakes made, reflection, and the next action.

---

## Key Features

- **Full NCTB SSC 2027 Curriculum Personalization**
  - Supports **Science**, **Commerce**, and **Humanities / Arts** groups, **Islam** and **Hinduism** religion tracks, and fourth-subject electives (**Higher Mathematics**, **Agriculture Studies**, **Home Science**).
  - Curated Bangla-version Class 9–10 NCTB textbook references and board mark distributions ([source catalog](./docs/nctb-textbook-sources.md)).
  - **No universal subject stereotypes**: Chaptr never assumes Mathematics is hardest for everyone. Each student selects their own personal most-difficult subject, and recommendations weigh real evidence, subject strengths, confidence, and accuracy.
- **Adaptive Daily Planner & Capacity Advisor**
  - Schedules candidate tasks within the student's configured weekday/weekend minute capacity and study windows.
  - Prioritizes unfinished pinned work, due mistake repair, and high-impact chapter goals while protecting due revisions.
- **Multi-Stage Study Workflows & Custom Presets**
  - Four structured phases: `learn`, `revise`, `practice`, and `exam`.
  - Distinct default workflows for mathematical subjects (Mathematics, Accounting, Higher Mathematics) and theory subjects, plus student-created reusable presets.
- **Persistent Cross-Route Focus Timer**
  - Backed by `study_sessions` in Supabase Postgres so timers continue seamlessly across route navigation and can be reconstructed across devices.
- **Exam Mode**
  - Timed, resumable `exam_sessions` for any SSC chapter with structured **MCQ**, **CQ**, and **SQ** attempted/correct tracking.
- **Syllabus, Goals, Calendar & Exam Plan**
  - Subject-scoped chapter tracking (completion, undo, confidence, difficulty, target month, inclusion/exclusion), goal queue generation, in-app scheduling calendar, and student-owned exam preparation phases.
- **Private Study Resources**
  - Attach external links or upload study files to specific chapters via a private, RLS-protected Supabase Storage bucket (`study-resources`) with temporary signed access URLs.
- **Privacy-First Account Lifecycle**
  - Database-backed state with strict Row Level Security (RLS), versioned & immutable policy consent logs, authenticated support requests with minimal allowlisted diagnostics, and a verified **14-day grace-period account deletion workflow** with automatic Storage + Auth cleanup.

---

## Tech Stack & Architecture

| Layer | Technology |
|---|---|
| **Framework** | Next.js 16.3 (App Router), React 19.2, Strict TypeScript |
| **Styling & UI** | Tailwind CSS v4, Radix UI / shadcn primitives, Phosphor Icons, Recharts, Sora typography |
| **Authentication** | Supabase Auth (`@supabase/ssr`) — Email/Password & Google OAuth PKCE |
| **Database** | Supabase Postgres with Row Level Security (RLS) & SQL RPCs (`supabase/migrations/`) |
| **File Storage** | Private Supabase Storage bucket (`study-resources`) with signed upload/download URLs |
| **Background Jobs** | Supabase Edge Function (`process-account-deletions`) + `pg_cron` + Supabase Vault |

### Workspace Routes

| Route | Section | Responsibility |
|---|---|---|
| `/home` | Home | Dashboard, Today daily loop, Do Now action, evidence, repair queue, Quick Start |
| `/syllabus` | Syllabus | Subject-scoped chapter browsing, confidence, difficulty, completion, evidence |
| `/goals` | Goals | Chapter goal queue, monthly targets, priorities, scheduling work |
| `/calendar` | Calendar | In-app scheduling source of truth for study tasks and exam events |
| `/journal` | Journal | Study evidence, reflections, attempts/correct counts, confidence delta, mistakes |
| `/progress` | Progress | Task, session, chapter, subject, journal, accuracy, and readiness analytics |
| `/exam-mode` | Exam Mode | Timed exam-session workflow and MCQ/CQ/SQ result tracking |
| `/resources` | Resources | External links and private uploaded files linked to subjects and chapters |
| `/countdown` | Countdown | SSC 2027 countdown and milestone context |
| `/exam-plan` | Exam Plan | Student-owned exam preparation phases and timeline |
| `/support` | Support | Local help search, support requests, and 14-day grace-period account deletion |
| `/settings` | Settings | Academic profile, study preferences, daily capacity, custom workflow presets |

For a deep dive into the architecture, data ownership rules, and operational guardrails, read [**`chaptr-context.md`**](./chaptr-context.md).

---

## Getting Started (Local Development & Self-Hosting)

### 1. Prerequisites

- **Node.js** 20+ (Node 22/24 LTS recommended)
- **pnpm** `11.x` (`corepack enable` will automatically use the version declared in `package.json`)
- A **Supabase** project (cloud or local via the [Supabase CLI](https://supabase.com/docs/guides/cli))

### 2. Clone and Install Dependencies

```bash
git clone https://github.com/zarifceo/chaptr.git
cd chaptr
pnpm install
```

### 3. Configure Environment Variables

Copy the committed template to `.env.local` and fill in your Supabase credentials:

```bash
cp .env.example .env.local
```

| Variable | Description | Exposure |
|---|---|---|
| `NEXT_PUBLIC_SITE_URL` | Canonical origin (e.g. `http://localhost:3000` locally or your custom domain in production) | Public |
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL | Public |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase publishable client key | Public |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Optional legacy fallback key if publishable key is not used | Public |
| `SUPABASE_SERVICE_ROLE_KEY` | Service-role key for server-side academic catalog seeding & account deletion | **Server-only secret** |
| `TOKEN_ENCRYPTION_KEY` | 32+ byte secret for server-side token encryption (`openssl rand -base64 32`) | **Server-only secret** |

### 4. Set Up the Supabase Database & Storage

Apply the ordered SQL migrations in [`supabase/migrations/`](./supabase/migrations) to your Supabase project:

```bash
# Using the Supabase CLI linked to your project:
supabase db push
```

This creates all reference and student-owned tables, Row Level Security policies, SQL RPCs (`accept_current_policy_versions`, `verify_account_deletion_cron_token`, etc.), and the private `study-resources` Storage bucket policies.

> **Note:** On the first authenticated request to `/api/sync/bootstrap`, Chaptr automatically seeds/updates the deterministic NCTB academic catalog (`subjects`, `chapters`, `marks_distributions`, `workflow_steps`, `exams`, `curated_textbooks`, `maths_formulas`) using `SUPABASE_SERVICE_ROLE_KEY`.

If you want scheduled 14-day account deletion processing in your self-hosted instance, deploy the Edge Function in [`supabase/functions/process-account-deletions`](./supabase/functions/process-account-deletions/index.ts):

```bash
supabase functions deploy process-account-deletions --no-verify-jwt
```

### 5. Run the Development Server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Verification & Quality Checks

Before opening a pull request, run the full verification suite:

```bash
pnpm lint                   # Run ESLint across the repository
pnpm typecheck              # Run strict TypeScript typechecking (tsc --noEmit)
pnpm test:personalization   # Run adaptive planner & personalization unit tests
pnpm build                  # Verify production Next.js build
git diff --check            # Ensure no whitespace or merge marker issues
```

---

## Repository Structure

```text
chaptr/
├── docs/
│   └── nctb-textbook-sources.md      # Official NCTB Class 9–10 textbook links & provenance
├── public/                           # Brand assets, icons, and illustrations
├── scripts/
│   └── run-personalization-tests.mjs # Test runner for adaptive planner & scoring tests
├── src/
│   ├── app/                          # Next.js App Router pages, layouts, and API route handlers
│   │   ├── (workspace)/[section]/    # Workspace section routes (/home, /syllabus, /goals, etc.)
│   │   ├── api/                      # Authenticated server endpoints (bootstrap, push, onboarding, etc.)
│   │   ├── auth/                     # Sign-in, callback, Google OAuth, password recovery
│   │   ├── consent/                  # Policy consent gate
│   │   ├── privacy/ & terms/         # Legal & privacy documentation pages
│   │   └── globals.css               # Design system and 780px mobile breakpoint styles
│   ├── components/                   # Client shell (CommandCenter), onboarding, study features, UI primitives
│   ├── lib/                          # Domain types, adaptive planner, recommendations, academic catalog, Supabase clients
│   └── proxy.ts                      # Session cookie refresh & policy consent enforcement
├── supabase/
│   ├── config.toml                   # Supabase CLI & Edge Function configuration
│   ├── functions/                    # Deno Edge Functions (process-account-deletions)
│   └── migrations/                   # Timestamped PostgreSQL schema & RLS migrations
├── tests/
│   └── personalization.test.ts       # Personalization, workflow, and planner test suite
└── chaptr-context.md                 # Comprehensive developer & AI operating manual
```

---

## Contributing

Contributions are welcome from students, educators, and developers! Whether you are fixing an NCTB chapter catalog detail, improving mobile responsiveness, or refining the adaptive study planner:

1. Read [**`CONTRIBUTING.md`**](./CONTRIBUTING.md) and [**`chaptr-context.md`**](./chaptr-context.md) first.
2. Follow our [**Code of Conduct**](./CODE_OF_CONDUCT.md).
3. For security vulnerabilities, please follow [**`SECURITY.md`**](./SECURITY.md) instead of opening a public issue.

---

## License

Chaptr is open-source software licensed under the [**MIT License**](./LICENSE).
