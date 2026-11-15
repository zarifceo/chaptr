# Security Policy

Chaptr handles student study workspaces, authentication sessions, and private uploaded study resources. We take the security and privacy of student accounts seriously.

## Supported Versions

Security updates are applied to the latest `main` branch.

| Version / Branch | Supported |
|---|---|
| `main` | :white_check_mark: |

## Reporting a Vulnerability

**Please do not report security vulnerabilities through public GitHub issues, discussions, or pull requests.**

Instead, please report vulnerabilities privately through [**GitHub Security Advisories**](https://github.com/zarifceo/chaptr/security/advisories/new) on the `zarifceo/chaptr` repository.

When reporting a vulnerability, please include:

1. A clear description of the issue and the affected route, API endpoint, database table/RLS policy, or Storage bucket policy.
2. Steps to reproduce the issue (using a non-production or test account only—never probe or access another student's real account data).
3. The potential impact of the vulnerability.
4. Any suggested remediation or patch if you have one.

We will acknowledge receipt of your report as quickly as possible and work with you to validate and remediate the issue before any public disclosure.

## Security Architecture & Guardrails

Contributors and self-hosters should be aware of Chaptr's mandatory security invariants:

- **Server-Resolved Identity**: Every API route under `src/app/api` resolves the user identity on the server from Supabase Auth cookies (`getClaims()` / `getUser()`). Client-provided `user_id` fields are never trusted as authority.
- **Row Level Security (RLS)**: All student-owned tables in Supabase Postgres enforce RLS scoped to `auth.uid()`.
- **Private Resource Storage**: The `study-resources` Supabase Storage bucket is strictly private. Uploads are scoped to `{user_id}/{uuid}-{safeName}` with quota/size checks, and files are accessed only via short-lived signed URLs.
- **Secret Isolation**: `SUPABASE_SERVICE_ROLE_KEY`, `TOKEN_ENCRYPTION_KEY`, and account-deletion cron tokens must remain exclusively in server/Edge Function secret stores and must never be exposed in client bundles or logs.
- **Safe Redirects**: Auth and consent flows validate `next` parameters through `safeNextPath()` to prevent open redirects.
- **Account Deletion Reauthentication**: Account deletion requires provider-aware reauthentication (password verification or Google OAuth re-verification) followed by a 14-day grace period during which signing in automatically cancels the pending deletion.
