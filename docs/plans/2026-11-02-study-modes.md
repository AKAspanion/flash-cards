# Study Modes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: the project's workflow policy names the executor (`run.executor`): ga:implement-with-subagents by default, or ga:implement. Follow the policy and this plan's Checkpoints. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the review screen faster to study with: keyboard shortcuts, shuffle / unlearned-only / back-first
options, reset progress and an end-of-session summary, and record when each set was last studied.

**Architecture:** The order and filtering of a review live in a pure module (`src/utils/studyQueue.ts`) that
returns card ids; `View.vue` keeps the set's full card list as the source of truth and shows the cards in queue
order. Key handling is one composable (`useStudyShortcuts`) that every later plan adds bindings to. The card
mapper starts preserving unknown card fields so later plans can add card data safely.

**Tech Stack:** Vue 3 (`<script setup>`, TypeScript), Vuetify 4, Pinia, vue-i18n (en, hi), Firebase 13 Firestore,
Vitest (jsdom) for unit tests, Playwright + axe against the Firebase emulators for e2e, GitHub Actions CI
(`.github/workflows/ci.yml`).

**Spec:** `docs/specs/2026-11-02-usability-features.md` (sections 2, 3.1, 3.2, 4 and 13)

## Global Constraints

- 2.1: "Every new user-facing string is added to both `src/locales/en.json` and `src/locales/hi.json`." English copy is the spec's, word for word; the PR lists the Hindi strings for a Hindi reader.
- 2.2: "The Firestore schema stays readable by the version of the app that is live today."
- 2.4: "Every screen keeps working at 390 px wide and passes the existing axe scan in `tests/e2e/a11y.spec.ts`."
- 2.9: "Every string with a count uses vue-i18n plural forms, singular | plural."
- 2.5: "Keyboard shortcuts never fire while a text field, textarea or dialog has focus, or while Ctrl, Alt or Meta is held."
- 2.7: Unit tests are Vitest in `tests/unit/<name>.spec.ts`; e2e tests are Playwright in `tests/e2e/<flow>.spec.ts`, run with `npm run test:e2e`.
- `learned` stays correct on every card, because the live app reads only `learned` (spec 3.2).
- The cross-plan contracts in spec section 13 are used with exactly the names and signatures given there.

## Checkpoints

None. The policy's `run.checkpoints` is `none`. Task 4 carries a `security` tag only because the plan check matches the word "session" in the spec lines it quotes and the "Session complete" copy; it adds no stop.

---

### Task 1: Data and copy foundation

**Files:**
- Modify: `src/types.ts`
- Modify: `src/services/cardSetMapper.ts`
- Create: `src/utils/dates.ts`
- Modify: `src/stores/prefs.ts`
- Modify: `src/locales/en.json`
- Modify: `src/locales/hi.json`
- Modify: `package.json`
- Modify: `pnpm-lock.yaml`
- Test: `tests/unit/cardSetMapper.spec.ts`
- Test: `tests/unit/dates.spec.ts`
- Test: `tests/unit/prefs.spec.ts`

**Interfaces:**
- Consumes: existing `cardSetFromDoc`, `cardSetToDoc`, `usePrefsStore`
- Produces (spec 13):

```ts
// src/types.ts
export interface CardSet {
  // …existing fields
  /** When a review of this set last saved. */
  studiedAt?: Date;
}

// src/utils/dates.ts
export function localDate(date?: Date): string;            // 'YYYY-MM-DD' in the device's time zone
export function addDays(day: string, days: number): string; // 'YYYY-MM-DD' ± days

// src/stores/prefs.ts — added to the returned refs
studyShuffle: Ref<boolean>;        // localStorage 'study-shuffle'
studyUnlearnedOnly: Ref<boolean>;  // localStorage 'study-unlearned-only'
studyReverse: Ref<boolean>;        // localStorage 'study-reverse'
```

- Mapper behaviour: `parseCards` starts from every stored key of a card object, then normalises the five known
  fields as today. `cardSetFromDoc` maps a stored `studiedAt` Timestamp (or `{ seconds }`) to a `Date`, and leaves
  `studiedAt` undefined when the field is missing or unreadable. `cardSetToDoc` writes `studiedAt` as a Timestamp
  only when the set has one; the key is absent otherwise (Firestore rejects `undefined` values).
