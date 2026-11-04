---
type: Feature
title: Delete account
description: Delete account on the profile screen re-confirms the user's identity, then removes every document they own and their Firebase Auth user.
status: draft
generated: { by: claude-code/claude-sonnet-5-5, at: 2026-11-04T12:00:00Z }
---

# Delete account

## What it does

`/profile` has a Delete account action. It opens `DialogDeleteAccount.vue`, which says deletion can't be undone, and
then always re-confirms who the user is ([why](../decisions/account-deletion-confirms-identity.md)). Only then does
`src/stores/account.ts` delete the user's data and, last, their Auth user. Google Play requires this action from apps
with accounts ([requirement](../requirements/account-deletion-and-export.md)).

## Rules

- Password users enter their password in the dialog. Google users go through a Google redirect and come back to a
  final tap, which must happen within 5 minutes (`PENDING_DELETE_MAX_AGE_MS` in `src/utils/pendingDelete.ts`); the
  pending state lives in sessionStorage under `flashcards.pendingDelete`, and `session.redirectOutcomeLoaded` says the
  start-up redirect result has been read.
- Data goes first: every collection in `OWNED_COLLECTIONS` (`src/services/ownedCollections.ts`) has the user's
  documents removed in batches of 500, then the Auth user, so a failure part-way never leaves data without an owner.
  [A requirement](../requirements/account-deletion-covers-every-collection.md) keeps the list complete.
- Nothing is kept: [deleted data is gone at once](../decisions/deletion-is-permanent.md). People who can't sign in use
  the [delete-account page](privacy-and-deletion-pages.md).

## Sources

- `src/components/DialogDeleteAccount.vue`
- `src/stores/account.ts`
- `src/utils/pendingDelete.ts`
- `src/services/ownedCollections.ts`
- `src/services/firebase.ts`
- `src/views/Profile.vue`
- `tests/e2e/account-deletion.spec.ts`
- `tests/unit/pendingDelete.spec.ts`
- `tests/unit/ownedCollections.spec.ts`
