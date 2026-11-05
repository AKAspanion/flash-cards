---
type: Feature
title: Rich cards and read aloud
description: Card text is Markdown, shown only through renderCardText; the editor can insert an image; the review screen and /due read a card aloud (R), with a language per side stored on the set.
status: draft
generated: { by: claude-code/claude-sonnet-5-5, at: 2026-11-05T18:00:00Z }
---

# Rich cards and read aloud

## What it does

- A card's front and back are Markdown: bold, italics, lists, code, headings, links and images. The editor's text
  dialog has Insert image, which adds `![alt](https://…)` for an https address (`CardFlash.vue`).
- On the review screen and `/due`, a read aloud button, or the R key, speaks the visible side with the browser's speech
  synthesis (`src/utils/speech.ts`); it speaks `cardPlainText`, so Markdown marks are not read out. Nothing shows where
  the browser has no speech.
- The set's options choose a read-aloud language for each side, stored as `speech` on the set (`front` and `back`
  language tags). Unset means the browser default.

## Rules

- Card text becomes HTML in one place only, `renderCardText` ([decision](../decisions/card-text-rendered-only-through-sanitizer.md)).
- `speech` is read by `toSpeechLanguages`, which keeps only tags shaped like BCP 47 (at most 35 characters); a stored
  object with no valid side reads as `{}`, a non-object as absent. It is never deleted from a set once written, even
  when emptied (kept as `{}`), Duplicate and backups carry it, and restore checks it as language tags; older backups
  without it still restore ([flash-card-sets](../data/flash-card-sets.md)).
- Study shortcuts list R in `StudyShortcutsDialog.vue`.

## Sources

- `src/utils/markdown.ts`
- `src/utils/speech.ts`
- `src/components/CardFlash.vue`
- `src/components/StudyShortcutsDialog.vue`
- `src/composables/useStudyShortcuts.ts`
- `src/services/cardSetMapper.ts`
- `src/utils/cardExport.ts`
- `src/views/Due.vue`
- `src/views/View.vue`
- `tests/unit/markdown.spec.ts`
- `tests/unit/speech.spec.ts`
- `tests/e2e/rich-cards.spec.ts`
- `tests/e2e/read-aloud-language.spec.ts`
- `docs/plans/2026-11-02-rich-cards.md`
