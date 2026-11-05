---
type: Feature
title: Offline study
description: Firestore keeps a persistent IndexedDB cache, so sets open and saves work offline and sync later; a few actions stay online-only, and sign-out clears the cache within a bounded time.
status: draft
generated: { by: claude-code/claude-sonnet-5-5, at: 2026-11-05T18:00:00Z }
---

# Offline study

## What it does

Sets, labels and stats are read from, and written to, a persistent local cache, so a signed-in user can open, study and
edit sets with no connection; changes sync when the connection returns. The old gates that refused a save offline are
gone.

## Rules

- The cache is IndexedDB with a multi-tab manager, falling back to memory where IndexedDB is unavailable
  (`chooseLocalCache` in `src/services/localCache.ts`, used by `getServices` in `src/services/firebase.ts`).
- A write counts as done the moment it is in the device cache, or when the connection drops mid-save, for sets, labels,
  reviews and the daily goal (`settleWrite`; `PendingWrite`); the user sees `toast.offline-saved`, once per save. If the
  server later refuses it, the save error is shown and the data reloads. New sets and labels get their ids on the
  device (`doc(collection(…))` and `setDoc`, not `addDoc`), and `uid()` no longer needs `crypto.randomUUID`, which an
  http address lacks.
- Online-only, refusing offline with the standard message: delete forever, profile changes,
  [Delete account](account-deletion.md), [sharing](sharing.md) and restore from backup. Reading a set offline never
  needs the network. Sign-in and sign-up need it too but have no check of their own: offline, Firebase's network error
  shows ([sign in](sign-in.md)).
- Sign-out waits for unsynced writes, terminates Firestore, deletes the IndexedDB cache and signs out
  (`signOutAndClear`), so the next person on the device sees nothing of the last user. It runs through the busy bar,
  and past `SIGN_OUT_DEADLINE_MS` (15 s) with unsynced changes it clears nothing, the user stays signed in and is told
  to connect first (`toast.offline-signout`): on a connection that is up but broken the button otherwise spun forever
  and a shared device stayed signed in. Delete account clears the cache the same way once the account is gone
  ([decision](../decisions/account-deletion-online-only.md)).
- A terminated Firestore can't be used again, so these paths load `/login` as a new page (`loadFresh` in
  `src/utils/freshLoad.ts`), which passes a one-time snack through sessionStorage (`flashcards.pendingSnack`). A tab
  that sees the user signed out elsewhere does the same; a tab signing out or deleting the account itself loads it only
  once its cache is cleared.
- The old sign-out that left the cache behind is no longer exported.

## History

- 2026-11-05: listed sign-in and sign-up as refused offline with the standard message; now says they have no check of their own and show Firebase's network error, because `Login.vue` never had one.

## Sources

- `src/services/localCache.ts`
- `src/services/firebase.ts`
- `src/utils/freshLoad.ts`
- `src/stores/session.ts`
- `src/stores/account.ts`
- `src/stores/library.ts`
- `src/router/index.ts`
- `tests/unit/localCache.spec.ts`
- `tests/unit/signOutAndClear.spec.ts`
- `tests/unit/freshLoad.spec.ts`
- `tests/e2e/offline.spec.ts`
- `tests/e2e/offline-signout.spec.ts`
- `docs/plans/2026-11-02-offline-study.md`
