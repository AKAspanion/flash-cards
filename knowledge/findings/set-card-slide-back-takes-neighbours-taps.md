---
type: Finding
title: A set card's header, sliding back after a swipe, can catch a neighbour's taps or pass under it
description: For 200 ms after a swipe is released, the header still overlaps the neighbouring card in a multi-column grid, so a tap there reaches the swiped card; and a tap on the swiped card in that time lowers it early.
generated: { by: claude-code/claude-opus-5-5, at: 2026-11-06T08:30:00Z }
---

# A set card's header, sliding back after a swipe, can catch a neighbour's taps or pass under it

## Finding

When a swipe ends, the header slides back to rest over 200 ms (`transform 200ms ease-out` in `CardFlashSet.vue`),
and the card stays raised above its neighbours until then ([library](../features/library.md)). In a grid of two or
more columns (tablets), during that slide:

- After a left swipe the header still covers up to 68 px of the card to its left. A tap there lands on the swiped
  card's header (its edit chip, a label filter, or the start of a new swipe) instead of the neighbour. Nothing is
  lost: moving to the bin has an Undo, and bin cards don't swipe.
- A tap or vertical touch on the swiped card itself runs `resetSwipe` with `offset` already 0, which lowers the card
  at once, so the header can pass under the neighbour for the rest of the slide.

On a phone, with one column, neither can happen.

## Evidence

- `.ga/runs/2026-11-06-set-card-swipe-clipping/reviews/final-security-reviewer.md`, Minor 1: during the 200 ms
  slide back "it still covers up to 68px of the card to its left" (`src/components/CardFlashSet.vue:220`, `:268-271`,
  with the grid gap at `src/views/Home.vue:326`).
- `.ga/runs/2026-11-06-set-card-swipe-clipping/reviews/final-r1-reviewer.md`, new Minor 1: the early `lower()` in
  `resetSwipe` when `offset === 0` lowers the card "before the header is home".
- Ledger: both deferred as Minors by the final review.

## Status

Open. One way: while the card is raised and `offset` is 0 (sliding back), give the header `pointer-events: none` and
let `resetSwipe` keep the card raised until the transition ends.

## Sources

- `src/components/CardFlashSet.vue`
- `src/views/Home.vue`
