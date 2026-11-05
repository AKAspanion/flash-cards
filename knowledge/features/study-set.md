---
type: Feature
title: Study a set
description: Review a set card by card with study options and keyboard shortcuts, flip to see the answer, mark cards learned, reset progress and see a session summary; progress is saved when the user leaves.
generated: { by: claude-code/claude-opus-5-5, at: 2026-11-02T19:12:23Z }
verified: human:panditankit1995@gmail.com
---

# Study a set

## What it does

`/:id/view` shows a set's cards one at a time with a learned counter and progress bar. The user flips a card to
see its back and rates it Again, Hard, Good or Easy (keys 1 to 4), or marks it learned or not; rating or marking a card learned moves on to the next one. Rating schedules the card: see [spaced repetition](spaced-repetition.md).

A Study options panel offers shuffle, unlearned only and reverse (back shown first); the three are device-local
preferences (`study-shuffle`, `study-unlearned-only`, `study-reverse`, see
[settings](settings-and-about.md)). The queue is built by `buildQueue` in `src/utils/studyQueue.ts`. A Reset
progress action marks every card not learned and clears its `srs`. When the user finishes, a session summary dialog shows what was
studied and offers Review missed, which restarts on the cards not marked learned.

## Screens and routes

- `/:id/view`: `src/views/View.vue`, using `GroupCardFlash` and `CardFlash` in browse mode.

## Keyboard shortcuts

`useStudyShortcuts` (`src/composables/useStudyShortcuts.ts`) drives the screen; the shortcuts are listed in
`StudyShortcutsDialog.vue`. They flip the focused card, rate it with 1 to 4 once it is flipped, mark it learned or not, and move between cards. K
(mark learned) advances to the next card; J (not learned) does not.

## Rules

- Flipping a card no longer changes whether it is learned; the rating buttons replace the old peek rule.
- A rating sets `learned` (Again false, the others true) and moves to the next card; an Again card is queued once
  more at the end of the visit. Rating is ignored while offline or saving.
- Marking a card learned scrolls to the next card (`onCheck` in `GroupCardFlash.vue`).
- Learned state is saved with the whole set when the user leaves the screen, if anything changed and the app is
  online; if saving fails, the user is asked whether to discard. A session with no changes is not saved. A save
  that happens also writes `studiedAt` on the set ([data](../data/flash-card-sets.md)). See
  [unsaved changes](../domain/unsaved-changes.md).

## History

- 2026-11-05: flipping a learned card marked it not learned (the peek rule); now flipping changes nothing and four rating buttons schedule the card, because of the spaced-repetition plan (spec 6.4). See [spaced repetition](spaced-repetition.md).
- 2026-11-05: review was a plain browse with flip and mark; now it has study options, shortcuts, reset progress and a session summary, and saves `studiedAt`, because of the study-modes plan (`docs/plans/2026-11-02-study-modes.md`).

## Sources

- `src/views/View.vue`
- `src/components/CardFlash.vue`
- `src/components/GroupCardFlash.vue`
- `src/stores/library.ts`
- `src/utils/studyQueue.ts`
- `src/utils/srs.ts`
- `src/composables/useStudyShortcuts.ts`
- `src/components/StudyShortcutsDialog.vue`
- `src/components/StudySummaryDialog.vue`
- `docs/plans/2026-11-02-study-modes.md`
