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
user can search by set title or by any card's front or back, filter by one label or by favourites, open a set to study or edit, star it, or move it to
the bin, with an Undo in the snack bar. A menu leads to the bin, labels (profile), about and settings. A floating
button starts a new set. When cards are due, a banner shows "{n} cards due" with a Study now button that opens `/due`, and each set card shows "{n} due" and "{m} new", each hidden at 0 ([spaced repetition](spaced-repetition.md)), and a "Studied {relative time}" line in the app language, or "Not studied yet" when the set has no `studiedAt`. Sets in the bin show neither the counts nor that line. Below the sets list, once the sets have loaded, an AdSense banner shows when ads are configured
([one AdSense banner](../decisions/adsense-banner-ads.md)).

Home also shows the review streak and, when a set outside the bin holds a card, today's count against the daily goal, linking to `/stats`
([progress and habits](progress-habits.md)).

## Screens and routes

- `/home`: `src/views/Home.vue`, with `CardFlashSet` for each set and `ShimmerCardFlashSet` placeholders while
  loading. From a set: `/:id/view` ([study](study-set.md)) and `/:id/edit` ([edit](edit-set.md)).

## Rules

- Filtering and sorting happen in the browser in `filterAndSortSets` (`src/utils/cardSets.ts`): trashed sets are
  hidden; search is case-insensitive and keeps a set whose title or any card's front or back contains the text
  (`titleMatches`, `cardMatchCount`); when the match came from cards, the set card shows "Matches in {n} cards". The
  order is one of `SET_ORDERS`: the three date and name orders plus `Progress` (least learned first, ties by title)
  and `Recently studied` (most recent `studiedAt` first, never-studied sets last, ties by title); favourites can be
  pinned on top. The "Studied" text comes from `relativeTime` (`src/utils/relativeTime.ts`, `Intl.RelativeTimeFormat`). Order and favourites-on-top come from [settings](settings-and-about.md). Tested in
  `tests/unit/cardSets.spec.ts`.
- On touch screens a set card swipes right to favourite and left to move to the bin (`CardFlashSet.vue`).
- Starring or moving to the bin saves the whole set through `library.saveSet`, which also updates a shared set's
  public copy and, offline, counts as done once in the device cache ([sharing](sharing.md),
  [offline study](offline-study.md)). `shareSet` and `unshareSet` are the store's other sharing actions; a copy that
  has vanished clears the set's `shareId`.
- The banner is `AdBanner` (`src/components/AdBanner.vue`), the only place an ad is requested; each mount asks AdSense
  for one ad ([Google AdSense](../integrations/google-adsense.md)).
- The bin is a flag (`trashed`), not a delete: see [bin](bin.md).

## History

- 2026-11-05: Home showed no progress; now it shows the streak and today's count, and saves of sets work offline and sync a shared copy, because of the progress-habits, offline-study and sharing plans.
- 2026-11-05: search matched titles only and there were three orders; now search also matches card text, there are two more orders, and each set card shows when it was last studied, for the usability spec's library search and sort.
- 2026-11-05: Home showed no due information; now a due banner and per-set due and new counts show, for spaced repetition.
- 2026-11-04: no ads; now an AdSense banner sits below the sets list, because the developer wants the app to earn. See [the decision](../decisions/adsense-banner-ads.md).

## Sources

- `src/views/Home.vue`
- `src/components/AdBanner.vue`
- `src/components/CardFlashSet.vue`
- `src/utils/srs.ts`
- `src/utils/relativeTime.ts`
- `tests/unit/relativeTime.spec.ts`
- `tests/e2e/library-sort.spec.ts`
- `tests/e2e/library-search.spec.ts`
- `src/components/ShimmerCardFlashSet.vue`
- `src/utils/cardSets.ts`
- `src/stores/library.ts`
- `src/stores/stats.ts`
- `tests/unit/cardSets.spec.ts`
- `tests/e2e/sets.spec.ts`
