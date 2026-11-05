# Progress and Habits Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: the project's workflow policy names the executor (`run.executor`): ga:implement-with-subagents by default, or ga:implement. Follow the policy and this plan's Checkpoints. Steps use checkbox (`- [ ]`) syntax for tracking.

**Status:** complete (built 2026-11-05 on feat/usability-plans-5-9)

**Goal:** Give people a reason to come back daily: count cards reviewed per day, show a streak and a daily goal
on Home, and add a Stats page with the last 30 days.

**Architecture:** One Firestore document per user, `user-stats/{uid}`, holds the daily goal and a map of local
date to cards reviewed; writes add to today's count with a merged `increment`. Streak maths is a pure module over
that map. A Pinia store (`useStatsStore`) loads the signed-in user's document and is what the review screens,
Home, Settings and the Stats page use.

**Tech Stack:** Vue 3 (`<script setup>`, TypeScript), Vuetify 4, Pinia, Vue Router 5, vue-i18n (en, hi),
Firebase 13 Firestore and security rules, Vitest (jsdom) + `@firebase/rules-unit-testing` on the Firestore
emulator (`npm run test:rules`), Playwright + axe against the emulators, GitHub Actions CI
(`.github/workflows/ci.yml`).

**Spec:** `docs/specs/2026-11-02-usability-features.md` (sections 2, 3.2, 8 and 13)

**Depends on:** `docs/plans/2026-11-02-study-modes.md` (`localDate`, `addDays`, the review screen's queue and
shortcuts) and `docs/plans/2026-11-02-spaced-repetition.md` (`/due` and rating), both merged to `master`, as the
spec's roadmap orders them.

## Global Constraints

- 2.1: "Every new user-facing string is added to both `src/locales/en.json` and `src/locales/hi.json`." English copy is the spec's, word for word; the PR lists the Hindi strings for a Hindi reader.
- 2.2: "The Firestore schema stays readable by the version of the app that is live today." The new collection is unknown to the live app, which never reads it.
- 2.3: "No new paid Firebase product."
- 2.4: "Every screen keeps working at 390 px wide and passes the existing axe scan in `tests/e2e/a11y.spec.ts`."
- 2.9: "Every string with a count uses vue-i18n plural forms, singular | plural."
- 2.7: Unit tests are Vitest in `tests/unit/<name>.spec.ts`; e2e tests are Playwright in `tests/e2e/<flow>.spec.ts`, run with `npm run test:e2e`; rules tests go in `tests/unit/firestore.rules.spec.ts`.
- Amended 2026-11-05: e2e tests reach the emulators through `DEV_PORTS` (`dev-ports.ts`), never a literal port. The spaced-repetition plan is merged: `View.vue` rates cards (buttons and 1–4) and re-queues Again cards, `/due` (`src/views/Due.vue`) exists, and both screens save on leave and set `session.unsavedChanges`. Home already shows the due banner and an AdSense banner; the streak and today lines go with the due banner, leaving the ad alone.
- 2.8: "A `firestore.rules` change only takes effect once someone runs `deploy.yml` by hand with **deploy_rules** ticked." Task 5's last step says so.
- Days are the device's local date from `localDate()` (existing, from the study-modes plan). E2E tests that depend on the date fix the browser clock with Playwright's `page.clock`.

## Checkpoints

None. The policy's `run.checkpoints` is `none`. Task 1 changes the security rules and is tagged `security`; the
developer may add a stop after it when reviewing this plan. Tasks 3, 4 and 5 are tagged `security` as well (Task 3
loads per-user data; Task 5 tests the route guard; Task 4 only because the plan check matches the word "session"
in spec 8.1).

---

### Task 1: Stats document, rules and copy

**Files:**
- Modify: `firestore.rules`
- Modify: `src/types.ts`
- Create: `src/services/statsMapper.ts`
- Modify: `src/services/firebase.ts`
- Modify: `src/services/ownedCollections.ts`
- Modify: `src/locales/en.json`
- Modify: `src/locales/hi.json`
- Test: `tests/unit/firestore.rules.spec.ts`
- Test: `tests/unit/statsMapper.spec.ts`

**Interfaces:**
- Consumes: existing `getServices()` and `requireUid()` in `src/services/firebase.ts`
- Produces:

