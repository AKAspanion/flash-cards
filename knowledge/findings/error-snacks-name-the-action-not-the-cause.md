---
type: Finding
title: Some error snacks name the action, not the cause
description: Since error snacks show only the caller's key, a refused re-authentication in Delete account, a failed sign-out while still signed in and a signed-out error each show a general message instead of a specific one.
generated: { by: agent:after-finish/claude-sonnet-5-5, at: 2026-11-06T14:00:00Z }
---

# Some error snacks name the action, not the cause

## Finding

An error snack shows the key its caller passes ([conventions](../project/conventions.md)), so three cases read less
precisely than they could:

- `deleteAccount` shows `account.delete.error` for `auth/requires-recent-login`, not a message asking the user to
  sign in again.
- A sign-out that fails while the user is still signed in shows `toast.error.generic`.
- Errors the app throws when signed out (`requireUser()` in `src/services/firebase.ts`) show the caller's key, not a
  signed-out message; the auth watcher sends the user to `/login` at once, so the snack is seen only briefly.

The `FirebaseConfigError` setup steps now show only in the console, which suits a developer-only problem.

## Evidence

- Ledger of `docs/plans/2026-11-06-friendly-error-messages.md`: four `Final review: minor (deferred)` lines.

## Status

Open. Pass a specific key for each case if users meet them.

## Sources

- `src/stores/account.ts`
- `src/stores/session.ts`
- `src/services/firebase.ts`
- `docs/plans/2026-11-06-friendly-error-messages.md`
