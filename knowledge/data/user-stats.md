---
type: Data Model
title: user-stats collection
description: One document per user, with its id equal to the uid, holding the daily goal and a map of local date to cards reviewed that day.
status: draft
generated: { by: claude-code/claude-sonnet-5-5, at: 2026-11-05T18:00:00Z }
---

# user-stats collection

## Fields

Mapped by `src/services/statsMapper.ts`; the types are in `src/types.ts`:

- `uid`: the owner.
- `days`: optional map of `YYYY-MM-DD` (the device's local date) to a count.
- `goal`: optional; one of `DAILY_GOALS`. A document with only `days` reads as the default goal.

## Rules

- `firestore.rules` (`validStats`): only those three keys; `days` a map; `goal` in the four values. `get` and
  `delete` only for the user whose uid is the document id; `create` and `update` need the same plus `uid` equal to the
  caller's; `list` only for the owner's own query ([why](../decisions/owned-collections-owner-list.md)).
- The collection is in `OWNED_COLLECTIONS`, so [Delete account](../features/account-deletion.md) removes it.
- Rules for this collection take effect only after a rules deploy: see
  [manual deploys](../decisions/manual-rules-and-functions-deploy.md).

## Sources

- `src/services/statsMapper.ts`
- `src/types.ts`
- `src/services/firebase.ts`
- `src/services/ownedCollections.ts`
- `firestore.rules`
- `tests/unit/statsMapper.spec.ts`
- `tests/unit/firestore.rules.spec.ts`
