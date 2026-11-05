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

## Faster authoring

- The options panel adds Import cards, Export as CSV or JSON, Reorder cards and Duplicate set. Import
  (`ImportCardsDialog.vue`) takes pasted text or a `.csv`, `.tsv` or `.txt` file, parsed by `src/utils/cardImport.ts`;
  lines it cannot read are listed, and nothing is imported past the limits in
  [the size decision](../decisions/set-size-limit-900000-bytes.md). Export downloads through `downloadText()` in
  `src/utils/download.ts`, in the formats of `src/utils/cardExport.ts`. Reorder (`ReorderCardsDialog.vue`) changes the
  card order in the draft.
- Duplicate set copies each card whole, unknown fields included, with a new id and the progress cleared
  (`src/utils/duplicateCards.ts`), because cards keep every field across saves.
- Quicker entry: in the card text dialog, "Next: back side" (or Tab) moves from the front to the back, and "Save and
  add next" (Ctrl or Cmd+Enter) saves the card, inserts a new one after it and opens it.
  Whole-set backup is in [settings](settings-and-about.md).

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

## History

- 2026-11-05: the editor only added, edited and deleted cards; now it also imports, exports, reorders and duplicates, and enters cards faster, to fill a set quickly. See [the size decision](../decisions/set-size-limit-900000-bytes.md).

## Sources

- `src/views/Add.vue`
- `src/components/GroupCardFlash.vue`
- `src/components/CardFlash.vue`
- `src/components/ColorPalette.vue`
- `src/components/ImportCardsDialog.vue`
- `src/components/ReorderCardsDialog.vue`
- `src/utils/cardImport.ts`
- `src/utils/cardExport.ts`
- `src/utils/duplicateCards.ts`
- `src/utils/download.ts`
- `src/utils/setSize.ts`
- `src/components/OptionPanel.vue`
- `src/utils/cardSets.ts`
- `src/stores/library.ts`
- `tests/e2e/sets.spec.ts`
- `tests/e2e/authoring.spec.ts`
- `tests/e2e/quick-entry.spec.ts`
