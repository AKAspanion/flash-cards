---
type: Finding
title: "Fixed: unmapped Firebase auth errors showed the raw SDK message"
description: authErrorMessage fell back to the error's own English message for codes it didn't map, so some failures reached the snack untranslated; fixed by falling back to auth.error.generic.
generated: { by: agent:after-finish/claude-sonnet-5-5, at: 2026-11-05T12:00:00Z }
---

# Fixed: unmapped Firebase auth errors showed the raw SDK message

## Finding

`authErrorMessage` returns `(err as Error)?.message` when the code isn't in `AUTH_ERROR_KEYS`
([sign in](../features/sign-in.md)). A user then sees Firebase's English text, or "You are signed out. Please log in
again." from `requireUser()`, whatever language they chose. Resend and I've verified
([email verification](../features/email-verification.md)) add two paths into it, for example an unmapped
`auth/quota-exceeded`.

## Evidence

- `.ga/runs/2026-11-05-email-verification/reviews/final-security-reviewer.md`, Minor 3, and
  `final-reviewer.md` ("predates this branch").
- Ledger: `Final review: minor (deferred): authErrorMessage falls back to raw Firebase message for unmapped codes (pre-existing)`.

## Status

Fixed in d9623fc: `authErrorMessage` returns `auth.error.generic` for a code it doesn't map, looks codes up with `Object.hasOwn`, and logs only the code. Signed-out errors from `requireUser()` now also show the caller's key rather than their own text.

## Sources

- `src/services/authErrors.ts`
- `src/stores/account.ts`
