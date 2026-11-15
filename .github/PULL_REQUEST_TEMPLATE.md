## Summary

<!-- Briefly describe what this pull request changes and why. -->

## Related Issue

<!-- Link any related issue, e.g., Closes #123 -->

## Verification & Guardrails Checklist

- [ ] `git diff --check` passes with no whitespace or merge marker issues
- [ ] `pnpm lint` passes with zero warnings/errors
- [ ] `pnpm typecheck` (`tsc --noEmit`) passes
- [ ] `pnpm test:personalization` passes
- [ ] `pnpm build` succeeds cleanly
- [ ] **Database & Auth**: Server routes resolve user identity from Supabase Auth (`getClaims()` / `getUser()`); no client-supplied `user_id` is trusted and no student state is stored in `localStorage`/`IndexedDB`
- [ ] **Responsive UI**: Verified on both desktop and mobile (`<= 780px` breakpoint) with bottom navigation preserved and no horizontal overflow
- [ ] **Documentation**: Updated [`chaptr-context.md`](../chaptr-context.md) if routes, schema, security, or product behavior changed
