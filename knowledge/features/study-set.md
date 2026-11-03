---
type: Feature
title: Study a set
description: Review a set card by card, flip to see the answer, mark cards learned; progress is saved when the user leaves.
generated: { by: claude-code/claude-opus-5-5, at: 2026-11-02T19:12:23Z }
verified: human:panditankit1995@gmail.com
---

# Study a set

## What it does

`/:id/view` shows a set's cards one at a time with a learned counter and progress bar. The user flips a card to
see its back and marks it learned or not; marking a card learned moves on to the next one.

## Screens and routes

- `/:id/view`: `src/views/View.vue`, using `GroupCardFlash` and `CardFlash` in browse mode.

## Rules

- Flipping a card that is marked learned, while online, marks it not learned again: peeking at the answer counts as
  not knowing it (comment in `CardFlash.vue`, `flip`). The developer confirmed this rule on 2026-11-03.
- Marking a card learned scrolls to the next card (`onCheck` in `GroupCardFlash.vue`).
- Learned state is saved with the whole set when the user leaves the screen, if anything changed and the app is
  online; if saving fails, the user is asked whether to discard. See
  [unsaved changes](../domain/unsaved-changes.md).

## Sources

- `src/views/View.vue`
- `src/components/CardFlash.vue`
- `src/components/GroupCardFlash.vue`
- `src/stores/library.ts`
