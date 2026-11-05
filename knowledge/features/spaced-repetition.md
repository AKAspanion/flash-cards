---
type: Feature
title: Spaced repetition
description: Every card is scheduled with SM-2 in whole local days; the review screen and /due rate cards Again, Hard, Good or Easy, and Home shows what is due.
status: draft
work_item: tmp-spaced-repetition
generated: { by: claude-code/claude-sonnet-5-5, at: 2026-11-05T13:00:00Z }
---

# Spaced repetition

## What it does

After a card is flipped, four buttons rate it: Again, Hard, Good, Easy (keys 1 to 4). The rating schedules the card
and moves to the next one. Home shows how many cards are due and a Study now button that opens `/due`, which reviews
the due cards of every set in one queue. Each set card on Home shows its own due and new counts. See
[study a set](study-set.md) for the per-set review screen and [library](library.md) for Home.

## Rules

- Scheduling is `schedule()` in `src/utils/srs.ts`, an SM-2 variant in whole days on the device's local date
  (`localDate()` in `src/utils/dates.ts`). Why SM-2: [SM-2 over FSRS](../decisions/sm2-over-fsrs.md).
- The state is an optional `srs` object (`due`, `interval`, `ease`, `reps`, `lapses`) inside each card in the set's
  `cards` string ([data](../data/flash-card-sets.md)); a card with no `srs` is new. Ease never goes below 1.3.
- `learned` stays in step so older readers still see progress: Again sets it false, the other three set it true.
- A card is due when it is new or its `srs.due` is today or earlier.
- The `/due` queue (`dueQueue`) skips bin sets, takes started due cards oldest `due` first, then at most
  `NEW_CARDS_PER_REVIEW = 20` new cards, with sets ordered by title and cards in stored order. The Home banner
  counts that queue; the per-set "due" and "new" counts (`setDueCounts`) cover the whole set, so they can add up to
  more than the banner.
- An Again card comes back once more at the end of the session; rating it Again a second time does not re-queue it.
- Rating needs the device to be online. Each set touched is saved with `studiedAt` when the user leaves, through the
  leave guard; `/due` marks the session unsaved through `session.unsavedChanges`
  ([unsaved changes](../domain/unsaved-changes.md)). If saving fails the user is asked whether to discard.
- With nothing due, `/due` says "Nothing due". When the queue runs out the session summary shows, offering Review
  missed.
- Reset progress on the review screen also clears `srs`.

## Screens and routes

- `/due`: `src/views/Due.vue`, using `CardFlash` with its rating row and `StudySummaryDialog`.
- `/:id/view`: rating on the per-set review screen, `src/views/View.vue`.
- `/home`: the due banner and per-set counts, `src/views/Home.vue` and `src/components/CardFlashSet.vue`.

## Sources

- `src/utils/srs.ts`
- `src/types.ts`
- `src/utils/dates.ts`
- `src/views/Due.vue`
- `src/views/View.vue`
- `src/views/Home.vue`
- `src/components/CardFlashSet.vue`
- `src/components/CardFlash.vue`
- `src/components/GroupCardFlash.vue`
- `src/router/index.ts`
- `tests/unit/srs.spec.ts`
- `tests/e2e/srs-review.spec.ts`
- `tests/e2e/due-review.spec.ts`
- `docs/specs/2026-11-02-usability-features.md`
- `docs/plans/2026-11-02-spaced-repetition.md`
