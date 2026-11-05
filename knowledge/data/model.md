---
type: Data Model
title: Data model
description: Four Firestore collections (flash-card-sets, labels, user-stats, shared-sets), each document owned by one user; cards are embedded in their set as a JSON string.
generated: { by: claude-code/claude-opus-5-5, at: 2026-11-02T19:12:23Z }
verified: human:panditankit1995@gmail.com
---

# Data model

## Entities

- [flash-card-sets](flash-card-sets.md): one document per set, with its cards embedded.
- [labels](labels.md): one document per label a user has created.
- [user-stats](user-stats.md): one document per user, with the daily goal and the reviews counted per day.
- [shared-sets](shared-sets.md): the public copy of a set its owner shares.

The app-side types are `CardSet`, `FlashCard` and `Label` in `src/types.ts`; `src/services/cardSetMapper.ts`
converts between them and the stored documents. The stored shape is still the one the original app wrote, which is no longer required:
see [original app compatibility](../decisions/original-app-compatibility.md).

## Relations

- Every document carries the owner's `uid` (`ownerUid` in `shared-sets`); the app queries sets and labels with
  `where('uid', '==', …)`, and `firestore.rules` only allows the owner to read or write, except that anyone may `get` a
  shared copy by its id ([roles](../security/roles.md)).
- A set refers to labels by their Firestore document id, in `CardSet.labels`. Labels are never deleted
  ([labels cannot be deleted](../decisions/labels-cannot-be-deleted.md)), so a set can't hold the id of a missing
  label.
- Cards have no collection of their own: they live in their set's `cards` field.

- `OWNED_COLLECTIONS` in `src/services/ownedCollections.ts` lists the collections a user owns and each owner field;
  [account deletion](../features/account-deletion.md) wipes exactly those, and
  [a requirement](../requirements/account-deletion-covers-every-collection.md) keeps the list complete.

## History

- 2026-11-05: two collections; now four, adding `user-stats` and `shared-sets`, and a set may carry `shareId` and `speech`, because of the progress-habits, sharing and rich-cards plans. New sets and labels get their ids on the device (offline study); the schema is unchanged.
- 2026-11-05: `FlashCard` gained an optional `srs`. See [flash-card-sets](flash-card-sets.md).
- 2026-11-05: `CardSet` gained an optional `studiedAt`. See [flash-card-sets](flash-card-sets.md).
- 2026-11-04: account deletion made the owned-collection list explicit; the model itself is unchanged.
- 2026-11-03: whether a label could be deleted, leaving its id on sets, was open; now labels cannot be deleted. See [Labels cannot be deleted](../decisions/labels-cannot-be-deleted.md).

## Sources

- `src/types.ts`
- `src/services/cardSetMapper.ts`
- `src/services/firebase.ts`
- `firestore.rules`
- `src/services/ownedCollections.ts`
- `src/services/statsMapper.ts`
