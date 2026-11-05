# Library Search and Sort Implementation Plan

**Status:** complete

> **For agentic workers:** REQUIRED SUB-SKILL: the project's workflow policy names the executor (`run.executor`): ga:implement-with-subagents by default, or ga:implement. Follow the policy and this plan's Checkpoints. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Find sets by what is on their cards, sort them by progress or by when they were last studied, and show on each set when it was last studied.

**Architecture:** Matching, sorting and the relative-time text are pure functions in `src/utils/` with unit tests. `filterAndSortSets` gains card-text search and two orders; `SetOrder` and `SET_ORDERS` gain two values, so the stored preference accepts them. Settings lists the new orders, and the Home set card shows the card-match count and the "Studied …" line.

**Tech Stack:** Vue 3 (`<script setup>`, TypeScript), Vuetify 4, Pinia, vue-i18n (en, hi), `Intl.RelativeTimeFormat`, Vitest (jsdom), Playwright against the Auth/Firestore emulators, GitHub Actions CI (`.github/workflows/ci.yml`).

**Spec:** `docs/specs/2026-11-02-usability-features.md` (§2, §7)

## Global Constraints

- Depends on the study-modes plan (`docs/plans/2026-11-02-study-modes.md`) being merged: it adds `CardSet.studiedAt?: Date` and writes it when a review session saves.
- §2.1: "Every new user-facing string is added to both `src/locales/en.json` and `src/locales/hi.json`." The English copy is the spec's, word for word; the PR lists the Hindi strings for a Hindi reader to check.
- §2.4: "Every screen keeps working at 390 px wide and passes the existing axe scan in `tests/e2e/a11y.spec.ts`."
- §2.7: unit tests in `tests/unit/<name>.spec.ts` (Vitest); end-to-end tests in `tests/e2e/<flow>.spec.ts` (Playwright, emulators, `npm run test:e2e`).
- §2.9: "Every string with a count uses vue-i18n plural forms, singular | plural." Locale values below are written `singular | plural`, and the code passes the count (`t(key, { n }, n)`).
- Stored order values already in people's browsers (`Alphabetically`, `New first`, `Old first`) keep working unchanged.
- E2E tests that read or seed the emulators directly use the ports in `DEV_PORTS` (`dev-ports.ts`); never a literal port. Amended 2026-11-05.
- The spaced-repetition plan is merged (#42): `CardFlashSet.vue` already shows "{n} due" and "{m} new" in its lower half, and `dueQueue` in `src/utils/srs.ts` sorts by `title.localeCompare` on its own, so changing `filterAndSortSets` doesn't move it. Amended 2026-11-05.

## Checkpoints

None: the policy's `run.checkpoints` is `none`, and no task here is tagged `security`.

---

### Task 1: Card search, new orders, relative time and the copy

**Files:**
- Modify: `src/types.ts` (`SetOrder`)
- Modify: `src/utils/cardSets.ts`
- Create: `src/utils/relativeTime.ts`
- Modify: `src/locales/en.json`
- Modify: `src/locales/hi.json`
- Test: `tests/unit/cardSets.spec.ts`
- Test: `tests/unit/relativeTime.spec.ts`
- Test: `tests/unit/prefs.spec.ts`

**Interfaces:**
- Consumes: `CardSet.studiedAt?: Date` (existing, from the study-modes plan); existing `filterAndSortSets`, `SET_ORDERS`, `isSetOrder`, `learnedCount` (`src/utils/cardSets.ts`), existing `usePrefsStore().setOrder`.
- Produces (Tasks 2 and 3 rely on these):

```ts
// src/types.ts
export type SetOrder = 'Alphabetically' | 'New first' | 'Old first' | 'Progress' | 'Recently studied';

// src/utils/cardSets.ts
export const SET_ORDERS: SetOrder[]; // the five values above, in that order
export function titleMatches(set: CardSet, search: string): boolean;
export function cardMatchCount(set: CardSet, search: string): number; // cards whose front or back contains search
export function learnedPercent(set: CardSet): number;                // 0 for a set with no cards
// filterAndSortSets(sets, filter) keeps its signature; a set is kept when titleMatches or cardMatchCount > 0

// src/utils/relativeTime.ts
export function relativeTime(date: Date, now: Date, locale: string): string; // Intl.RelativeTimeFormat, numeric: 'auto'
```

`relativeTime` picks the largest unit that fits: seconds under a minute, then minutes, hours, days (under 30), months (under 12), years, rounding toward zero, and formats it with `Intl.RelativeTimeFormat(locale, { numeric: 'auto' })`.

Search, in every function above, trims the text and compares lower-cased (`toLocaleLowerCase`); an empty search matches every set and gives a card-match count of 0.

New locale keys, en copy (add every one to `hi.json` too):

| Key | English |
|---|---|
| `settings.order-items.progress` | Least learned first |
| `settings.order-items.rs` | Recently studied |
| `home.set.matches` | Matches in 1 card \| Matches in {n} cards |
| `home.set.studied` | Studied {time} |
| `home.set.not-studied` | Not studied yet |

**Spec:**
- §7.1: "Search matches a set when the text appears in its title or in any card's front or back, ignoring case."
- §7.3: "New sort orders in Settings: "Least learned first" (by learned percentage, lowest first; ties by title) and "Recently studied" (by `studiedAt`, newest first; never-studied sets last, by title). Stored values `Progress` and `Recently studied`."
- §7.4: "Each set card shows "Studied {relative time}", for example "Studied 3 days ago", or "Not studied yet"."

**Acceptance:**
- Given sets `Spanish` (cards `hablar`/`to speak`) and `Chemistry` (cards `Fe`/`Iron`), searching `SPEAK` keeps only `Spanish`; searching `iron` keeps only `Chemistry`; searching `chem` keeps only `Chemistry`.
- Given search `  speak  ` (surrounding spaces), the result is the same as `speak`.
- Given an empty search, every set not in the bin is kept, and a set in the bin is never kept even when its cards match.
- Given `cardMatchCount` with search `a` on cards `a`/`b`, `x`/`A`, `x`/`y`, it returns 2 (a card counts once even when both sides match).
- Given order `Progress` and sets at 50%, 0% (`Beta`), 0% (`Alpha`) and a set with no cards (`Empty`), the order is `Alpha`, `Beta`, `Empty`, then the 50% set (`Empty` counts as 0%, ties by title).
- Given order `Recently studied` and sets studied 2026-11-01, 2026-10-01 and two never studied (`Zed`, `Abc`), the order is the 2026-11-01 set, the 2026-10-01 set, `Abc`, `Zed`.
- Given `favOnTop` with either new order, favourites still come first, and each group keeps that order.
- Given `isSetOrder('Progress')` and `isSetOrder('Recently studied')`, both are true; `isSetOrder('Newest')` is false.
- Given localStorage `card-set-order` = `Recently studied`, the prefs store starts with that order; given `Bogus`, it falls back to `Alphabetically`.
- Given `relativeTime` with now 2026-11-02 12:00 and a date 3 days earlier, in `en` it returns `3 days ago`; one day earlier, `yesterday`; 30 seconds earlier, `30 seconds ago`; 2 hours earlier, `2 hours ago`; 45 days earlier, `last month`; 400 days earlier, `last year`.
- Given the same 3-day case in `hi`, it returns the text `Intl.RelativeTimeFormat('hi', { numeric: 'auto' })` gives for -3 days.
- Given a date in the future (device clock skew), it returns the `en` text for 0 seconds, `now`.
- Given `t('home.set.matches', { n: 1 }, 1)`, the English text is `Matches in 1 card`; with 4 it is `Matches in 4 cards`.
- Every new key exists in both locale files (`tests/unit/locales.spec.ts` passes unchanged).

- [x] **Step 1: Write the failing tests** for each Acceptance case, in `tests/unit/cardSets.spec.ts`, `tests/unit/relativeTime.spec.ts` and `tests/unit/prefs.spec.ts`, with the new functions created first with their real signatures

- [x] **Step 2: Run them to verify they fail**

Run: `npm test`
Expected: FAIL on the assertions, not on missing modules

- [x] **Step 3: Write the minimal implementation** to the Interfaces, add the locale keys to both files, until they pass

- [x] **Step 4: Run them to verify they pass**

Run: `npm test`
Expected: PASS

- [x] **Step 5: Commit**

```bash
git add src/types.ts src/utils/cardSets.ts src/utils/relativeTime.ts src/locales/en.json src/locales/hi.json tests/unit/cardSets.spec.ts tests/unit/relativeTime.spec.ts tests/unit/prefs.spec.ts
git commit -m "feat(library): search card text and sort by progress or last study"
```

---

### Task 2: New orders in Settings

**Files:**
- Modify: `src/views/Settings.vue` (`orderItems`)
- Test: `tests/e2e/library-sort.spec.ts`

**Interfaces:**
- Consumes: `SetOrder` with `Progress` and `Recently studied`, `SET_ORDERS` (Task 1); the locale keys `settings.order-items.progress` and `settings.order-items.rs` (Task 1); existing `usePrefsStore().setOrder`, and the helpers in `tests/e2e/helpers.ts`.
- Produces: the "Card set order" select lists, in order, the three existing items and then "Least learned first" (`Progress`) and "Recently studied" (`Recently studied`).

**Spec:**
- §7.3: "New sort orders in Settings: "Least learned first" (by learned percentage, lowest first; ties by title) and "Recently studied" (by `studiedAt`, newest first; never-studied sets last, by title). Stored values `Progress` and `Recently studied`."

**Tags:** `screen`

**Acceptance:**
- Given sets `Alpha` (1 card, learned) and `Beta` (1 card, not learned), when "Least learned first" is picked in Settings, Home lists `Beta` before `Alpha`, and after a reload the select still shows "Least learned first".
- Given sets `Alpha` and `Beta` and only `Alpha` reviewed (marked learned on the review screen, then back to Home), when "Recently studied" is picked, Home lists `Alpha` before `Beta`.
- Given the Settings page with the select open at 390 px wide, the axe scan finds no violations.

- [x] **Step 1: Write the failing tests** for each Acceptance case, in `tests/e2e/library-sort.spec.ts`

- [x] **Step 2: Run them to verify they fail**

Run: `npm run test:e2e`
Expected: FAIL on the missing select items

- [x] **Step 3: Write the minimal implementation** to the Interfaces, until they pass

- [x] **Step 4: Run them to verify they pass**

Run: `npm run test:e2e`
Expected: PASS

- [x] **Step 5: Commit**

```bash
git add src/views/Settings.vue tests/e2e/library-sort.spec.ts
git commit -m "feat(library): offer the progress and recently-studied orders in Settings"
```

---

### Task 3: Match count and last-studied line on set cards

**Files:**
- Modify: `src/components/CardFlashSet.vue`
- Modify: `src/views/Home.vue`
- Test: `tests/e2e/library-search.spec.ts`

**Interfaces:**
- Consumes: `titleMatches`, `cardMatchCount` (Task 1); `relativeTime` (Task 1); the locale keys `home.set.matches`, `home.set.studied`, `home.set.not-studied` (Task 1); `CardSet.studiedAt` (existing, from the study-modes plan); existing `usePrefsStore().lang`, and the helpers in `tests/e2e/helpers.ts`.
- Produces:

```ts
// CardFlashSet.vue — new optional prop; Home passes its search text. The Bin passes nothing.
defineProps<{ card: CardSet; bin?: boolean; disabled?: boolean; search?: string }>();
```

The card shows "Matches in {n} cards" only when `search` is not empty, the title does not match, and `cardMatchCount` is above 0. It shows "Studied {time}" from `relativeTime(studiedAt, now, prefs.lang)`, or "Not studied yet" when `studiedAt` is missing, except in the Bin. Both lines sit in the card's lower half beside the existing due/new counts (spaced-repetition plan) and, with them, fit at 390 px wide without growing the card past its 182 px height.

**Spec:**
- §7.1: "Search matches a set when the text appears in its title or in any card's front or back, ignoring case."
- §7.2: "A set that matches only through its cards shows "Matches in {n} cards" on its Home card."
- §2.9: "Every string with a count uses vue-i18n plural forms, singular | plural."
- §7.4: "Each set card shows "Studied {relative time}", for example "Studied 3 days ago", or "Not studied yet"."

**Tags:** `screen`

**Acceptance:**
- Given sets `Spanish verbs` (card `hablar` / `to speak`) and `Periodic table` (card `Fe` / `Iron`), when Home's search is `speak`, only `Spanish verbs` shows, with "Matches in 1 card".
- Given a set `Animals` with cards `cat`/`gato` and `catfish`/`bagre`, searching `cat` on a set not titled with it shows "Matches in 2 cards".
- Given search `span`, `Spanish verbs` shows and no "Matches in" line (its title matches).
- Given the search cleared with the chip's Close button, both sets show and neither has a "Matches in" line.
- Given a set never reviewed, its card says "Not studied yet".
- Given a set marked learned on the review screen just now, back on Home its card says "Studied now".
- Given the language switched to Hindi in Settings, the same card shows the Hindi copy with the relative time in Hindi.
- Given the Bin, a set card shows neither line.
- Given Home with a search active at 390 px wide, the axe scan finds no violations.

- [x] **Step 1: Write the failing tests** for each Acceptance case, in `tests/e2e/library-search.spec.ts`

- [x] **Step 2: Run them to verify they fail**

Run: `npm run test:e2e`
Expected: FAIL on the missing lines

- [x] **Step 3: Write the minimal implementation** to the Interfaces, until they pass

- [x] **Step 4: Run them to verify they pass**

Run: `npm run test:e2e`
Expected: PASS

- [x] **Step 5: Run the type check**

Run: `npm run type-check`
Expected: no errors

- [x] **Step 6: Run lint**

Run: `npm run lint`
Expected: no errors

- [x] **Step 7: Commit**

```bash
git add src/components/CardFlashSet.vue src/views/Home.vue tests/e2e/library-search.spec.ts
git commit -m "feat(library): show card matches and when each set was last studied"
```
