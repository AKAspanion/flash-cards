---
type: Feature
title: Progress and habits
description: Reviews are counted per day in the user's user-stats document; Home shows the streak and today's count, /stats shows the history, and Settings sets a daily goal of 10, 20, 50 or 100.
status: draft
generated: { by: claude-code/claude-sonnet-5-5, at: 2026-11-05T18:00:00Z }
---

# Progress and habits

## What it does

Every card reviewed counts toward the day it was reviewed (the device's local date). Home shows the current streak and
today's count against the daily goal; `/stats` shows the history (last days, current and longest streak, total
reviewed); Settings has a Daily goal select with the values in `DAILY_GOALS` (`src/types.ts`), default
`DEFAULT_DAILY_GOAL`. See [library](library.md) for Home and [settings](settings-and-about.md).

## Rules

- The data is one document per user in `user-stats`, with its id equal to the uid ([data](../data/user-stats.md)).
  `src/stores/stats.ts` loads it once per user and resets on sign-out or a user switch, so the next account on the
  device never sees the last one's counts. Home, Settings and `/stats` call `load()`; a second call is a no-op.
- A review counts once per card per visit, however many times the card is rated in it; `recordReviews` is called when
  the user leaves `/:id/view` or `/due`, after the set has saved. Why:
  [counts are written after the set save](../decisions/review-counts-after-set-save.md).
- A visit that changes no card data (re-marking a card already learned) still writes its count, though no set is saved.
- Home shows today's count against the goal only when a set outside the bin holds a card (`hasCards` in
  `src/utils/cardSets.ts`), as Study now already did; the streak keeps its own rule.
- Streak maths is pure, in `src/utils/streaks.ts`: a streak is consecutive days with at least one review, and ending
  yesterday still counts, so a streak isn't lost before the user has studied today.
- Stats writes follow the library's save rule: awaited online, counted as done offline once they are in the device
  cache ([offline study](offline-study.md)). A failed stats write shows `toast.error.stats`, and a failed load `toast.error.stats-load`.

## History

- 2026-11-06: a failed stats load showed the generic error; now `toast.error.stats-load`, because the friendly-error-messages plan gave each action its own wording.
- 2026-11-06: Home always showed today's count; now it hides it when no set outside the bin holds a card, because the goal means nothing without cards.

## Screens and routes

- `/stats`: `src/views/Stats.vue`. Home: streak and today in `src/views/Home.vue`.

## Sources

- `src/stores/stats.ts`
- `src/utils/streaks.ts`
- `src/utils/cardSets.ts`
- `src/types.ts`
- `src/services/statsMapper.ts`
- `src/views/Stats.vue`
- `src/views/Home.vue`
- `src/views/Settings.vue`
- `src/views/View.vue`
- `src/views/Due.vue`
- `src/services/firebase.ts`
- `tests/unit/stats.spec.ts`
- `tests/unit/streaks.spec.ts`
- `tests/unit/StatsView.spec.ts`
- `tests/e2e/stats.spec.ts`
- `tests/e2e/review-counts.spec.ts`
- `docs/plans/2026-11-02-progress-habits.md`
