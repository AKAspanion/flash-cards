---
type: Data Model
title: labels collection
description: A user's labels — a name and an owner uid — referenced from sets by document id.
generated: { by: claude-code/claude-opus-5-5, at: 2026-11-02T19:12:23Z }
verified: human:panditankit1995@gmail.com
---

# labels collection

## Fields

- `label`: the label text.
- `uid`: the owner's Firebase Auth uid.

Created by `addLabel` and renamed by `renameLabel` in `src/services/firebase.ts`; read into `Label` (`docId`,
`label`) by `labelFromDoc` in `src/services/cardSetMapper.ts`.

## Rules

- `firestore.rules` requires `label` to be a string on create and update, and only the owner may read, write or
  delete.
- Sets point at labels by document id (`CardSet.labels`); renaming a label therefore needs no change to sets.
- Labels are never deleted: see [labels cannot be deleted](../decisions/labels-cannot-be-deleted.md). The rules
  still allow `delete`, which that decision notes.

## History

- 2026-11-03: label deletion was an open question; now decided against. See [Labels cannot be deleted](../decisions/labels-cannot-be-deleted.md).

## Sources

- `src/services/firebase.ts`
- `src/services/cardSetMapper.ts`
- `firestore.rules`
