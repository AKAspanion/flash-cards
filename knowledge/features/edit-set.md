---
type: Feature
title: Create and edit a set
description: The set editor — title, colour, labels and cards — which saves when the user leaves it, and never saves an empty new set.
generated: { by: claude-code/claude-opus-5-5, at: 2026-11-02T19:12:23Z }
verified: human:panditankit1995@gmail.com
---

# Create and edit a set

## What it does

`/add` starts a new set; `/:id/edit` opens an existing one in the same editor. The user sets the title, picks a
colour from `ColorPalette`, attaches labels, and adds cards at the current position, edits them, and deletes them (with
Undo). An options panel can move the set to the bin.

## Screens and routes

- `/add` and `/:id/edit`: both `src/views/Add.vue` (route names `add` and `edit`). Cards are shown by
  `GroupCardFlash` and `CardFlash`.

## Rules

- A new set gets its app id from `uid()` and the colour `#E91E63`.
- An edit waits for the library to load, then copies the set into a draft; if the set isn't found, the user is
  sent to `/home` with a "set not found" snack.
- Saving happens when the user leaves by any route (back button, nav, browser back), in the editor's
  `onBeforeRouteLeave`, not only on the save button. See [unsaved changes](../domain/unsaved-changes.md).
- A brand-new set with no cards is not saved (`needsSave`, `canSave`); an edited set always is. The developer
  confirmed this rule on 2026-11-03.
- A save is refused while offline, with a snack, and concurrent saves are ignored so a set is never created twice
  (`persist`).

## Sources

- `src/views/Add.vue`
- `src/components/GroupCardFlash.vue`
- `src/components/CardFlash.vue`
- `src/components/ColorPalette.vue`
- `src/components/OptionPanel.vue`
- `src/utils/cardSets.ts`
- `src/stores/library.ts`
- `tests/e2e/sets.spec.ts`
