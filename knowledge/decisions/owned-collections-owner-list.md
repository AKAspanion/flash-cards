---
type: Decision
title: Owners may list their own documents in every owned collection
description: user-stats and shared-sets join OWNED_COLLECTIONS, and their rules allow a list only when the query is limited to the owner field equal to the caller's uid, because Delete account finds each collection's documents with that query.
status: draft
generated: { by: claude-code/claude-opus-5-5, at: 2026-11-05T04:02:45Z }
---

# Owners may list their own documents in every owned collection

## Context

The usability spec (`docs/specs/2026-11-02-usability-features.md`, 8.6 and 11.8 as approved on 2026-11-03) said
nobody may `list` `user-stats` or `shared-sets`. But Delete account finds a user's documents by querying each entry
of `OWNED_COLLECTIONS` with `where(ownerField, '==', uid)` (`deleteAccount` in `src/services/firebase.ts`), which is a
`list`. With those rules, deleting an account that had stats or a shared set would fail with permission-denied,
breaking [requirements/account-deletion-covers-every-collection](../requirements/account-deletion-covers-every-collection.md).

## Decision

Every user-owned collection a feature adds goes into `OWNED_COLLECTIONS` in `src/services/ownedCollections.ts` with
its owner field (`user-stats` by `uid`, `shared-sets` by `ownerUid`). Its rules let the owner `delete` their
documents and `list` them only with a query limited to the owner field equal to their uid; any other `list`
(unfiltered, or another person's uid) is refused. `shared-sets` stays readable by anyone through `get`. Chosen by the
developer on 2026-11-05, when the spec was reverified (spec 3.3).

## Consequences

- Strangers still can't enumerate shared sets; a shared link stays unguessable (a random document id).
- Each plan that adds a collection (progress habits, sharing) carries a rules test for the owner's filtered list and
  keeps `tests/unit/ownedCollections.spec.ts` passing.

## Sources

- `docs/specs/2026-11-02-usability-features.md`
- `docs/plans/2026-11-02-progress-habits.md`
- `docs/plans/2026-11-02-sharing.md`
- `src/services/ownedCollections.ts`
- `src/services/firebase.ts`
- `firestore.rules`
