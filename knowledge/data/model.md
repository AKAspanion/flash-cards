---
type: Data Model
title: Data model
description: Two Firestore collections, flash-card-sets and labels, each document owned by one user through its uid; cards are embedded in their set as a JSON string.
status: draft
generated: { by: claude-code/claude-opus-5-5, at: 2026-11-02T19:12:23Z }
---

# Data model

## Entities

- [flash-card-sets](flash-card-sets.md): one document per set, with its cards embedded.
- [labels](labels.md): one document per label a user has created.

The app-side types are `CardSet`, `FlashCard` and `Label` in `src/types.ts`; `src/services/cardSetMapper.ts`
converts between them and the stored documents. The stored shape is kept exactly as the original app wrote it:
see [original app compatibility](../decisions/original-app-compatibility.md).

## Relations

- Every document carries the owner's `uid`; the app queries both collections with `where('uid', '==', …)`, and
  `firestore.rules` only allows the owner to read or write ([roles](../security/roles.md)).
- A set refers to labels by their Firestore document id, in `CardSet.labels`. Nothing keeps this in step: a
  deleted label would leave its id on sets (see [label deletion](../questions/label-deletion.md)).
- Cards have no collection of their own: they live in their set's `cards` field.

## Sources

- `src/types.ts`
- `src/services/cardSetMapper.ts`
- `src/services/firebase.ts`
- `firestore.rules`
