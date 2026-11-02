---
type: Feature
title: Library (home)
description: The home screen listing the user's sets, with search, label and favourite filters, the saved sort order, swipe gestures, and move to bin with undo.
generated: { by: claude-code/claude-opus-5-5, at: 2026-11-02T19:12:23Z }
verified: human:panditankit1995@gmail.com
---

# Library (home)

## What it does

`/home` shows every set not in the bin as a card with its colour, labels and learned progress (`learnedCount`). The
user can search by title, filter by one label or by favourites, open a set to study or edit, star it, or move it to
the bin, with an Undo in the snack bar. A menu leads to the bin, labels (profile), about and settings. A floating
button starts a new set.

## Screens and routes

- `/home`: `src/views/Home.vue`, with `CardFlashSet` for each set and `ShimmerCardFlashSet` placeholders while
  loading. From a set: `/:id/view` ([study](study-set.md)) and `/:id/edit` ([edit](edit-set.md)).

## Rules

- Filtering and sorting happen in the browser in `filterAndSortSets` (`src/utils/cardSets.ts`): trashed sets are
  hidden; search is a case-insensitive title match; the order is one of `SET_ORDERS`, and favourites can be pinned
  on top. Order and favourites-on-top come from [settings](settings-and-about.md). Tested in
  `tests/unit/cardSets.spec.ts`.
- On touch screens a set card swipes right to favourite and left to move to the bin (`CardFlashSet.vue`).
- Starring or moving to the bin saves the whole set through `library.saveSet`.
- The bin is a flag (`trashed`), not a delete: see [bin](bin.md).

## Sources

- `src/views/Home.vue`
- `src/components/CardFlashSet.vue`
- `src/components/ShimmerCardFlashSet.vue`
- `src/utils/cardSets.ts`
- `src/stores/library.ts`
- `tests/unit/cardSets.spec.ts`
- `tests/e2e/sets.spec.ts`
