---
type: Requirement
title: Account deletion covers every collection a user owns
description: Deleting an account must remove the user's documents from every Firestore collection they own, including collections added later; the list lives in one constant that a unit test checks.
status: draft
generated: { by: claude-code/claude-opus-5-5, at: 2026-11-04T07:33:32Z }
---

# Account deletion covers every collection a user owns

## Requirement

[Account deletion](account-deletion-and-export.md) removes every document the user owns. That stays true as features
add collections: planned ones include `user-stats` (keyed by `uid`) and `shared-sets` (keyed by `ownerUid`,
and readable by anyone), both in `docs/specs/2026-11-02-usability-features.md`.

So account deletion reads the collections it wipes, and the owner field of each, from one constant,
`OWNED_COLLECTIONS` in `src/services/ownedCollections.ts`, kept free of Firebase imports so a unit test can read it. A feature that adds a user-owned collection adds it to that constant, and to the
owner's `delete` in `firestore.rules`. Stated by the developer on 2026-11-04.

## Acceptance

- A unit test fails when the constant doesn't list a collection the app writes with an owner field.
- A collection keyed by something other than `uid` names its owner field in the constant.

## History

- 2026-11-04: the constant was to sit in `src/services/firebase.ts`; now it has its own module, because the unit test can't import the Firebase SDK module cheaply.

## Sources

- [requirements/account-deletion-and-export](account-deletion-and-export.md)
- `docs/specs/2026-11-02-usability-features.md`
