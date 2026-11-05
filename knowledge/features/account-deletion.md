---
type: Feature
title: Delete account
description: Delete account on the profile screen re-confirms the user's identity, then removes every document they own and their Firebase Auth user.
generated: { by: claude-code/claude-sonnet-5-5, at: 2026-11-04T12:00:00Z }
verified: human:panditankit1995@gmail.com
---

# Delete account

## What it does

`/profile` ends its card with a Delete account row (icon `mdi-account-remove-outline`, error colour). It opens `DialogDeleteAccount.vue`, which says deletion can't be undone, and
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
- The dialog is persistent and Cancel is disabled only while the deletion itself runs; the Google step has its own spinner. A `pageshow` listener resets both when the browser restores the page from the back-forward cache, because the Google redirect can be cancelled and leave the dialog stuck.
- Delete account is online-only and, once the account is gone, clears the device cache and loads `/login` as a new
  page ([decision](../decisions/account-deletion-online-only.md), [offline study](offline-study.md)). The public
  copies in `shared-sets` are removed first and the sets last, so a deletion that fails part-way leaves nothing public
  behind ([sharing](sharing.md)); `user-stats` goes with them.
- Nothing is kept: [deleted data is gone at once](../decisions/deletion-is-permanent.md). People who can't sign in use
  the [delete-account page](privacy-and-deletion-pages.md).

## History

- 2026-11-05: deletion removed sets and labels in any order and left the device cache; now it is online-only, removes shared copies first and sets last, and clears the cache, because of the offline-study and sharing plans.
- 2026-11-04: the dialog stayed locked after a cancelled Google redirect; now only a running deletion locks it, because users were stuck.

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
