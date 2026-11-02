---
type: Data Model
title: flash-card-sets collection
description: Fields of a stored flashcard set, the defaults the mapper applies when reading, and the shape the security rules require.
status: draft
generated: { by: claude-code/claude-opus-5-5, at: 2026-11-02T19:12:23Z }
---

# flash-card-sets collection

## Fields

Written by `cardSetToDoc` in `src/services/cardSetMapper.ts`:

- `id`: the app-level id used in URLs (`/:id/edit`, `/:id/view`), made by `uid()` in `src/utils/cardSets.ts`. It is
  not the Firestore document id, which the app keeps as `CardSet.docId`.
- `uid`: the owner's Firebase Auth uid, set from the signed-in user on every write.
- `title`, `color` (a `#RRGGBB` string), `trashed`, `fav`.
- `date`: a Firestore `Timestamp`, set when the set is first created in the editor.
- `labels`: an array of label document ids.
- `cards`: a JSON string of `FlashCard` objects (`id`, `front`, `back`, `learned`, `date`).

## Rules

- Reading is forgiving: `cardSetFromDoc` falls back to defaults for missing or malformed fields (`id` falls back to
  the document id, `color` to `#E91E63`, an unparsable `cards` to an empty list, an unreadable `date` to the epoch).
  Tested in `tests/unit/cardSetMapper.spec.ts`.
- `firestore.rules` (`validSet`) requires `cards` to be a string and `labels` a list on every create and update,
  and an update may not change `id`.
- `cards` stays a JSON string because older app versions parse it (comment in `firestore.rules`); see
  [original app compatibility](../decisions/original-app-compatibility.md).
- Every save rewrites the whole document, all cards included.

## Sources

- `src/services/cardSetMapper.ts`
- `src/services/firebase.ts`
- `src/types.ts`
- `src/utils/cardSets.ts`
- `firestore.rules`
- `tests/unit/cardSetMapper.spec.ts`
