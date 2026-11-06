---
type: Decision
title: Deleting an account takes a typed DELETE and a fresh identity check
description: Account deletion asks the user to type DELETE and also re-confirms identity (password, or a Google redirect followed by a final tap) before anything is deleted.
generated: { by: claude-code/claude-opus-5-5, at: 2026-11-06T07:04:49Z }
verified: human:ankitp@geekyants.com
stated: 'Bug 2 – a reviewed decision (2026-11-04) chose no typed DELETE because the password or Google step already proves intent. How should typed DELETE fit in? (Both methods type DELETE before the Delete button turns on: password users type it next to their password, Google users before the redirect. The final tap after Google needs no retyping. This replaces the old decision.) — Add it to the identity step (Recommended)'
stated_via: chat
---

# Deleting an account takes a typed DELETE and a fresh identity check

## Context

[The earlier decision](account-deletion-confirms-identity.md) re-confirmed identity and left out a typed
confirmation, on the grounds that a fresh sign-in already proves intent. The developer reported the missing typed
DELETE as a bug on 2026-11-06: a destructive, permanent action ([deletion is permanent](deletion-is-permanent.md))
should make the user spell out what they're doing, whatever method they signed in with. Firebase still refuses to
delete a user who hasn't signed in recently, so the identity check stays.

## Decision

On `/profile`, Delete account opens a dialog saying the deletion can't be undone. The user types `DELETE`, and the
identity is re-confirmed, before anything is deleted:

- Email and password users type `DELETE` and their password in the dialog; Delete stays off until both are given.
- Google users type `DELETE` before the Google redirect. Back on `/profile`, the dialog reopens with the final Delete
  my account button, which needs no retyping. Nothing is deleted on page load alone.

The developer chose this on 2026-11-06, over making the typed word the only check (Firebase's recent-sign-in rule
would then refuse some deletions).

## Consequences

- Someone holding an unlocked phone still can't delete the account without the password or the Google account.
- One more step for every deletion, the same for both sign-in methods up to the identity check.
- Deletion still removes the user's data, then the Auth user
  ([every collection](../requirements/account-deletion-covers-every-collection.md)), straight after the
  re-confirmation, so Firebase's recent-sign-in check passes.

## Sources

- `src/components/DialogDeleteAccount.vue`
- `src/stores/account.ts`