```ts
// src/types.ts
export interface UserStats {
  goal: number;                 // one of DAILY_GOALS; 20 when the stored doc has none
  days: Record<string, number>; // 'YYYY-MM-DD' -> cards reviewed that day
}
export const DAILY_GOALS = [10, 20, 50, 100] as const;
export const DEFAULT_DAILY_GOAL = 20;

// src/services/statsMapper.ts
export function statsFromDoc(data: DocumentData | undefined): UserStats;

// src/services/firebase.ts
export function fetchUserStats(): Promise<UserStats>;                 // a missing doc reads as { goal: 20, days: {} }
export function addReviews(day: string, count: number): Promise<void>; // merges uid and days[day] += count
export function saveDailyGoal(goal: number): Promise<void>;           // merges uid and goal
```

- Firestore document `user-stats/{uid}`: `{ uid: string, goal?: number, days: map<string, number> }`. Writes are
  `setDoc(…, { merge: true })`, so the first write creates the document; `addReviews` uses `increment(count)` on
  the nested `days` key.
- `statsFromDoc` keeps only `days` keys that match `^\d{4}-\d{2}-\d{2}$` and whose value is a finite number ≥ 0,
  reads keys with `Object.hasOwn` (so `__proto__` or `constructor` keys never reach the result), and falls back
  to `20` when `goal` is missing or not one of `DAILY_GOALS`.
- Rules for `match /user-stats/{uid}`:
  - read, delete: signed in and `request.auth.uid == uid`.
  - create, update: signed in, `request.auth.uid == uid`, `request.resource.data.uid == uid`,
    `request.resource.data.keys().hasOnly(['uid', 'goal', 'days'])`, `days` is a map, and `goal`, when present,
    is one of 10, 20, 50, 100.
  - list: signed in and `resource.data.uid == request.auth.uid` (a query limited to their own `uid`; spec 3.3),
    so Delete account can find the document. Any other list fails.
- `OWNED_COLLECTIONS` gains `{ name: 'user-stats', ownerField: 'uid' }` (spec 3.3), so Delete account removes it.
- Locale keys (English word for word; Hindi by the implementer):

| Key | English |
|---|---|
| `stats.title` | Stats |
| `stats.streak` | {n}-day streak |
| `stats.today` | {done}/{goal} today |
| `stats.reviewed` | Cards reviewed |
| `stats.current-streak` | Current streak |
| `stats.longest-streak` | Longest streak |
| `stats.mastered` | Sets mastered |
| `stats.day-bar` | {n} card on {date} \| {n} cards on {date} |
| `settings.goal.title` | Daily goal |
| `toast.error.stats` | Couldn't update your stats. Your progress is saved. |

**Spec:**
- 8.3: "Daily goal: 10, 20, 50 or 100 cards, set in Settings"
- 8.3: "default 20, stored in user-stats."
- 8.6: "user-stats/{uid} is readable and writable only by that user, and the document id must equal their uid."

**Tags:** `security`

**Acceptance:**
- Given user alice signed in, when she creates `user-stats/alice` with `{ uid: 'alice', days: { '2026-11-02': 3 } }`, then it succeeds; reading it back succeeds; updating `goal` to `50` succeeds; deleting it succeeds.
- Given alice's document exists, when bob reads, updates or deletes `user-stats/alice`, then each fails; a signed-out visitor's read fails too.
- Given bob signed in, when he creates `user-stats/alice` with `uid: 'bob'`, or `user-stats/bob` with `uid: 'alice'`, then both fail.
- Given alice, when she writes `goal: 25`, `goal: '20'`, `days: 'x'`, or an extra field `admin: true`, then each write fails.
- Given alice, when she runs a `list` query over `user-stats` with no filter, or limited to `uid == 'bob'`, then it fails;
  limited to `uid == 'alice'`, it succeeds and returns only her document.
- `tests/unit/ownedCollections.spec.ts` passes with `user-stats` listed.
- The existing rules cases (sets, labels, "other collections are closed") still pass.
- Given `statsFromDoc(undefined)`, then it returns `{ goal: 20, days: {} }`.
- Given `{ goal: 50, days: { '2026-11-01': 4, 'nope': 2, '2026-11-02': -1, '2026-11-03': 'x' } }`, then it returns `{ goal: 50, days: { '2026-11-01': 4 } }`.
- Given `{ goal: 7, days: {} }`, then `goal` is `20`.
- Given a `days` object whose own keys include `__proto__` and `constructor`, then the result's `days` has neither key and `Object.getPrototypeOf(result.days)` is still `Object.prototype`.
- The existing `tests/unit/locales.spec.ts` passes with the new keys in both files.

