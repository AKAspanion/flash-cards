---
type: Decision
title: Delete account is online-only and clears the device cache
description: Once Firestore keeps a persistent offline cache, Delete account refuses to run offline and, after the account is gone, clears the local cache the way sign-out does.
status: draft
generated: { by: claude-code/claude-opus-5-5, at: 2026-11-05T04:02:45Z }
---

# Delete account is online-only and clears the device cache

## Context

The offline-study plan (`docs/plans/2026-11-02-offline-study.md`) turns on Firestore's persistent IndexedDB cache and
makes sign-out clear it, so the next person on a device doesn't see the last user's sets (spec 10.6). The spec as
approved on 2026-11-03 didn't say what Delete account does offline, or whether it clears the cache.

## Decision

Delete account stays online-only: offline, its dialog shows the standard offline message (spec rule 2.10) and deletes
nothing, because the owner-field queries it runs would read only the cache. Once the account is deleted, the app
clears the local cache as sign-out does (terminate Firestore, clear its IndexedDB persistence, then a full page
load). Chosen by the developer on 2026-11-05 (spec 10.5, 10.6).

## Consequences

- Built: `DialogDeleteAccount.vue` refuses offline, and `deleteAccount` in `src/services/firebase.ts` removes the shared
  copies first and the sets last. The cache is cleared and `/login` loaded as a new page once the account is gone, with
  the "Your account has been deleted." snack handed over through sessionStorage (`src/utils/freshLoad.ts`). See
  [offline study](../features/offline-study.md).

## History

- 2026-11-05: planned; now built, and the new page carries the deletion snack through `freshLoad`.

## Sources

- `docs/specs/2026-11-02-usability-features.md`
- `docs/plans/2026-11-02-offline-study.md`
- `src/components/DialogDeleteAccount.vue`
- `src/stores/account.ts`
- `src/utils/freshLoad.ts`
- `src/services/firebase.ts`
