---
type: Data Model
title: labels collection
description: A user's labels — a name and an owner uid — referenced from sets by document id.
status: draft
generated: { by: claude-code/claude-opus-5-5, at: 2026-11-02T19:12:23Z }
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
- The client has no delete call for labels: see [label deletion](../questions/label-deletion.md).

## Sources

- `src/services/firebase.ts`
- `src/services/cardSetMapper.ts`
- `firestore.rules`
