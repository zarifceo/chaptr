# Contributing to Chaptr

Thank you for your interest in contributing to **Chaptr**! Chaptr is an open-source, evidence-driven study workspace built for Bangladesh SSC 2027 students.

Before writing code or modifying database schemas, please read [**`chaptr-context.md`**](./chaptr-context.md) for the complete architectural manual.

---

## Non-Negotiable Product & Engineering Principles

Every contribution must preserve these core invariants:

1. **No Universal Subject Bias**
   - Never assume that every student finds Mathematics difficult or that the app is only for one group or religion.
   - Chaptr supports **Science**, **Commerce**, and **Humanities / Arts**, **Islam** and **Hinduism**, and all supported fourth subjects.
   - Recommendations must use each student's personal `most_difficult_subject_id`, subject strengths, assessments, and observed study evidence.
2. **Database-Backed State Only (No Local Student State)**
   - Do **not** introduce `localStorage`, `IndexedDB`, offline caches, or browser-only queues for tasks, progress, journals, resources, settings, timers, onboarding, or plans.
   - All student-owned data must persist through authenticated server routes and Supabase Postgres.
3. **Server-Side Identity & Row Level Security (RLS)**
   - Resolve the authenticated user on the server (`getClaims()` / `getUser()`) in every API route handler. Never trust a client-supplied `user_id`.
   - Every user-owned table requires strict Supabase RLS policies.
   - Never expose `SUPABASE_SERVICE_ROLE_KEY`, `TOKEN_ENCRYPTION_KEY`, cron tokens, or private Storage paths to client code or logs.
4. **Preserve Chapter Ordering**
   - Always order chapters numerically by chapter number first, then by Bangla title where chapter numbers are absent or tied, using the shared ordering helpers.
5. **Respect the Visual System & 780px Mobile Breakpoint**
   - Chaptr is a clean, calm, light-mode workspace using `#167EFA` brand blue, the black illustrative Chaptr logo, and **Sora** typography.
   - At mobile widths (`<= 780px`), the desktop sidebar is hidden and navigation happens through the bottom navigation bar (**Home**, **Syllabus**, **Goals**, **Calendar**) plus the **More** drawer. Never replace mobile bottom navigation with a desktop hamburger menu, and always verify that controls do not overflow horizontally on narrow screens.

---

## Local Development Workflow

1. **Fork and clone** the repository:
   ```bash
   git clone https://github.com/<your-username>/chaptr.git
   cd chaptr
   pnpm install
   ```
2. **Configure environment variables**:
   ```bash
   cp .env.example .env.local
   ```
   Populate `.env.local` with your development Supabase project credentials.
3. **Create a topic branch**:
   ```bash
   git checkout -b feat/your-feature-name
   ```
4. **Run the development server**:
   ```bash
   pnpm dev
   ```

---

## Database Migrations

- Place any schema or RLS change in a **new timestamped SQL file** under `supabase/migrations/` (e.g., `supabase/migrations/YYYYMMDDHHMMSS_description.sql`).
- **Never edit an already-committed migration** to fix a later change.
- Keep migrations idempotent where appropriate (`if not exists`, `drop policy if exists`), explicit about RLS policies and grants, and update [`src/lib/supabase/database.types.ts`](./src/lib/supabase/database.types.ts) to match.

---

## Pre-PR Verification Checklist

Before submitting a Pull Request, run all checks locally and ensure they pass cleanly:

```bash
git diff --check
pnpm lint
pnpm typecheck
pnpm test:personalization
pnpm build
```

If your change affects routes, data flow, security, deployment, or product behavior, update [**`chaptr-context.md`**](./chaptr-context.md) in the same Pull Request.

---

## License

By contributing to Chaptr, you agree that your contributions will be licensed under the [**MIT License**](./LICENSE).
