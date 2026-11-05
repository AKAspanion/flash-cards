---
type: Decision
title: A set's cards may not exceed 900,000 bytes
description: A set is refused at save when its serialized cards pass 900,000 bytes of UTF-8, which keeps the set's Firestore document under its 1 MiB limit.
status: draft
work_item: tmp-faster-authoring
generated: { by: claude-code/claude-sonnet-5-5, at: 2026-11-05T12:00:00Z }
---

# A set's cards may not exceed 900,000 bytes

## Context

All of a set's cards are stored in one Firestore document as a JSON string, and a document cannot pass 1 MiB. Bulk
import, restore and duplicate make it easy to build a set that large, so the app needed a limit that fails with a
message instead of a Firestore error. This is the limit [limit the size of a set](../requirements/set-size-limit.md)
asked for; the usability spec's 2.6 chose the number.

## Decision

- `MAX_CARDS_BYTES = 900_000` in `src/utils/setSize.ts`: the UTF-8 size of `JSON.stringify(cards)`. The margin under
  1 MiB leaves room for the document's other fields.
- The check is in the library store's `createSet` and `saveSet`, so every save path (editor, import, duplicate,
  restore) is covered. A refused save shows the `toast.error.too-big` snack and resolves to `null` or `false`.
- Importing is capped separately in `src/utils/cardImport.ts`: `MAX_IMPORT_CARDS = 1000` cards and
  `MAX_IMPORT_FILE_BYTES` of 2 MB, so a file is refused before it is parsed into something that cannot save.
- The limit is enforced in the app only, not in `firestore.rules`, so nothing needs a manual deploy.

## Consequences

- A set already over the limit can be opened but not saved until cards are removed.
- Tested in `tests/unit/setSize.spec.ts`, `tests/unit/cardImport.spec.ts` and `tests/unit/library.spec.ts`.

## Sources

- `src/utils/setSize.ts`
- `src/utils/cardImport.ts`
- `src/stores/library.ts`
- `tests/unit/setSize.spec.ts`
- `tests/unit/cardImport.spec.ts`
- `tests/unit/library.spec.ts`
- `docs/specs/2026-11-02-usability-features.md`
- `docs/plans/2026-11-02-faster-authoring.md`
