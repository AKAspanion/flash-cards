# Spaced Repetition Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: the project's workflow policy names the executor (`run.executor`): ga:implement-with-subagents by default, or ga:implement. Follow the policy and this plan's Checkpoints. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Schedule every card with SM-2 so people review what is due: rate cards Again / Hard / Good / Easy, see
what is due on Home, and review due cards across all sets at `/due`.

**Architecture:** Scheduling is a pure module (`src/utils/srs.ts`) keyed on local `YYYY-MM-DD` dates. Its state
lives in an optional `srs` object on each card inside the existing `cards` JSON string, and `learned` is kept in
step so the live app still reads progress correctly. The review screen and the new `/due` screen both rate through
the same `CardFlash` rating row.

**Tech Stack:** Vue 3 (`<script setup>`, TypeScript), Vuetify 4, Pinia, Vue Router 5, vue-i18n (en, hi),
Firebase 13 Firestore, Vitest (jsdom) + `@vue/test-utils`, Playwright + axe against the Firebase emulators,
GitHub Actions CI (`.github/workflows/ci.yml`).

**Spec:** `docs/specs/2026-11-02-usability-features.md` (sections 2, 3.2, 6 and 13)

**Depends on:** `docs/plans/2026-11-02-study-modes.md` merged to `master` (its `localDate`/`addDays`, `buildQueue`,
`useStudyShortcuts`, the `GroupCardFlash`/`CardFlash` methods, Reset progress, the summary dialog, and
`parseCards` keeping unknown card fields).

## Global Constraints