- Dev dependency: `@vue/test-utils` (current 2.x) for the component tests in Task 3.
- Locale keys (English values word for word; Hindi written by the implementer). The summary dialog's keys are
  added in Task 4, which is the only task that uses them:

| Key | English |
|---|---|
| `study.options` | Study options |
| `study.shuffle` | Shuffle |
| `study.unlearned-only` | Unlearned only |
| `study.reverse` | Back first |
| `study.reset` | Reset progress |
| `study.reset-confirm` | Reset progress for this set? All cards will be marked as not learned. |
| `study.reset-action` | Reset |
| `study.shortcuts.title` | Keyboard shortcuts |
| `study.shortcuts.flip` | Flip the card |
| `study.shortcuts.next` | Next card |
| `study.shortcuts.prev` | Previous card |
| `study.shortcuts.learn` | Mark as learned |
| `study.shortcuts.unlearn` | Mark as not learned |
| `study.shortcuts.help` | Show keyboard shortcuts |
| `empty.study.title` | All cards learned |
| `empty.study.subtitle` | Turn off “Unlearned only” or reset progress to study again. |

**Spec:**
- 3.1: "`parseCards` keeps every field of a stored card, including ones this version does not know, so a newer version's fields are not lost when an older version saves."
- 3.2: "`studiedAt` | Timestamp, optional"
- 4.1: "The list is a dialog titled "Keyboard shortcuts" with one row per key: "Flip the card", "Next card", "Previous card", "Mark as learned", "Mark as not learned", "Show keyboard shortcuts"."
- 4.2: "The three toggles are remembered on this device (localStorage keys `study-shuffle`, `study-unlearned-only`, `study-reverse`)."
- 13: "export function localDate(date?: Date): string;"
- 13: "export function addDays(day: string, days: number): string;"

**Acceptance:**
- Given a stored card `{ id: 'a', front: 'f', back: 'b', learned: true, date: '2026-01-01T00:00:00.000Z', srs: { due: '2026-11-05', interval: 3, ease: 2.5, reps: 2, lapses: 0 } }`, when the set is read and written back with `cardSetToDoc`, then the written `cards` string still contains the `srs` object unchanged.
- Given a stored card with `front: 5` and an extra key `note: 'x'`, when it is read, then `front` is `''` and `note` is `'x'`.
- Given a set document with `studiedAt` as a Timestamp for 2026-10-30T10:00:00Z, when it is read, then `studiedAt` is a `Date` with that instant.
- Given a set document with no `studiedAt`, or `studiedAt: 'garbage'`, when it is read, then `studiedAt` is `undefined`.
- Given a set with no `studiedAt`, when `cardSetToDoc` runs, then the output has no `studiedAt` key; given one with `studiedAt`, then the output's `studiedAt` is a Timestamp of that instant.
- The existing "writes the original schema and never stores docId" case still passes unchanged.
- Given 2026-11-02 at 23:30 local time, when `localDate` runs, then it returns `'2026-11-02'` (not the UTC date).
- Given `'2026-02-28'`, when `addDays(…, 1)` runs, then it returns `'2026-03-01'`; `addDays('2026-01-01', -1)` returns `'2025-12-31'`; `addDays('2026-03-28', 2)` returns `'2026-03-30'` across a daylight-saving change in a DST time zone.
- Given empty localStorage, when the prefs store loads, then `studyShuffle`, `studyUnlearnedOnly` and `studyReverse` are all `false`.
- Given localStorage `study-shuffle` = `'true'`, when the store loads, then `studyShuffle` is `true`; when `studyReverse` is set to `true`, then localStorage `study-reverse` becomes `'true'`.
- The existing `tests/unit/locales.spec.ts` passes: English and Hindi define the same keys, including every key in the table above.

- [ ] **Step 1: Write the failing tests** for each Acceptance case, in `tests/unit/cardSetMapper.spec.ts`, `tests/unit/dates.spec.ts` and `tests/unit/prefs.spec.ts`

- [ ] **Step 2: Run them to verify they fail**

Run: `npm test`
Expected: FAIL on the new assertions. Create `src/utils/dates.ts` with the two exported signatures first, so the
tests fail on behaviour rather than on a missing module.

- [ ] **Step 3: Install the dev dependency**

Run: `pnpm add -D @vue/test-utils@^2`

