# Set Card Swipe Clipping Implementation Plan

**Status:** complete, commits a8a733c..f4865f0, 2026-11-06; record in `2026-11-06-set-card-swipe-clipping.record.md`

> **For agentic workers:** REQUIRED SUB-SKILL: the project's workflow policy names the executor (`run.executor`): ga:feature-build-team by default, or ga:feature-build. Follow the policy and this plan's Checkpoints. Steps use checkbox (`- [ ]`) syntax for tracking.

Plan, then build; tests with each task. Say 'test-first' or 'spec it first' to work that way.

**Goal:** While a set card is swiped on a touch screen, its coloured header slides over the outer card's edge and stays fully visible, instead of disappearing into the outer card.

**Architecture:** `CardFlashSet.vue` puts the coloured header (`.set-card__swipe`) inside an outer `v-card` whose scoped style sets `overflow: hidden`, so the translated header is clipped at the outer card's edge. The outer card stops clipping, the header keeps its own rounded corners and gains a lifted shadow while it is off-centre, and the home grid clips only horizontally (`overflow-x: clip`, which makes no scroll container) so a swipe never adds a horizontal page scroll.

**Tech Stack:** Vue 3 + Vuetify 3, Playwright (desktop Chrome and Pixel 7 projects) against the Firebase emulators.

**Spec:** none: a one-file design change the developer asked for on 2026-11-06, shown in their screen recording ("the top card disappears inside the main card while swiping, instead I want it to be on top").

## Global Constraints

- The swipe's behaviour is unchanged: right past `SWIPE_TRIGGER = 62` favourites, left past it moves to the bin, the header moves at most `SWIPE_MAX = 100` px (`knowledge/features/library.md`).
- At rest the card looks as it does now: header corners match the outer card's.

## Checkpoints

None (`run.checkpoints: none`).

---

### Task 1: Keep the swiped header visible above the set card

**Files:**
- Modify: `src/components/CardFlashSet.vue`
- Modify: `src/views/Home.vue`
- Create: `tests/e2e/set-card-swipe.spec.ts`

**Interfaces:**
- Consumes: existing account, `createSet()` and `setCard()` helpers in `tests/e2e/helpers.ts`.
- Produces: nothing new; `CardFlashSet`'s props and events are unchanged.

**Spec:** none

**Tags:** screen (no failure paths: the change is CSS layout; the favourite and bin actions are untouched)

**Knowledge:** `features/library`: while a set card is swiped, its coloured header slides over the card's edge with a lifted shadow and stays visible, rather than being clipped by the card.

**Acceptance:** (mobile project only, touch events; the desktop project skips the file)
- Given a user with one set, when a touch on the set's header moves 100 px left and is held, then the element at the point 10 px left of the outer `.set-card`'s left edge, at the header's vertical middle, is inside `.set-card__swipe`.
- The same moving right: the point 10 px right of the outer card's right edge is inside `.set-card__swipe`.
- While held, the page has no horizontal scroll: `document.scrollingElement.scrollWidth` equals its `clientWidth`.
- When the touch ends short of the trigger (40 px), the header returns: its left edge equals the outer card's left edge.

- [x] **Step 1: Write the failing tests** for each Acceptance case, in `tests/e2e/set-card-swipe.spec.ts`

- [x] **Step 2: Run them to verify they fail**

Run: `package.json`'s `test:e2e` command with its quoted `playwright test` narrowed to `playwright test tests/e2e/set-card-swipe.spec.ts --project=mobile`
Expected: FAIL on the first two cases (the point beyond the edge is not in the header)

- [x] **Step 3: Write the minimal implementation** in `CardFlashSet.vue` and `Home.vue`'s `.set-grid`, until they pass

- [x] **Step 4: Run them to verify they pass**

Run: `package.json`'s `test:e2e` command with its quoted `playwright test` narrowed to `playwright test tests/e2e/set-card-swipe.spec.ts --project=mobile`
Expected: PASS

- [x] **Step 5: Commit**

```bash
git add src/components/CardFlashSet.vue src/views/Home.vue tests/e2e/set-card-swipe.spec.ts
git commit -m "Keep a set card's coloured header visible above the card while it is swiped."
```
