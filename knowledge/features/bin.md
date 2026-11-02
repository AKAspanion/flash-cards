---
type: Feature
title: Bin
description: Sets moved to the bin are only flagged trashed; from the bin the user restores them or deletes them permanently after confirming.
status: draft
generated: { by: claude-code/claude-opus-5-5, at: 2026-11-02T19:12:23Z }
---

# Bin

## What it does

`/bin` lists the user's trashed sets. Each can be restored, or deleted for good after a confirmation dialog.

## Screens and routes

- `/bin`: `src/views/Bin.vue`, reached from the home menu.

## Rules

- Moving to the bin (from [library](library.md) or [the editor](edit-set.md)) sets `trashed: true` and saves the
  set; restoring sets it back to `false`.
- Delete forever calls `deleteCardSet`, removing the Firestore document; it can't be undone.
- Nothing empties the bin automatically.

## Sources

- `src/views/Bin.vue`
- `src/views/Home.vue`
- `src/views/Add.vue`
- `src/stores/library.ts`
- `src/services/firebase.ts`