- [ ] **Step 4: Write the minimal implementation** to the Interfaces (types, mapper, dates, prefs, both locale files), until the tests pass

- [ ] **Step 5: Run them to verify they pass**

Run: `npm test`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/types.ts src/services/cardSetMapper.ts src/utils/dates.ts src/stores/prefs.ts src/locales/en.json src/locales/hi.json package.json pnpm-lock.yaml tests/unit/cardSetMapper.spec.ts tests/unit/dates.spec.ts tests/unit/prefs.spec.ts
git commit -m "feat(study): keep unknown card fields, add studiedAt, dates and study prefs"
```

---

### Task 2: Study queue and keyboard shortcuts

**Files:**
- Create: `src/utils/studyQueue.ts`
- Create: `src/composables/useStudyShortcuts.ts`
- Test: `tests/unit/studyQueue.spec.ts`
- Test: `tests/unit/useStudyShortcuts.spec.ts`

**Interfaces:**
- Consumes: existing `FlashCard` from `src/types.ts`
- Produces (spec 13, exactly):

```ts
// src/utils/studyQueue.ts
export interface StudyOptions { shuffle: boolean; unlearnedOnly: boolean }
export function buildQueue(cards: FlashCard[], options: StudyOptions, random?: () => number): string[]; // card ids
export function summarize(cards: FlashCard[], queue: string[]): { known: number; total: number; missed: string[] };

// src/composables/useStudyShortcuts.ts
// Keys are KeyboardEvent.key values (' ', 'ArrowRight', 'k', '?', '1', 'r', …). Rule 2.5 applies.
export function useStudyShortcuts(bindings: () => Record<string, () => void>): void;
```

- `buildQueue` keeps set order unless `shuffle` is on; shuffling is a Fisher–Yates pass driven by `random`
  (default `Math.random`), so a fixed `random` gives a fixed order. `unlearnedOnly` drops cards whose `learned` is
  true.
- `summarize` counts only the cards whose ids are in `queue`: `known` = learned ones, `total` = queue length,
  `missed` = ids of the not-learned ones, in queue order. Ids in `queue` with no matching card are ignored.
- `useStudyShortcuts` adds one `keydown` listener on `window` when called and removes it when the calling effect
  scope (component) is disposed (`onScopeDispose`). It reads `bindings()` on every key press, so bindings can depend
  on reactive state. A handled key calls `preventDefault()` (Space must not scroll the page). It ignores the event
  when Ctrl, Alt or Meta is held, when the event target is an `input`, `textarea`, `select` or contenteditable
  element, or when the target is inside an element with `role="dialog"`. Shift is allowed (`?` needs it).

**Spec:**
- 2.5: "Keyboard shortcuts never fire while a text field, textarea or dialog has focus, or while Ctrl, Alt or Meta is held."
- 4.2: "cards in random order. Off by default."
- 4.2: "only cards not marked learned. Off by default."

**Acceptance:**
- Given cards a (learned), b, c (learned), d, when `buildQueue` runs with `{ shuffle: false, unlearnedOnly: false }`, then it returns `['a','b','c','d']`.
- Given the same cards and `{ shuffle: false, unlearnedOnly: true }`, then it returns `['b','d']`.
- Given the same cards, `{ shuffle: true, unlearnedOnly: false }` and a `random` that always returns `0`, then the result is a permutation of all four ids, the same on every call, and different from set order.
- Given every card learned and `unlearnedOnly: true`, then it returns `[]`.
- Given no cards, then `buildQueue` returns `[]` and `summarize(cards, [])` returns `{ known: 0, total: 0, missed: [] }`.
- Given cards a (learned), b, c and queue `['c','a','b']`, when `summarize` runs, then it returns `{ known: 1, total: 3, missed: ['c','b'] }`.
- Given queue `['a','zzz']` where `zzz` is no card's id, then `total` is `1`.
- Given bindings `{ 'k': spy }` set up inside an `effectScope`, when a `keydown` with `key: 'k'` is dispatched on `window`, then `spy` is called once and the event's `defaultPrevented` is `true`.
- Given the same binding, when the key is pressed with `ctrlKey`, `altKey` or `metaKey` set, then `spy` is not called.
- Given the same binding, when the event's target is an `<input>`, a `<textarea>`, or a button inside `<div role="dialog">`, then `spy` is not called.
- Given a binding for `'?'`, when `?` is pressed with `shiftKey: true`, then it is called.
- Given a key with no binding (`'x'`), when it is pressed, then `defaultPrevented` stays `false`.
- Given bindings that read a ref, when the ref changes between two key presses, then the second press calls the new binding.
- Given the scope is stopped, when `k` is pressed again, then `spy` is not called.

- [ ] **Step 1: Write the failing tests** for each Acceptance case, in `tests/unit/studyQueue.spec.ts` and `tests/unit/useStudyShortcuts.spec.ts`

- [ ] **Step 2: Run them to verify they fail**

Run: `npm test`
Expected: FAIL on the assertions. Create both modules with their exported signatures first.

- [ ] **Step 3: Write the minimal implementation** to the Interfaces, until they pass

- [ ] **Step 4: Run them to verify they pass**

Run: `npm test`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/utils/studyQueue.ts src/composables/useStudyShortcuts.ts tests/unit/studyQueue.spec.ts tests/unit/useStudyShortcuts.spec.ts
git commit -m "feat(study): add study queue and keyboard shortcut composable"
```