- [x] **Step 1: Write the failing tests** for each Acceptance case, in `tests/unit/firestore.rules.spec.ts` and `tests/unit/statsMapper.spec.ts`

- [x] **Step 2: Run the unit tests to verify they fail**

Run: `npm test`
Expected: the mapper cases FAIL on behaviour. Create `src/services/statsMapper.ts` exporting `statsFromDoc` first.

- [x] **Step 3: Run the rules tests to verify they fail**

Run: `npm run test:rules`
Expected: the new `user-stats` allow cases FAIL (the collection is closed today).

- [x] **Step 4: Write the minimal implementation** to the Interfaces (rules, types, mapper, the three API functions, both locale files), until they pass

- [x] **Step 5: Run the unit tests to verify they pass**

Run: `npm test`
Expected: PASS

- [x] **Step 6: Run the rules tests to verify they pass**

Run: `npm run test:rules`
Expected: PASS

- [x] **Step 7: Commit**

```bash
git add firestore.rules src/types.ts src/services/statsMapper.ts src/services/firebase.ts src/locales/en.json src/locales/hi.json tests/unit/firestore.rules.spec.ts tests/unit/statsMapper.spec.ts
git commit -m "feat(stats): add the user-stats document, rules and copy"
```

---

### Task 2: Streak maths

**Files:**
- Create: `src/utils/streaks.ts`
- Test: `tests/unit/streaks.spec.ts`

**Interfaces:**
- Consumes: `addDays` (existing, from the study-modes plan)
- Produces:

```ts
// src/utils/streaks.ts
export function currentStreak(days: Record<string, number>, today: string): number;
export function longestStreak(days: Record<string, number>): number;
export function lastDays(days: Record<string, number>, today: string, count: number): { day: string; count: number }[]; // oldest first, ending today, 0 for missing days
export function totalReviewed(days: Record<string, number>): number;
```

- A day counts toward a streak when its value is at least 1.

**Spec:**
- 8.2: "Streak: the number of consecutive local days with at least one review, ending today, or ending yesterday when nothing is reviewed yet today."
- 8.5: "shows the last 30 days as bars"

**Acceptance:**
- Given days `{ '2026-10-31': 2, '2026-11-01': 1, '2026-11-02': 5 }` and today `'2026-11-02'`, then `currentStreak` is `3`.
- Given days `{ '2026-10-31': 2, '2026-11-01': 1 }` and today `'2026-11-02'`, then `currentStreak` is `2` (ends yesterday).
- Given days `{ '2026-10-31': 2 }` and today `'2026-11-02'`, then `currentStreak` is `0`.
- Given days `{ '2026-11-01': 0, '2026-11-02': 3 }` and today `'2026-11-02'`, then `currentStreak` is `1`.
- Given days `{}`, then `currentStreak` and `longestStreak` are `0` and `totalReviewed` is `0`.
- Given days spanning 2026-02-27 to 2026-03-02 every day, then `longestStreak` is `4` (crosses the month end); with a gap at 2026-02-28, then it is `2`.
- Given days `{ '2026-10-01': 1, '2026-10-02': 1, '2026-10-03': 1, '2026-11-02': 1 }`, then `longestStreak` is `3`.
- Given days `{ '2026-11-02': 5, '2026-10-04': 2, '2026-10-03': 9 }` and today `'2026-11-02'`, when `lastDays(days, today, 30)` runs, then it returns 30 entries from `'2026-10-04'` (count 2) to `'2026-11-02'` (count 5), with `'2026-10-03'` left out and other days at 0.
- Given the same days, then `totalReviewed` is `16`.

- [x] **Step 1: Write the failing tests** for each Acceptance case, in `tests/unit/streaks.spec.ts`

- [x] **Step 2: Run them to verify they fail**

Run: `npm test`
Expected: FAIL on the assertions. Create the module with its four signatures first.

- [x] **Step 3: Write the minimal implementation** to the Interfaces, until they pass

- [x] **Step 4: Run them to verify they pass**

Run: `npm test`
Expected: PASS

- [x] **Step 5: Commit**