- 2.1: "Every new user-facing string is added to both `src/locales/en.json` and `src/locales/hi.json`." English copy is the spec's, word for word; the PR lists the Hindi strings for a Hindi reader.
- 2.2: "The Firestore schema stays readable by the version of the app that is live today." `srs` is optional and lives inside the `cards` string; no rules change.
- 2.4: "Every screen keeps working at 390 px wide and passes the existing axe scan in `tests/e2e/a11y.spec.ts`."
- 2.9: "Every string with a count uses vue-i18n plural forms, singular | plural."
- 2.5: "Keyboard shortcuts never fire while a text field, textarea or dialog has focus, or while Ctrl, Alt or Meta is held."
- 2.7: Unit tests are Vitest in `tests/unit/<name>.spec.ts`; e2e tests are Playwright in `tests/e2e/<flow>.spec.ts`, run with `npm run test:e2e`.
- `learned` stays correct on every card, because the live app reads only `learned` (spec 3.2, 6.3).
- Dates are the device's local date from `localDate()` (existing, from the study-modes plan). E2E tests that depend on the date fix the browser clock with Playwright's `page.clock`.
- E2E tests that read or seed the emulators directly use the ports in `DEV_PORTS` (`dev-ports.ts`), as `tests/e2e/study-modes.spec.ts` does; never a literal port. Amended 2026-11-05 after the 2100 port block (#40).
- The faster-authoring plan is merged (#41): `CardFlash.vue` also emits `add-after` and exposes `edit(side)`, and `GroupCardFlash.vue` exposes `scrollToCard`. Task 2 keeps all of them. Amended 2026-11-05.

## Checkpoints

None. The policy's `run.checkpoints` is `none`. Tasks 3 and 4 carry a `security` tag only because the plan check
matches the word "session" in the spec lines they quote; they add no stop.

---

### Task 1: Scheduler, due queue and copy

**Files:**
- Create: `src/utils/srs.ts`
- Modify: `src/types.ts`
- Modify: `src/locales/en.json`
- Modify: `src/locales/hi.json`
- Test: `tests/unit/srs.spec.ts`

**Interfaces:**
- Consumes: `localDate`, `addDays` (existing, from the study-modes plan); existing `CardSet`, `FlashCard`
- Produces (spec 13, exactly, plus `dueQueue` and `DueEntry`):

```ts
// src/types.ts
export interface FlashCard {
  // …existing fields
  srs?: SrsState; // imported from '@/utils/srs'
}

// src/utils/srs.ts
export type Rating = 'again' | 'hard' | 'good' | 'easy';
export interface SrsState { due: string; interval: number; ease: number; reps: number; lapses: number }
export function schedule(srs: SrsState | undefined, rating: Rating, today: string): SrsState;
export function isDue(card: FlashCard, today: string): boolean;
export const NEW_CARDS_PER_REVIEW = 20;
export interface DueEntry { setId: string; cardId: string }   // CardSet.id, FlashCard.id
export function dueQueue(sets: CardSet[], today: string): DueEntry[]; // the queue of 6.6, non-bin sets only
export function dueCount(sets: CardSet[], today: string): number;     // dueQueue(sets, today).length
export function setDueCounts(set: CardSet, today: string): { due: number; new: number }; // the 6.8 counts
```

- `schedule` follows spec 6.2 exactly. Ease is rounded to two decimals after each change and never goes below 1.3.
  `due` is `addDays(today, interval)`.
- `dueQueue` skips sets in the bin. It takes sets by title as the "Alphabetically" order sorts them
  (`a.title.localeCompare(b.title)`, the comparison `filterAndSortSets` uses) and cards in their stored order. It
  lists every started card (one with `srs`) whose `srs.due <= today`, oldest `due` first (ties keep that set and
  card order), then at most `NEW_CARDS_PER_REVIEW` cards with no `srs`, in that set and card order.
- `dueCount(sets, today)` is `dueQueue(sets, today).length`, so the Home number matches what "Study now" opens.
- `setDueCounts(set, today)` counts the whole set, ignoring the cap and the bin: `due` = cards with `srs` and
  `srs.due <= today`; `new` = cards with no `srs`.
- Locale keys (English word for word; Hindi by the implementer):

| Key | English |
|---|---|
| `srs.again` | Again |
| `srs.hard` | Hard |
| `srs.good` | Good |
| `srs.easy` | Easy |
| `due.banner` | {n} card due \| {n} cards due |
| `due.study-now` | Study now |
| `due.set-count` | {n} due |
| `due.set-new` | {m} new |
| `study.shortcuts.rate` | Rate the card (Again, Hard, Good, Easy) |
| `empty.due.title` | Nothing due |
| `empty.due.subtitle` | You're all caught up. Come back tomorrow. |

**Spec:**
- 6.2: "A new card has no srs. Its first rating starts it with ease 2.5, reps 0, lapses 0, interval 0."
- 6.2: "Again: reps 0, lapses + 1, ease − 0.20, interval 0"
- 6.2: "Hard: interval max(1, round(interval × 1.2)), ease − 0.15, reps + 1."
- 6.2: "Good: interval 1 when reps is 0, 3 when reps is 1, otherwise round(interval × ease); reps + 1."
- 6.2: "Easy: the Good interval × 1.3, rounded, at least 4; ease + 0.15; reps + 1."
- 6.2: "Ease never goes below 1.3. due is today + interval days."
- 6.5: "A card is due when it has no srs (a new card) or its srs.due is today or earlier."
- 6.6: "The study queue across all non-bin sets is: started cards that are due, oldest due first, then at most 20 new cards, taking sets by title (as the "Alphabetically" order sorts them) and cards in their stored order."
- 6.8: "Each set card on Home shows "{n} due" for its started cards that are due, and "{m} new" for its cards never studied, each hidden at 0."
- 4.1: "Plan 3 adds "Rate the card (Again, Hard, Good, Easy)" for 1-4"
- 13: "export function schedule(srs: SrsState | undefined, rating: Rating, today: string): SrsState;"
- 13: "export function dueCount(sets: CardSet[], today: string): number; // dueQueue(sets, today).length"
- 13: "export function setDueCounts(set: CardSet, today: string): { due: number; new: number }; // the 6.8 counts"

**Acceptance:**
- Given no `srs` and today `'2026-11-02'`, when rated `good`, then the result is `{ due: '2026-11-03', interval: 1, ease: 2.5, reps: 1, lapses: 0 }`.
- Given no `srs`, when rated `again`, then `{ due: '2026-11-02', interval: 0, ease: 2.3, reps: 0, lapses: 1 }`.
- Given no `srs`, when rated `hard`, then `{ due: '2026-11-03', interval: 1, ease: 2.35, reps: 1, lapses: 0 }`.
- Given no `srs`, when rated `easy`, then `{ due: '2026-11-06', interval: 4, ease: 2.65, reps: 1, lapses: 0 }`.
- Given `{ interval: 1, ease: 2.5, reps: 1, lapses: 0 }`, when rated `good`, then `interval` is `3`, `reps` `2`, `due` `'2026-11-05'`.
- Given `{ interval: 3, ease: 2.5, reps: 2, lapses: 0 }`, when rated `good`, then `interval` is `8` (round of 7.5) and `due` is `'2026-11-10'`; when rated `easy` instead, then `interval` is `10` and `ease` `2.65`.
- Given `{ interval: 10, ease: 2.5, reps: 3, lapses: 0 }`, when rated `hard`, then `interval` is `12` and `ease` `2.35`.
- Given `{ interval: 10, ease: 1.4, reps: 3, lapses: 2 }`, when rated `again`, then `ease` is `1.3`, `interval` `0`, `reps` `0`, `lapses` `3`; rating `hard` from ease `1.35` also gives `1.3`.
- Given a card with no `srs`, `isDue(card, '2026-11-02')` is `true`; with `srs.due` `'2026-11-02'` it is `true`; `'2026-10-01'` is `true`; `'2026-11-03'` is `false`.
- Given set "B" with a card due `'2026-11-01'` and set "A" with cards due `'2026-10-30'` and `'2026-11-01'` plus 25 new cards, and a set in the bin with a due card, when `dueQueue(sets, '2026-11-02')` runs, then it returns A's `'2026-10-30'` card, then A's `'2026-11-01'` card, then B's `'2026-11-01'` card, then the first 20 of A's new cards in stored order — 23 entries — and `dueCount` returns `23`.
- Given only cards due in the future and no new cards, then `dueQueue` returns `[]` and `dueCount` `0`.
- Given sets titled "beta", "Alpha" and "" (untitled), each with one new card, then `dueQueue` lists them in the order `filterAndSortSets` gives for "Alphabetically" (the same `localeCompare` order).
- Given a set with 100 new cards, then `dueCount([set], today)` is `20` and `setDueCounts(set, today)` is `{ due: 0, new: 100 }`.
- Given a set with one card due `'2026-11-01'`, one due `'2026-11-09'` and two new cards, then `setDueCounts(set, '2026-11-02')` is `{ due: 1, new: 2 }`; the same set in the bin gives the same counts.
- The existing `tests/unit/locales.spec.ts` passes with the new keys in both files.

- [ ] **Step 1: Write the failing tests** for each Acceptance case, in `tests/unit/srs.spec.ts`

- [ ] **Step 2: Run them to verify they fail**

Run: `npm test`
Expected: FAIL on the assertions. Create `src/utils/srs.ts` with the exported names and signatures first.

- [ ] **Step 3: Write the minimal implementation** to the Interfaces (srs module, `FlashCard.srs`, both locale files), until they pass

- [ ] **Step 4: Run them to verify they pass**

Run: `npm test`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/utils/srs.ts src/types.ts src/locales/en.json src/locales/hi.json tests/unit/srs.spec.ts
git commit -m "feat(srs): add SM-2 scheduler and due queue"
```

---

### Task 2: Rating row on the card

**Files:**
- Modify: `src/components/CardFlash.vue`
- Modify: `src/components/GroupCardFlash.vue`
- Test: `tests/unit/CardFlash.spec.ts` (new file)
- Test: `tests/unit/GroupCardFlash.spec.ts`

**Interfaces:**
- Consumes: `Rating` and the `srs.*` locale keys (Task 1); `CardFlash` `reverse` prop and `flip()`, `GroupCardFlash`
  `next`/`prev`/`goTo`/`flipFocused` (existing, from the study-modes plan)
- Produces:

```ts
// CardFlash.vue
props: { rating?: boolean }           // default false; true = show the rating row once revealed
emits: { rate: [rating: Rating] }
defineExpose({ flip(): void; edit(side): void; rate(rating: Rating): boolean }) // rate() is false (and emits nothing) until revealed; edit is the faster-authoring plan's

// GroupCardFlash.vue
props: { rating?: boolean }           // passed to every CardFlash
emits: { rate: [payload: { card: FlashCard; rating: Rating }] }
defineExpose({ scrollToCard(index: number); next(); prev(); goTo(index: number); flipFocused(); rateFocused(rating: Rating): boolean })
```

- A card is revealed once it has been flipped at least once (from either starting face). With `rating` on and
  the card revealed, the visible face shows four buttons "Again", "Hard", "Good", "Easy", in that order, each with
  its text as its accessible name.
- Flipping no longer changes `learned` (the peek rule is removed for everyone; spec 6.4). The tick/close button on
  the front face stays as it is.
- `CardFlash` never changes `srs` or `learned` itself on rate; it only emits. The screen applies `schedule`.

**Spec:**
- 6.1: "After the card is flipped, the review screen shows four buttons: "Again", "Hard", "Good", "Easy"."
- 6.4: "Flipping a card no longer marks it as not learned."

**Acceptance:**
- Given a `CardFlash` with `browse` and `rating` on, when it mounts, then no "Again"/"Hard"/"Good"/"Easy" button is rendered; after `flip()`, all four are rendered in that order.
- Given `reverse` and `rating` on, when it mounts, then the rating row is hidden; after one `flip()` it is shown.
- Given the card is revealed, when "Good" is clicked, then `rate` is emitted once with `'good'` and no `update:modelValue` is emitted.
- Given the card is not revealed, when `rate('easy')` is called, then it returns `false` and nothing is emitted; once revealed, `rate('easy')` returns `true` and emits `'easy'`.
- Given `rating` off, when the card is flipped, then no rating buttons are rendered.
- Given `browse` on, a learned card and the app online, when the card is flipped, then no `update:modelValue` is emitted (the peek rule is gone).
- Given a `GroupCardFlash` with `rating` on and three cards, when `flipFocused()` then `rateFocused('hard')` are called, then `rate` is emitted with the first card and `'hard'`; `rateFocused('hard')` before any flip returns `false`.

- [ ] **Step 1: Write the failing tests** for each Acceptance case, in `tests/unit/CardFlash.spec.ts` and `tests/unit/GroupCardFlash.spec.ts`

- [ ] **Step 2: Run them to verify they fail**

Run: `npm test`
Expected: FAIL on the assertions (no rating row; the peek case still emits).

- [ ] **Step 3: Write the minimal implementation** to the Interfaces, until they pass

- [ ] **Step 4: Run them to verify they pass**

Run: `npm test`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/CardFlash.vue src/components/GroupCardFlash.vue tests/unit/CardFlash.spec.ts tests/unit/GroupCardFlash.spec.ts
git commit -m "feat(srs): add the rating row to cards and drop the peek rule"
```

---

### Task 3: Rating on the review screen

**Files:**
- Modify: `src/views/View.vue`
- Modify: `src/components/StudyShortcutsDialog.vue`
- Test: `tests/e2e/srs-review.spec.ts`

**Interfaces:**
- Consumes: `schedule`, `Rating`, the `study.shortcuts.rate` key (Task 1); `GroupCardFlash` `rating` prop, `rate` event and `rateFocused` (Task 2);
  `localDate` (existing, from the study-modes plan); `useStudyShortcuts`, the queue, Reset progress and the summary dialog
  (existing, from the study-modes plan)
- Produces: no new exports. Behaviour of `View.vue`:
  - `GroupCardFlash` gets `rating` on.
  - On `rate`, the card's `srs` becomes `schedule(card.srs, rating, localDate())` and `learned` becomes
    `rating !== 'again'`, merged into `cards` by id; then the view moves to the next queued card, or opens the
    summary on the last one.
  - A card rated `again` is appended to the end of the queue once per visit to the screen; rating it `again` a
    second time does not append it again.
  - Shortcut bindings add `'1'` → `rateFocused('again')`, `'2'` → `'hard'`, `'3'` → `'good'`, `'4'` → `'easy'`.
  - Reset progress also removes `srs` from every card.
  - `StudyShortcutsDialog.vue` gets a row "1–4" with "Rate the card (Again, Hard, Good, Easy)", after "Mark as
    not learned".
  - Saving is unchanged (leave guard, `studiedAt`), so `srs` reaches Firestore inside `cards`.

**Spec:**
- 6.1: "The keys 1-4 press them. Rating moves to the next card."
- 6.2: "interval 0 (due today; it comes back at the end of this ... once)."
- 6.3: ""Again" sets learned to false; the other three set it to true."
- 6.9: "Reset progress (4.2) also clears srs."
- 4.1: "Plan 3 adds "Rate the card (Again, Hard, Good, Easy)" for 1-4"

**Tags:** `screen`, `failure-paths`, `security` (only because the plan check matches "session" in the 6.2 line; no auth)

**Acceptance:**
- Given the browser clock fixed at 2026-11-02 10:00 local and a set "Verbs" with cards "uno", "dos", when the person opens it, flips "uno" and clicks "Good", then the top bar reads `1/2` and "dos" is focused.
- Given that rating was saved by leaving to Home, when the set document is read back from the emulator, then card "uno" in `cards` has `srs` `{ due: '2026-11-03', interval: 1, ease: 2.5, reps: 1, lapses: 0 }` and `learned: true`.
- Given "dos" is flipped, when 1 is pressed, then the top bar still reads `1/2`, and "dos" comes back once at the end of the queue; rating it `1` again moves on without adding it a third time.
- Given a card is not flipped yet, when 3 is pressed, then nothing changes.
- Given focus is inside the Reset confirm dialog, when 4 is pressed, then nothing is rated.
- Given a learned card, when it is flipped without rating, then the top bar count does not drop (the peek rule is gone).
- Given rated cards, when Reset progress is confirmed and the set is saved, then no card in the stored `cards` has an `srs` key and the top bar reads `0/2`.
- Given the last queued card is rated "Easy", then the "Session complete" dialog opens.
- Given `?` is pressed, then the "Keyboard shortcuts" dialog also lists "Rate the card (Again, Hard, Good, Easy)".
- Given the review screen with a revealed card, when axe scans the page at desktop and mobile widths, then there are no violations.
- Given the save on leave fails (`context.setOffline(true)` before leaving), then the existing discard confirm is shown, and accepting it reaches `/home`.

- [ ] **Step 1: Write the failing e2e tests** for each Acceptance case, in `tests/e2e/srs-review.spec.ts`, using the account and set helpers in `tests/e2e/helpers.ts` and Playwright's `page.clock`

- [ ] **Step 2: Run them to verify they fail**

Run: `npm run test:e2e`
Expected: the new tests FAIL (no rating row on the review screen); existing suites pass.

- [ ] **Step 3: Write the minimal implementation** in `View.vue` to the Interfaces, until they pass

- [ ] **Step 4: Run them to verify they pass**

Run: `npm run test:e2e`
Expected: PASS

- [ ] **Step 5: Run the type check**

Run: `npm run type-check`
Expected: no errors

- [ ] **Step 6: Commit**

```bash
git add src/views/View.vue src/components/StudyShortcutsDialog.vue tests/e2e/srs-review.spec.ts
git commit -m "feat(srs): rate cards on the review screen"
```

---

### Task 4: Due review across sets, Home banner and per-set count

**Files:**
- Create: `src/views/Due.vue`
- Modify: `src/router/index.ts`
- Modify: `src/views/Home.vue`
- Modify: `src/components/CardFlashSet.vue`
- Test: `tests/unit/router.spec.ts`
- Test: `tests/e2e/due-review.spec.ts`

**Interfaces:**
- Consumes: `dueQueue`, `dueCount`, `setDueCounts`, `schedule`, `DueEntry` and the `due.*`, `empty.due.*` keys (Task 1);
  `CardFlash` `rating` prop, `rate` event, `flip()` and `rate()` (Task 2); `localDate` and `useStudyShortcuts`
  (existing, from the study-modes plan); `StudySummaryDialog` (existing, from the study-modes plan); existing
  `library.saveSet`, `ContainerEmpty`, `BarTop`, the `unsavedChanges` flag in `useSessionStore()` (`src/stores/session.ts`)
- Produces:

| Route | Name | Component | Meta |
|---|---|---|---|
| `/due` | `due` | `@/views/Due.vue` (lazy) | `requireAuth: true` |

- `Due.vue` builds its queue once with `dueQueue(library.sets, localDate())` when the library is ready, keeps a
  working copy of each set it touches, and shows one `CardFlash` at a time (with `browse` and `rating` on) in that
  card's set colour, with the set title above it. Rating applies `schedule` and `learned` as on the review screen,
  re-queues an `again` card once, and moves on. Space flips; 1–4 rate.
- Leaving `/due` saves every touched set with `studiedAt: new Date()` through `library.saveSet`, one after another;
  if any save fails, the screen asks the existing `view.discard-confirm` question. `unsavedChanges` is true while a
  touched set is unsaved.
- When the queue is empty at the start, the screen shows "Nothing due" and "You're all caught up. Come back
  tomorrow."
- When the last entry is rated, the study-modes `StudySummaryDialog` opens. `Due.vue` computes its numbers over
  its `DueEntry` list (set id + card id, so equal card ids in two sets never mix): `total` = entries reviewed,
  `known` = those now `learned`, `missed` = the rest. "Review {missed} missed" restarts with the missed entries in
  the same order; "Back to home" leaves through the leave guard.
- `Home.vue` shows, above the set grid, "{n} cards due" (plural form, rule 2.9) with a "Study now" button (to
  `/due`) when `dueCount(library.sets, localDate())` is above 0.
- `CardFlashSet.vue`, for a set not in the bin, shows "{n} due" and "{m} new" from `setDueCounts(set, localDate())`,
  each hidden at 0.

**Spec:**
- 6.6: "Home shows "{n} cards due" with a "Study now" button when that queue is not empty, where {n} is the queue's length."
- 6.6: "Study now" opens /due, which reviews that queue."
- 6.6: "Each set touched is saved when the session ends, through the same leave-guard rules as the review screen."
- 6.6: "When the queue runs out, the session summary of 4.4 shows."
- 6.7: "With nothing due, /due shows title "Nothing due", subtitle "You're all caught up. Come back tomorrow.""
- 6.8: "Each set card on Home shows "{n} due" for its started cards that are due, and "{m} new" for its cards never studied, each hidden at 0."
- 6.8: "These count the whole set, so they can add up to more than the Home banner, which caps new cards at 20."
- 2.9: "the singular is the same sentence with the singular noun ("1 card due"

**Tags:** `screen`, `failure-paths`, `security` (only because the plan check matches "session" in the 6.6 line; the route is `requireAuth` like every other, no new auth)

**Acceptance:**
- Given the router, when `/due` is resolved signed out, then `authRedirect` sends it to `/login?redirect=/due`; signed in it is let through (`tests/unit/router.spec.ts`).
- Given the clock fixed at 2026-11-02 and a new set "Verbs" with 2 cards, when Home loads, then it shows "2 cards due" and "Study now", and the "Verbs" set card shows "2 new" and no "due" count.
- Given a new set with 1 card, then Home shows "1 card due" and the set card shows "1 new".
- Given every card was rated "Good" today, when Home loads, then no "cards due" banner is shown and the set card shows neither a "due" nor a "new" count.
- Given the clock then moves to 2026-11-03 and the page reloads, then Home shows "2 cards due" again and the set card shows "2 due".
- Given one card rated "Good" on 2026-11-02 and one card never studied, with the clock at 2026-11-03, then the set card shows "1 due" and "1 new".
- Given a new set with 100 cards, then the set card shows "100 new" while the Home banner says "20 cards due".
- Given sets "Alpha" (1 card) and "Beta" (1 card), when "Study now" is pressed, then the URL is `/due`, the "Alpha" card is shown first with "ALPHA" above it; flipping and pressing 3 shows the "Beta" card.
- Given both cards are rated "Good", then the "Session complete" dialog shows "You knew 2 of 2 cards." with no "Review … missed" button; "Back to home" saves both sets, and after a reload Home shows no banner.
- Given one card on `/due` rated "Again" twice (it comes back once) and it is the only entry, then the summary shows "You knew 0 of 1 card." and "Review 1 missed"; pressing it shows that card again.
- Given a set in the bin with due cards and no other sets, then Home shows no banner and `/due` shows "Nothing due".
- Given a card is rated on `/due` and the save fails on leave (`context.setOffline(true)`), then the discard confirm is shown; dismissing it keeps the person on `/due`.
- Given `/due` with a revealed card, `/due` with the summary open, and Home with the banner, when axe scans each at desktop and mobile widths, then there are no violations.

- [ ] **Step 1: Write the failing tests** for each Acceptance case, in `tests/unit/router.spec.ts` and `tests/e2e/due-review.spec.ts`

- [ ] **Step 2: Run the unit tests to verify they fail**

Run: `npm test`
Expected: the new router case FAILS (`/due` falls through to the catch-all).

- [ ] **Step 3: Run the e2e tests to verify they fail**

Run: `npm run test:e2e`
Expected: the new tests FAIL (no banner, no `/due` screen).

- [ ] **Step 4: Add the route and build `Due.vue`** to the Interfaces

- [ ] **Step 5: Add the Home banner and the per-set count**, until the tests pass

- [ ] **Step 6: Run the unit tests to verify they pass**

Run: `npm test`
Expected: PASS

- [ ] **Step 7: Run the e2e tests to verify they pass**

Run: `npm run test:e2e`
Expected: PASS

- [ ] **Step 8: Run the linter**

Run: `npm run lint`
Expected: no errors

- [ ] **Step 9: Commit**

```bash
git add src/views/Due.vue src/router/index.ts src/views/Home.vue src/components/CardFlashSet.vue tests/unit/router.spec.ts tests/e2e/due-review.spec.ts
git commit -m "feat(srs): add the due review, Home banner and per-set due count"
```