---

### Task 3: Card components can be driven from outside

**Files:**
- Modify: `src/components/CardFlash.vue`
- Modify: `src/components/GroupCardFlash.vue`
- Test: `tests/unit/GroupCardFlash.spec.ts`

**Interfaces:**
- Consumes: `@vue/test-utils` dev dependency (Task 1)
- Produces (spec 13):

```ts
// CardFlash.vue
props: { reverse?: boolean }   // default false; true = the card starts showing its back
defineExpose({ flip(): void }) // same as pressing the flip button, peek rule included

// GroupCardFlash.vue
props: { reverse?: boolean }   // passed to every CardFlash
defineExpose({
  next(): void;              // scroll one card forward (no-op on the last)
  prev(): void;              // scroll one card back (no-op on the first)
  goTo(index: number): void; // scroll to that card, clamped to the list
  flipFocused(): void;       // flip() on the focused card
});
// existing `focused` event keeps firing with the index after any of these moves
```

- `GroupCardFlash` already exposes `scrollToCard(index)` (centres a card; `Add.vue` calls it after inserting a card).
  Keep it exposed and unchanged; `goTo` clamps the index and calls it.
- `reverse` only changes which face is shown first; the front face still shows `front` text and the back face
  `back` text. When `reverse` changes, each card resets to its starting face.
- The existing peek rule stays: in browse mode, flipping a learned card while the app is online marks it not
  learned (spec 4.5), whichever face it started on.

**Spec:**
- 4.2: "each card starts on its back side. Off by default."
- 4.5: "Peeking at the answer marks the card as not yet learned"
- 13: "GroupCardFlash (plan 1) exposes next(), prev(), goTo(index: number) and flipFocused(); CardFlash takes a reverse prop and exposes flip()."

**Acceptance:**
- Given a `GroupCardFlash` mounted with three cards (Vuetify plugin installed in the test), when `flipFocused()` is called, then the first card's inner element has the `flash-card__inner--flipped` class and the others do not.
- Given `reverse: true`, when it mounts, then every card's inner element has `flash-card__inner--flipped`; when `flipFocused()` is called, then the first card's inner element no longer has it.
- Given `reverse` changes from `false` to `true` after a card was flipped, then every card shows its back (all have the flipped class).
- Given `browse: true`, a learned first card and the app online, when `flipFocused()` is called, then `update:modelValue` is emitted with that card's `learned` set to `false`.
- Given the container's `scrollBy` and `scrollTo` are stubbed, when `next()` is called, then `scrollBy` is called with `left` equal to one item width; when `prev()` is called on the first card, then nothing scrolls; when `goTo(5)` is called with three cards, then it scrolls to the third card's offset.
- Given the container is scrolled to the second card, when the `scroll` event fires, then `focused` is emitted with `1` (existing behaviour, kept).

- [ ] **Step 1: Write the failing tests** for each Acceptance case, in `tests/unit/GroupCardFlash.spec.ts`

- [ ] **Step 2: Run them to verify they fail**

