---
type: Open Question
title: Should users be able to delete labels?
description: The Firestore rules allow deleting a label, but the app has no delete call or screen for it, and sets would keep the deleted label's id.
generated: { by: claude-code/claude-opus-5-5, at: 2026-11-02T19:12:23Z }
verified: human:panditankit1995@gmail.com
---

# Should users be able to delete labels?

## Question

Is label deletion meant to exist? `firestore.rules` allows the owner to delete a label, but
`src/services/firebase.ts` has no delete function for labels and `src/views/Profile.vue` only creates and renames
them. If deletion is added, should it also remove the label's id from every set that carries it?

## Why it matters

Users can't remove labels they no longer want, and if deletion is added without cleanup, sets would hold ids of
labels that no longer exist (`CardSet.labels` in `src/types.ts`).

## Status

Answered: labels cannot be deleted. See [Labels cannot be deleted](../decisions/labels-cannot-be-deleted.md).

## Sources

- `firestore.rules`
- `src/services/firebase.ts`
- `src/views/Profile.vue`
- `src/types.ts`
