---
type: Data Model
title: shared-sets collection
description: The public copy of a set that its owner shares, opened by anyone at /s/:shareId; exactly five fields, so no progress, labels or profile data leave the account.
status: draft
generated: { by: claude-code/claude-sonnet-5-5, at: 2026-11-05T18:00:00Z }
---

# shared-sets collection

## Fields

Written by `toSharedDoc` in `src/services/cardSetMapper.ts`; the document id is the `shareId`, and the owner's set keeps
it in the optional `shareId` field ([flash-card-sets](flash-card-sets.md)).

- `ownerUid` (not `uid`), `title` (at most 200 characters), `color`, `cards` (a JSON string, at most 900,000
  characters) and `updatedAt` (the server time). The cards are rebuilt to `id`, `front`, `back` only.

## Rules

- `firestore.rules` (`validShare`): only those five keys, each checked. `get` is allowed to anyone, signed in or not,
  which is the one exception to owner-only access ([roles](../security/roles.md)); the link is unguessable (a random
  document id), and nobody can `list` except the owner's own filtered query
  ([why](../decisions/owned-collections-owner-list.md)). `create`, `update` and `delete` are owner-only; an update may
  not change `ownerUid`.
- A copy that is already gone: `update` and `delete` of a missing document are allowed for a signed-in caller, so a
  batch that deletes a set or stops sharing still goes through, and an update reaches the app as not-found, which
  clears the set's `shareId`. A write that does not check `exists` on a missing document is a create, so these cannot
  make a copy.
- The collection is in `OWNED_COLLECTIONS`, so [Delete account](../features/account-deletion.md) removes the copies
  too, before the sets.
- Rules for this collection take effect only after a rules deploy: see
  [manual deploys](../decisions/manual-rules-and-functions-deploy.md).

## Sources

- `src/services/cardSetMapper.ts`
- `src/services/firebase.ts`
- `src/services/ownedCollections.ts`
- `src/types.ts`
- `firestore.rules`
- `tests/unit/sharedSets.spec.ts`
- `tests/unit/firestore.rules.spec.ts`