```bash
git add src/utils/streaks.ts tests/unit/streaks.spec.ts
git commit -m "feat(stats): add streak and daily-total helpers"
```

---

### Task 3: Stats store

**Files:**
- Create: `src/stores/stats.ts`
- Modify: `src/router/index.ts`
- Test: `tests/unit/stats.spec.ts`
- Test: `tests/unit/router.spec.ts`

**Interfaces:**
- Consumes: from Task 1, `fetchUserStats`, `addReviews`, `saveDailyGoal`, `UserStats`, `DAILY_GOALS`,
  `DEFAULT_DAILY_GOAL` and the `toast.error.stats` key; `currentStreak`, `longestStreak` (Task 2); `localDate` (existing, from the study-modes plan); existing `useSessionStore` (`user`, `track`, `showError`, `showSnack`)
- Produces (spec 13, verbatim):

```ts
// src/stores/stats.ts
export interface StatsStore {
  goal: number; todayCount: number; streak: number; longestStreak: number;
  days: Record<string, number>; status: 'idle' | 'loading' | 'ready' | 'error';
  load(): Promise<void>; recordReviews(count: number): Promise<boolean>; setGoal(goal: number): Promise<boolean>;
  reset(): void;
}
export const useStatsStore: () => StatsStore;
```

- `load()` fetches once per signed-in uid (a second call for the same uid reuses the result; a different uid, or
  `reset()`, refetches), and ignores a result that arrives after the user changed, as `library.load` does.
  Signed out, it resets and resolves.
- `todayCount` is `days[localDate()]` or 0; `streak` is `currentStreak(days, localDate())`.
- `recordReviews(count)` does nothing and returns `true` for `count <= 0`. Otherwise it calls
  `addReviews(localDate(), count)`, and on success adds `count` to today in `days`; on failure it shows the
  snack "Couldn't update your stats. Your progress is saved." and returns `false`, leaving `days` unchanged.
- `setGoal(goal)` refuses (returns `false`, no write) a goal not in `DAILY_GOALS`; on a failed write it shows the
  existing save error and keeps the old goal.
- `reset()` sets `goal` to 20, `days` to `{}`, `status` to `'idle'`, forgets the loaded uid and makes any pending
  load stale. `src/router/index.ts` calls it everywhere it calls `library.reset()` today: on a user change in
  `watchAuthChanges` (sign-out, or another account in another tab) and in `beforeEach` when nobody is signed in,
  so the next account on the device never sees the last one's counts.

**Spec:**
- 8.7: "If the stats write fails, the review progress is still saved and the error snack says "Couldn't update your stats. Your progress is saved.""
- 13: "load(): Promise<void>; recordReviews(count: number): Promise<boolean>; setGoal(goal: number): Promise<boolean>"

