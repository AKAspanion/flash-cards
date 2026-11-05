---
type: Data Model
title: flash-card-sets collection
description: Fields of a stored flashcard set, the defaults the mapper applies when reading, and the shape the security rules require.
generated: { by: claude-code/claude-opus-5-5, at: 2026-11-02T19:12:23Z }
verified: human:panditankit1995@gmail.com
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
- `cards`: a JSON string of `FlashCard` objects (`id`, `front`, `back`, `learned`, `date`, and an optional `srs` object, `due`, `interval`, `ease`, `reps`, `lapses`, once the card has been rated; see [spaced repetition](../features/spaced-repetition.md)).
- `studiedAt`: optional Firestore `Timestamp`, when a review of the set last saved. The key is written only when
  set, since Firestore rejects `undefined`.

- `speech`: optional `{ front?, back? }` of BCP 47 language tags for read aloud ([rich cards](../features/rich-cards.md)).
  Read by `toSpeechLanguages` (invalid tags dropped); once written it is kept as `{}` rather than deleted, and
  Duplicate and backups carry it. No key is written with an `undefined` value.
- `shareId`: optional string, the id of the set's public copy in [shared-sets](shared-sets.md) while it is shared.
  `validSet` requires it to be a string when present.

## Rules

- Reading is forgiving: `cardSetFromDoc` falls back to defaults for missing or malformed fields (`id` falls back to
  the document id, `color` to `#E91E63`, an unparsable `cards` to an empty list, an unreadable `date` to the epoch).
  Tested in `tests/unit/cardSetMapper.spec.ts`.
- `parseCards` keeps unknown fields on a card, so a field a newer version wrote survives a read and save.
- `firestore.rules` (`validSet`) requires `cards` to be a string and `labels` a list on every create and update,
  and an update may not change `id`.
- `cards` is a JSON string, as the original app stored it. The original app is no longer in use, so the format may
  change, as long as the version that is live can still read it; see
  [original app compatibility](../decisions/original-app-compatibility.md). The size limit to come is
  [set size limit](../requirements/set-size-limit.md).
- Every save rewrites the whole document, all cards included.

## History

- 2026-11-05: a set had no language or share fields; now it may carry `speech` and `shareId`, and a new set is created with `setDoc` on an id made on the device, because of the rich-cards, sharing and offline-study plans. See [sharing](../features/sharing.md).
- 2026-11-05: a card had no schedule; now it may carry `srs` inside the `cards` string, for spaced repetition. No rules change: the mapper already keeps unknown card fields. See [SM-2 over FSRS](../decisions/sm2-over-fsrs.md).
- 2026-11-05: cards lost fields the mapper didn't know and a set had no study time; now unknown card fields are kept and a set may carry `studiedAt`, for study modes.
- 2026-11-03: `cards` had to stay a JSON string for older app versions; now no old version is in use, and the format may change. See [Original app compatibility](../decisions/original-app-compatibility.md).

## Sources

- `src/services/cardSetMapper.ts`
- `src/services/firebase.ts`
- `src/types.ts`
- `src/utils/cardSets.ts`
- `src/utils/srs.ts`
- `src/utils/speech.ts`
- `firestore.rules`
- `tests/unit/cardSetMapper.spec.ts`
