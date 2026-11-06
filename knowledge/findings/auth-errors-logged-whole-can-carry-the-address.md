---
type: Finding
title: Account-store auth errors are logged whole and can carry the user's address
description: showAuthError in the account store logs the whole Firebase error, whose customData can hold the user's email address, while the newer sign-up and token-refresh paths log only the error code.
generated: { by: claude-code/claude-opus-5-5, at: 2026-11-05T13:20:00Z }
---

# Account-store auth errors are logged whole and can carry the user's address

## Finding

`showAuthError` in `src/stores/account.ts` calls `console.error(err)` with the whole error. A Firebase Auth error's
`customData` can include the user's email address, so it reaches the browser console (and any tool that collects
console output). The verification code added on this branch logs only the error code
([auth](../security/auth.md)), so the store is inconsistent. The re-authentication, resend and check actions all go
through `showAuthError`.

## Evidence

- `.ga/runs/2026-11-05-email-verification/reviews/final-r1-reviewer.md`, out of scope: "`showAuthError` logs the
  whole error object, which can carry the address in `customData`" (`src/stores/account.ts:19-21`).
- `.ga/runs/2026-11-05-email-verification/reviews/final-security-reviewer.md`, Minor 3, notes the same inconsistency.
- Ledger: `Final review: minor (deferred): showAuthError logs the whole error object, which can carry the address in
  customData (pre-existing)`.

## Status

Open. `authErrorMessage` (`src/services/authErrors.ts`) now logs only `code ?? name`, so that path is fixed, but `showAuthError` in `src/stores/account.ts` still logs the whole error, and so does `session.showError` (`src/stores/session.ts`; no caller passes personal data today). An unmapped account error is also logged twice, once by each. Log the code only in both.

## Sources

- `src/stores/account.ts`
- `src/services/firebase.ts`
- `src/services/authErrors.ts`
- `src/stores/session.ts`