Run: `npm test`
Expected: FAIL on the assertions (the exposed methods and `reverse` prop don't exist yet).

- [ ] **Step 3: Write the minimal implementation** to the Interfaces, until they pass

- [ ] **Step 4: Run them to verify they pass**

Run: `npm test`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/CardFlash.vue src/components/GroupCardFlash.vue tests/unit/GroupCardFlash.spec.ts
git commit -m "feat(study): let the review screen drive card flips and navigation"
```

---

### Task 4: Review screen — options, shortcuts, reset and summary

**Files:**
- Modify: `src/views/View.vue`
- Create: `src/components/StudyShortcutsDialog.vue`
- Create: `src/components/StudySummaryDialog.vue`
- Modify: `src/locales/en.json`
- Modify: `src/locales/hi.json`
- Test: `tests/e2e/study-modes.spec.ts`

**Interfaces:**
- Consumes: `studyShuffle`, `studyUnlearnedOnly`, `studyReverse` prefs, `CardSet.studiedAt` and the locale keys (Task 1); `buildQueue`, `summarize`, `useStudyShortcuts` (Task 2); `GroupCardFlash` `reverse` prop and `next`/`prev`/`goTo`/`flipFocused` (Task 3); existing `OptionPanel`, `ContainerEmpty`, `library.saveSet`
- Produces:

```ts
// StudyShortcutsDialog.vue
props: { modelValue: boolean }           // v-model open state
// lists: Space, →, ←, K, J, ? with the study.shortcuts.* descriptions

// StudySummaryDialog.vue
props: { modelValue: boolean; known: number; total: number; missed: number }
emits: { 'update:modelValue': [open: boolean]; 'review-missed': []; home: [] }
```

- Locale keys added here (English word for word; Hindi by the implementer):

| Key | English |
|---|---|
| `study.summary.title` | Session complete |
| `study.summary.result` | You knew {known} of {total} card. \| You knew {known} of {total} cards. (plural chosen by `total`) |
| `study.summary.review-missed` | Review {missed} missed |
| `study.summary.home` | Back to home |

- `View.vue` keeps `cards` (the whole set, the thing it saves) and a `queue` of card ids from `buildQueue`. It
  passes `GroupCardFlash` the queued cards in queue order and merges each update back into `cards` by id. The queue
  is rebuilt (and the view goes to card 1) when the set loads, when Shuffle or Unlearned only changes, after Reset,
  and after Review missed; marking a card during a session never removes it from the queue.
- The top-bar count stays `learned/total` over all of `cards` (spec 4.7).
- An `OptionPanel` titled "Study options" holds switches for Shuffle, Unlearned only and Back first (bound to the
  prefs), a "Reset progress" button that opens a confirm dialog, and a "Keyboard shortcuts" button.
- Bindings: `' '` → `flipFocused()`; `'ArrowRight'` → `next()`; `'ArrowLeft'` → `prev()`; `'k'`/`'K'` → set the
  focused card's `learned` to true, then `next()` (or open the summary on the last card); `'j'`/`'J'` → set it to
  false; `'?'` → open the shortcuts dialog.
- The summary opens when the last queued card is marked learned (tick button or K) or when Done is pressed on it.
  Done no longer leaves the page; "Back to home" does, through the existing leave guard.
- `saveProgress` saves `{ ...set, cards, studiedAt: new Date() }`. A failed save keeps today's behaviour (error
  snack from the store, then the existing discard confirm on leave).

**Spec:**
- 4.1: "Space flips the card. Right arrow goes to the next card and Left arrow to the previous one. K marks the card as learned and J as not learned. ? opens the list of shortcuts."
- 4.1: "K and J set the value; they do not toggle it. After K, the screen moves to the next card, as the tick button does today."
- 4.1: "The list is a dialog titled "Keyboard shortcuts" with one row per key: "Flip the card", "Next card", "Previous card", "Mark as learned", "Mark as not learned", "Show keyboard shortcuts"."
- 2.9: "the singular is the same sentence with the singular noun ("1 card due", "Matches in 1 card", "1 line skipped (no back side): line 4", "Restored 1 set.", "You knew 1 of 1 card.")."
- 4.2: "Reset progress": asks "Reset progress for this set? All cards will be marked as not learned.", buttons "Cancel" and "Reset"."
- 4.2: "Keyboard shortcuts": opens the same list as ?."
- 4.3: "Unlearned only with nothing to show: title "All cards learned", subtitle "Turn off “Unlearned only” or reset progress to study again.""
- 4.4: "When the person marks the last card in the queue, or presses Done on it, a dialog shows "Session complete" and "You knew {known} of {total} cards." with buttons "Review {missed} missed" (hidden when nothing was missed) and "Back to home"."
- 4.4: "Review missed" restarts the session with only the cards not learned, in the same order."
- 4.6: "Saving a review session also sets the set's studiedAt to now."
- 4.7: "Progress counts in the top bar (learned/total) always count the whole set, not the filtered queue."

**Tags:** `screen`, `failure-paths`, `security` (the plan check counts the word in the "Session complete" copy; nothing here touches auth)

**Acceptance:**
- Given a set with cards "uno", "dos", "tres", when the person opens it and presses Space, then the first card shows its back; pressing Right arrow shows card 2; Left arrow shows card 1 again.
- Given card 1 is focused, when K is pressed, then the top bar reads `1/3` and card 2 is focused; pressing K again on card 2 then J on card 3 leaves the count at `2/3` (J on an unlearned card keeps it unlearned).
- Given focus is in the Reset confirm dialog, when K is pressed, then the count does not change.
- Given `?` is pressed, then a dialog titled "Keyboard shortcuts" lists "Flip the card", "Next card", "Previous card", "Mark as learned", "Mark as not learned" and "Show keyboard shortcuts"; the "Keyboard shortcuts" button in Study options opens the same dialog.
- Given cards 1 and 3 are learned, when Unlearned only is switched on, then only "dos" is shown and the top bar still reads `2/3`.
- Given every card is learned and Unlearned only is on, then the page shows "All cards learned" and "Turn off “Unlearned only” or reset progress to study again."
- Given Back first is switched on, then the focused card shows its back text first; after a page reload the switch is still on.
- Given Shuffle is switched on and the page reloads, then the Shuffle switch is still on and all three cards are still in the queue.
- Given two cards are learned, when Reset progress is pressed, then the dialog says "Reset progress for this set? All cards will be marked as not learned."; Cancel leaves `2/3`; Reset makes it `0/3`, and after going Home and back the count is still `0/3`.
- Given a three-card session where cards 1 and 3 are marked learned with K and card 2 is skipped with Right arrow, when Done is pressed on card 3 (or K on card 3), then a dialog shows "Session complete" and "You knew 2 of 3 cards." and a "Review 1 missed" button.
- Given a one-card set whose card is marked learned with K, then the summary says "You knew 1 of 1 card."
- Given that dialog, when "Review 1 missed" is pressed, then the queue is only "dos" and card 1 is focused; when every card was known, then the dialog has no "Review … missed" button.
- Given the summary, when "Back to home" is pressed, then the app is on `/home` and the set card shows the saved count.
- Given the session saved, when the set document is read back from the emulator, then it has a `studiedAt` within the last minute.
- Given the review screen with the Study options panel open, and again with the summary dialog open, when axe scans the page, then there are no violations; the same holds at the mobile project's width.
- Given the save on leave fails (Firestore emulator write blocked by going offline with `context.setOffline(true)` before leaving), then the existing discard confirm is shown and accepting it reaches `/home`.

- [ ] **Step 1: Write the failing e2e tests** for each Acceptance case, in `tests/e2e/study-modes.spec.ts`, using the account and set helpers in `tests/e2e/helpers.ts` and the axe check pattern from `tests/e2e/a11y.spec.ts`

- [ ] **Step 2: Run them to verify they fail**

Run: `npm run test:e2e`
Expected: the new tests FAIL on the missing controls and copy; the existing suites still pass.

- [ ] **Step 3: Build the two dialog components** to the Interfaces

- [ ] **Step 4: Wire the queue, options panel, shortcuts, reset, summary and `studiedAt` into `View.vue`**, until the tests pass

- [ ] **Step 5: Run them to verify they pass**

Run: `npm run test:e2e`
Expected: PASS

- [ ] **Step 6: Run the end checks**

Run: `npm run type-check`
Expected: no errors

- [ ] **Step 7: Run the linter**

Run: `npm run lint`
Expected: no errors

- [ ] **Step 8: Commit**

```bash
git add src/views/View.vue src/components/StudyShortcutsDialog.vue src/components/StudySummaryDialog.vue src/locales/en.json src/locales/hi.json tests/e2e/study-modes.spec.ts
git commit -m "feat(study): add study options, shortcuts, reset and session summary"
```
