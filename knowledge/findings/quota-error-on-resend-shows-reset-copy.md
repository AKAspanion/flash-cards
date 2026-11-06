---
type: Finding
title: A quota failure on Resend email shows the password-reset message
description: authErrorMessage maps auth/quota-exceeded to the password-reset copy, so when Firebase's email quota is spent, pressing Resend email on the verify banner says password reset isn't available.
generated: { by: claude-code/claude-opus-5-5, at: 2026-11-06T05:40:00Z }
---

# A quota failure on Resend email shows the password-reset message

## Finding

`src/services/authErrors.ts` maps `auth/quota-exceeded` (and the two continue-URL codes) to
`auth.error.reset-unavailable`, written for the [password reset](../features/sign-in.md) screen. The verify
banner's Resend email goes through the same mapping ([email verification](../features/email-verification.md)), so
when the project's email quota is spent it tells the user "Password reset isn't available right now". The
continue-URL codes no longer reach it from a verification send, which retries without the link, but the quota code
still does.

## Evidence

- `.ga/runs/2026-11-06-verification-email-continue-and-language/reviews/final-r1-reviewer.md`, out of scope:
  `auth/quota-exceeded` maps to the password-reset message, so a quota failure on Resend verification shows it
  (`src/services/authErrors.ts:20`).
- Ledger: `Final review: minor (deferred): auth/quota-exceeded maps to the password-reset message`.

## Status

Open. One way: a neutral "Emails can't be sent right now" key for the quota code, or a message chosen by the
calling action.

## Sources

- `src/services/authErrors.ts`
- `src/stores/account.ts`