**Tags:** `security` (loads and writes only the signed-in user's document, drops a stale result after a user switch, and resets on sign-out)

**Acceptance:**
- Given the user `alice` and `fetchUserStats` resolving `{ goal: 50, days: { '2026-11-01': 3, '2026-11-02': 4 } }` with the clock at 2026-11-02, when `load()` runs, then `goal` is `50`, `todayCount` `4`, `streak` `2`, `longestStreak` `2`, `status` `'ready'`.
- Given `load()` already ran for `alice`, when it runs again, then `fetchUserStats` is not called a second time.
- Given a `load()` for `alice` still pending, when the user becomes `bob` and `load()` runs and resolves first, then alice's late result does not replace bob's.
- Given no signed-in user, when `load()` runs, then `fetchUserStats` is not called and `status` is `'idle'`.
- Given `fetchUserStats` rejects, then `status` is `'error'` and the existing load error snack is shown.
- Given `todayCount` `4`, when `recordReviews(3)` succeeds, then `addReviews` was called with `('2026-11-02', 3)`, `todayCount` is `7`, and it returns `true`.
- Given `addReviews` rejects, when `recordReviews(3)` runs, then it returns `false`, `todayCount` stays `4`, and the snack text is "Couldn't update your stats. Your progress is saved."
- Given `recordReviews(0)`, then `addReviews` is not called and it returns `true`.
- Given a loaded store with `goal` 50 and today's count 4, when `reset()` runs, then `goal` is `20`, `todayCount` `0`, `days` `{}`, `status` `'idle'`, and the next `load()` calls `fetchUserStats` again.
- Given the router with `@/services/firebase` mocked (`getAuthUser` resolving a user, `onUserChanged` capturing its callback), when the callback is called with `null` (sign-out), then the stats store's `reset` runs, as the library store's does (`tests/unit/router.spec.ts`).
- Given the same router setup, when the callback is called with a different user, then the stats store's `reset` runs before anything loads for the new user.
- Given `setGoal(100)` succeeds, then `saveDailyGoal` was called with `100` and `goal` is `100`; `setGoal(30)` returns `false` without calling `saveDailyGoal`; a failing `setGoal(10)` keeps `goal` at `100`.

- [x] **Step 1: Write the failing tests** for each Acceptance case, in `tests/unit/stats.spec.ts` and `tests/unit/router.spec.ts`, mocking `@/services/firebase` as `tests/unit/library.spec.ts` does

- [x] **Step 2: Run them to verify they fail**

Run: `npm test`
Expected: FAIL on the assertions. Create the store with its returned names first.

- [x] **Step 3: Write the minimal implementation** to the Interfaces, until they pass

- [x] **Step 4: Run them to verify they pass**

Run: `npm test`
Expected: PASS

- [x] **Step 5: Commit**

```bash
git add src/stores/stats.ts src/router/index.ts tests/unit/stats.spec.ts tests/unit/router.spec.ts
git commit -m "feat(stats): add the stats store"
```

---

### Task 4: Count reviews on the review screens

**Files:**
- Modify: `src/views/View.vue`
- Modify: `src/views/Due.vue`
- Create: `tests/e2e/stats-helpers.ts`
- Test: `tests/e2e/review-counts.spec.ts`

**Interfaces:**
- Consumes: `useStatsStore` (`recordReviews`) (Task 3); the review screen's mark and rate handlers (existing, from the study-modes and spaced-repetition plans) and `/due` (existing, from the spaced-repetition plan)
- Produces (e2e helpers, used by this task and Task 5):

```ts
// tests/e2e/stats-helpers.ts — talk to the Firestore emulator's REST API as the emulator owner (bypasses rules)
export function readUserStats(page: Page): Promise<{ goal?: number; days: Record<string, number> } | null>;
export function seedUserStats(page: Page, data: Record<string, unknown>): Promise<void>; // overwrites user-stats/<signed-in uid>
```

- The helpers find the account's uid from the Auth emulator's `accounts:lookup` for the test's email, then call
  `http://127.0.0.1:${DEV_PORTS.firestore}/v1/projects/demo-flash-cards/databases/(default)/documents/user-stats/<uid>` (ports from `dev-ports.ts`; the Auth lookup uses `DEV_PORTS.auth`) with
  `Authorization: Bearer owner`.
- `View.vue` and `Due.vue` each keep a set of card ids reviewed on this visit to the screen: a card joins it when
  it is marked learned, marked not learned (tick/close, K, J) or rated (buttons or 1–4). Flipping alone does not
  count, and a card already in the set is not counted again.
- After a successful save on leave, the screen calls `recordReviews(reviewed.size)` and clears the set. Leaving is
  not blocked by the stats write, and a failed set save records nothing.

**Spec:**
- 8.1: "A review counts once per card per session, on the review screen and on /due: marking, unmarking or rating the same card again in one session does not count twice. Counts are written when the session saves."
- 8.7: "If the stats write fails, the review progress is still saved and the error snack says "Couldn't update your stats. Your progress is saved.""

**Tags:** `failure-paths`, `security` (only because the plan check matches "session" in the 8.1 line; no auth change)

**Acceptance:**
- Given the clock fixed at 2026-11-02 10:00 and a set with cards "uno", "dos", "tres", when the person marks "uno" learned, then not learned, then learned again, rates "dos" Good, only flips "tres", and goes Home, then `readUserStats` returns `days['2026-11-02']` equal to `2`.
- Given the same set is opened again and "uno" is marked once more, then after going Home `days['2026-11-02']` is `3`.
- Given a card is rated on `/due` and the person goes Home, then `days['2026-11-02']` rises by 1.
- Given the person opens a set, only flips cards, and goes Home, then no `user-stats` document exists for a new account (`readUserStats` returns `null`).
- Given `seedUserStats(page, { uid: <uid>, days: {}, admin: true })` (an extra field, so the rules refuse every later write), when the person marks a card and goes Home, then the snack says "Couldn't update your stats. Your progress is saved." and, after a reload, the set card shows the new learned count.
- Given the set save fails on leave (`context.setOffline(true)`) and the person discards, then after going back online `readUserStats` still shows the earlier count.

- [x] **Step 1: Write the e2e helpers and the failing tests** for each Acceptance case, in `tests/e2e/stats-helpers.ts` and `tests/e2e/review-counts.spec.ts`, using the account and set helpers in `tests/e2e/helpers.ts` and `page.clock`

- [x] **Step 2: Run them to verify they fail**

Run: `npm run test:e2e`
Expected: the new tests FAIL (nothing writes `user-stats`); existing suites pass.

- [x] **Step 3: Write the minimal implementation** in `View.vue` and `Due.vue` to the Interfaces, until they pass

- [x] **Step 4: Run them to verify they pass**

Run: `npm run test:e2e`
Expected: PASS

- [x] **Step 5: Run the type check**

Run: `npm run type-check`
Expected: no errors

- [x] **Step 6: Commit**

```bash
git add src/views/View.vue src/views/Due.vue tests/e2e/stats-helpers.ts tests/e2e/review-counts.spec.ts
git commit -m "feat(stats): count reviews on the review screens"
```

---

### Task 5: Streak and goal on Home, Stats page and daily goal setting

**Files:**
- Create: `src/views/Stats.vue`
- Modify: `src/router/index.ts`
- Modify: `src/views/Home.vue`
- Modify: `src/views/Settings.vue`
- Test: `tests/unit/router.spec.ts`
- Test: `tests/unit/Stats.spec.ts`
- Test: `tests/e2e/stats.spec.ts`

**Interfaces:**
- Consumes: from Task 3, `useStatsStore` (`load`, `days`, `goal`, `todayCount`, `streak`, `longestStreak`,
  `setGoal`, `status`); `lastDays`, `totalReviewed` (Task 2); `DAILY_GOALS` and the `stats.*`, `settings.goal.title` keys
  (Task 1); `localDate` (existing, from the study-modes plan); existing `learnedCount`, `library.sets`,
  `ContainerEmpty`
- E2E data: this task's spec file seeds `user-stats/<uid>` with its own call to the Firestore emulator's REST API
  (`Authorization: Bearer owner`, uid from the Auth emulator's `accounts:lookup`), so it does not wait for the
  review-count helpers.
- Produces:

| Route | Name | Component | Meta |
|---|---|---|---|
| `/stats` | `stats` | `@/views/Stats.vue` (lazy) | same as `/settings` (signed-in only) |

- `Home.vue` calls `load()` when it mounts and shows "{n}-day streak" (hidden when the streak is 0) and
  "{done}/{goal} today". Its menu (`menuItems`) gets "Stats" with icon `mdi-chart-bar`, linking to `/stats`.
- `Stats.vue` calls `load()`, shows the last 30 days (`lastDays(days, localDate(), 30)`) as bars whose heights are
  relative to the largest day, each bar with the accessible name "{n} cards on {date}" (plural form, rule 2.9),
  the date written with `Intl.DateTimeFormat(<app language>, { dateStyle: 'medium' })` and the app language from
  the existing `usePrefsStore().lang`; and
  four figures: "Cards reviewed" (`totalReviewed`), "Current streak", "Longest streak", "Sets mastered" (non-bin
  sets with at least one card and every card learned). With `status` `'error'` it shows the existing
  `empty.error.*` state with a "Retry" button that calls `load()` again.
- Settings gets a "Daily goal" row with a select of 10, 20, 50 and 100, bound to `goal`, calling `setGoal`; when
  `setGoal` returns `false` the select shows the kept goal.

**Spec:**
- 8.3: "Daily goal: 10, 20, 50 or 100 cards, set in Settings ("Daily goal"), default 20"
- 8.4: "Home shows "{n}-day streak" (hidden at 0) and "{done}/{goal} today"."
- 8.5: "A Stats page (/stats, in the Home menu as "Stats") shows the last 30 days as bars, plus "Cards reviewed", "Current streak", "Longest streak" and "Sets mastered" (sets 100% learned)."
- 8.5: "Each bar's accessible name is "{n} cards on {date}", with the date in the app language's medium format."
- 8.5: "If the stats fail to load, the page shows the existing load-error state with "Retry"."

**Tags:** `screen`, `failure-paths`, `security` (adds a route behind the existing signed-in guard and tests that guard)

**Acceptance:**
- Given the router, when `/stats` is resolved signed out, then it redirects to `/login?redirect=/stats`; signed in it is let through (`tests/unit/router.spec.ts`).
- Given a `Stats.vue` mounted with a stats store whose `status` is `'error'`, then it shows the load-error empty state, and pressing "Retry" calls `load()` (`tests/unit/Stats.spec.ts`).
- Given a new account with the clock fixed at 2026-11-02, when Home loads, then it shows "0/20 today" and no "day streak" text.
- Given seeded stats `{ days: { '2026-11-01': 2, '2026-11-02': 3 } }`, when Home loads, then it shows "3/20 today" and "2-day streak".
- Given seeded stats `{ days: { '2026-11-01': 2 } }` with the clock at 2026-11-02, then Home shows "0/20 today" and "1-day streak".
- Given the Home menu is opened, then it lists "Stats", and pressing it opens `/stats`.
- Given seeded stats `{ days: { '2026-11-01': 2, '2026-11-02': 3 } }`, when `/stats` loads, then it shows 30 bars, the last two named "2 cards on Nov 1, 2026" and "3 cards on Nov 2, 2026", and "Cards reviewed" 5, "Current streak" 2, "Longest streak" 2.
- Given one set with every card learned, one partly learned, and one fully learned set in the bin, then "Sets mastered" is 1.
- Given seeded stats `{ days: { '2026-11-01': 1 } }`, then the second-to-last bar is named "1 card on Nov 1, 2026".
- Given a new account, then `/stats` shows 30 bars, the last named "0 cards on Nov 2, 2026", and every figure is 0.
- Given the app language is Hindi, then each bar's date is in Hindi's medium format (`Intl.DateTimeFormat('hi', { dateStyle: 'medium' })`), not the English one.
- Given account A with seeded stats `{ days: { '2026-11-02': 3 } }` signs out from Profile and a new account B signs up in the same tab, then Home shows "0/20 today" for B.
- Given Settings, when "Daily goal" is set to 50, then Home shows "0/50 today", and after a reload Settings still shows 50.
- Given seeded stats with an extra field `admin: true` (the rules then refuse writes), when "Daily goal" is set to 100, then the select shows 20 again and the existing save error snack is shown.
- Given Home with the streak shown, `/stats`, and Settings, when axe scans each at desktop and mobile widths, then there are no violations.

- [x] **Step 1: Write the failing tests** for each Acceptance case, in `tests/unit/router.spec.ts`, `tests/unit/Stats.spec.ts` and `tests/e2e/stats.spec.ts`

- [x] **Step 2: Run the unit tests to verify they fail**

Run: `npm test`
Expected: the new router and Stats cases FAIL (`/stats` falls through to the catch-all; `Stats.vue` doesn't exist —
create it as an empty component first so the failure is on behaviour).

- [x] **Step 3: Run the e2e tests to verify they fail**

Run: `npm run test:e2e`
Expected: the new tests FAIL (no goal, streak, Stats page or goal setting).

- [x] **Step 4: Add the route and build `Stats.vue`** to the Interfaces

- [x] **Step 5: Add the streak, goal and Stats menu item to Home**

- [x] **Step 6: Add the Daily goal row to Settings**, until the tests pass

- [x] **Step 7: Run the unit tests to verify they pass**

Run: `npm test`
Expected: PASS

- [x] **Step 8: Run the e2e tests to verify they pass**

Run: `npm run test:e2e`
Expected: PASS

- [x] **Step 9: Run the linter**

Run: `npm run lint`
Expected: no errors

- [x] **Step 10: Commit**

```bash
git add src/views/Stats.vue src/router/index.ts src/views/Home.vue src/views/Settings.vue tests/unit/router.spec.ts tests/unit/Stats.spec.ts tests/e2e/stats.spec.ts
git commit -m "feat(stats): show streak and goal on Home, add the Stats page and the daily goal setting"
```

- [x] **Step 11: Note the rules deploy in the PR description**

The `user-stats` rules from Task 1 only take effect once someone runs `deploy.yml` by hand with **deploy_rules**
ticked (spec 2.8). Until then, the live site refuses every stats write, and the snack from spec 8.7 shows after
each review.
