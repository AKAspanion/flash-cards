# Offline Study Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: the project's workflow policy names the executor (`run.executor`): ga:implement-with-subagents by default, or ga:implement. Follow the policy and this plan's Checkpoints. Steps use checkbox (`- [ ]`) syntax for tracking.

**Status:** complete (built 2026-11-05 on feat/usability-plans-5-9)

**Goal:** Reviewing, editing, creating, favouriting and moving sets to the bin work with no connection and sync when it comes back.

**Architecture:** Firestore gets its persistent IndexedDB cache (memory when IndexedDB is missing). Firestore applies a write to that cache when the call is made, but its promise only settles when the server answers. So offline, the library store counts the call itself as the save, updates its own state, and handles a later refusal in a `catch`. Online, saves still wait for the server, as they do today. New sets and labels get client-made document ids, so an offline creation has its id at once. Sign-out clears the cache, so the next person on the device can't read the last person's sets. Known limit (spec §10.7): on a connection that is up but not working, `navigator.onLine` is still true, so saves wait for the server as they do today and the existing slow-network snack shows after 8 seconds.

**Tech Stack:** Vue 3, Vuetify 4, Pinia, Vue Router, vue-i18n, Firebase 13 (Auth + Firestore), TypeScript, Vitest (jsdom), Playwright with the Auth + Firestore emulators, GitHub Actions CI (`.github/workflows/ci.yml`).

**Spec:** `docs/specs/2026-11-02-usability-features.md` (section 10; rules 2.1, 2.4, 2.7, 2.10)

## Global Constraints

- Rule 2.1: "Every new user-facing string is added to both `src/locales/en.json` and `src/locales/hi.json`." The English copy is the spec's, word for word; the PR lists the Hindi strings for a Hindi reader to check.
- Rule 2.2: "The Firestore schema stays readable by the version of the app that is live today." This plan adds no field.
- Rule 2.4: "Every screen keeps working at 390 px wide and passes the existing axe scan in `tests/e2e/a11y.spec.ts`."
- Rule 2.7: unit tests are Vitest in `tests/unit/<name>.spec.ts`; end-to-end tests are Playwright in `tests/e2e/<flow>.spec.ts`, run with `npm run test:e2e`.
- Rule 2.10: "Every online-only action, when offline, shows the existing message "You're offline. Connect to the internet to save." unless this spec gives another one."
- This plan lands after plans 1–6 (spec section 1). Those plans change `CardFlash.vue`, `View.vue` and `Add.vue`, and add `src/stores/stats.ts` (existing, from the progress-habits plan) and `src/views/Due.vue` (existing, from the spaced-repetition plan), so find code by searching (`session.online`), not by line numbers.
- The e2e config blocks service workers (`playwright.config.ts`, `serviceWorkers: 'block'`), so e2e tests can only check offline *data*: the app has to be loaded online first, and every lazily loaded page a test opens offline has to be opened once online before that. Loading the app shell offline is the service worker's job and isn't tested here.

## Checkpoints

None. The policy sets `run.checkpoints: none`.

---

### Task 1: Local cache and non-blocking offline writes

**Files:**
- Create: `src/services/localCache.ts`
- Modify: `src/services/firebase.ts`
- Modify: `src/stores/session.ts`
- Modify: `src/stores/library.ts`
- Modify: `src/stores/stats.ts` (existing, from the progress-habits plan)
- Modify: `src/locales/en.json`
- Modify: `src/locales/hi.json`
- Test: `tests/unit/localCache.spec.ts`
- Test: `tests/unit/session.spec.ts` (create)
- Test: `tests/unit/library.spec.ts`
- Test: `tests/unit/stats.spec.ts` (existing, from the progress-habits plan)

**Interfaces:**
- Consumes: existing `useSessionStore()` (`online`, `showSnack`, `showError`, `track`); existing `useLibraryStore()`; existing `useStatsStore()` (existing, from the progress-habits plan; `src/stores/stats.ts`, spec section 13 signature).
- Produces (used by Task 2 and Task 3):

```ts
// src/services/localCache.ts
export type LocalCacheKind = 'persistent' | 'memory';
export function chooseLocalCache(scope: { indexedDB?: unknown }): LocalCacheKind;

// src/services/firebase.ts — changed signatures
export interface PendingWrite { docId: string; committed: Promise<void> }
export function addCardSet(set: CardSet): PendingWrite;     // client-made id (doc(collection(...)) + setDoc)
export function addLabel(label: string): PendingWrite;      // same
// updateCardSet, deleteCardSet, renameLabel keep their Promise<void> signatures. Each one makes its
// Firestore call before its first `await`, so the write is in the local cache once the call returns.
// Amended 2026-11-05: so do addReviews and saveDailyGoal (progress-habits plan); stats.ts gets the same
// `if (!session.online)` non-blocking path for recordReviews (and setGoal), with the same catch.

// src/stores/session.ts — added
function notifyOfflineSave(): void; // shows toast.offline-saved once per offline period
```

Firestore is created with `initializeFirestore(app, { localCache })` (replacing `getFirestore(app)` in `src/services/firebase.ts`; the `DEV_PORTS` emulator connection lines stay): `persistentLocalCache({ tabManager: persistentMultipleTabManager() })` when `chooseLocalCache(globalThis)` says `persistent`, otherwise `memoryLocalCache()`. It is not created with `getFirestore`. The emulator connection stays as it is.

Library store write rule: when `session.online` is true, a write is awaited through `session.track` exactly as today. When it is false, the store makes the api call, does not await it, updates `sets`/`labels` at once, calls `session.notifyOfflineSave()`, and resolves as if the write succeeded. It also attaches a `catch` to the call's promise (or to `committed`) that calls `session.showError(err, 'toast.error.save')` and then `load(true)`, so the screen goes back to what the server holds. `deleteSet` is online-only: offline, it shows `toast.offline-delete` and resolves `false` without calling the api. `recordReviews` in the stats store follows the same rule as a save.

New locale keys (all copy for this plan, so Tasks 2 and 3 don't touch the locale files):
- `toast.offline-saved` "Saved on this device. It will sync when you're back online."
- `toast.offline-delete` "You're offline. Connect to the internet to delete this set."
- `toast.offline-signout` "You're offline. Connect to the internet to sign out, so your changes aren't lost."

**Spec:**
- §10.1: "Firestore uses its persistent local cache (IndexedDB, shared across tabs), falling back to memory when IndexedDB is not available."
- §10.2: "Creating and renaming labels work offline too."
- §10.3: "Offline, a save counts as done once it is in the local cache; the app does not wait for the server. The first offline save after going offline shows: "Saved on this device. It will sync when you're back online.""
- §10.4: "A write the server later refuses shows the existing save error snack."
- §10.5: "Deleting forever from the bin, sign-in, profile changes, deleting the account, sharing (plan 8) and restore from backup stay online-only. Offline, delete forever says "You're offline. Connect to the internet to delete this set."; the others use rule 2.10's message."
- §10.7: "Known limit: on a connection that is up but not working, the app thinks it is online, and saves wait for the server as they do today. The existing slow-network snack still shows after 8 seconds."

**Tags:** `failure-paths`, `security` (stores the signed-in user's sets on the device in IndexedDB)

**Acceptance:**
- Given a scope with an `indexedDB` object, `chooseLocalCache` returns `'persistent'`. Given a scope without one (or with `indexedDB` undefined), it returns `'memory'`.
- Given `session.online` is false, when `saveSet(set)` is called and the api's `updateCardSet` promise never settles, then `saveSet` resolves `true`, `library.sets` holds the updated set, and the snack text is "Saved on this device. It will sync when you're back online."
- Given offline, when a second save happens before going online again, no snack is shown for it. Given the store then sees `online` go true and back to false, the next offline save shows the snack again.
- Given offline, when `createSet(set)` is called and `committed` never settles, then it resolves with a set whose `docId` equals the `docId` the api returned, and `library.sets` holds that set.
- Given offline, when `createLabel('Verbs')` and `renameLabel(label, 'Nouns')` are called with never-settling writes, both resolve with success and `library.labels` holds the new values.
- Given offline, when a queued write's promise later rejects with `permission-denied`, then the snack shows "Could not save. Please try again." and the library loads again (`fetchCardSets` is called).
- Given online, when `updateCardSet` rejects, then `saveSet` resolves `false`, the snack shows "Could not save. Please try again.", and `library.sets` is unchanged (today's behaviour, kept).
- Given online, when `saveSet` is called, then it waits for the api promise to settle before resolving (a never-settling write leaves `saveSet` pending).
- Given online and a write that hasn't settled after 8 seconds (fake timers), then the snack says "Experiencing network difficulty, please hold on!" and `saveSet` is still pending (spec §10.7).
- Given offline, when `deleteSet(set)` is called, then it resolves `false`, `api.deleteCardSet` is not called, the set stays in `library.sets`, and the snack says "You're offline. Connect to the internet to delete this set."
- Given offline, when `recordReviews(5)` is called and the stats write never settles, then it resolves `true` and `todayCount` has gone up by 5.
- Given the locales test, `toast.offline-saved`, `toast.offline-delete` and `toast.offline-signout` exist in both `en.json` and `hi.json`.

- [x] **Step 1: Write the failing tests** for each Acceptance case, in `tests/unit/localCache.spec.ts`, `tests/unit/session.spec.ts`, `tests/unit/library.spec.ts` and `tests/unit/stats.spec.ts`. In `library.spec.ts`, update the existing `addCardSet` mocks to the new `PendingWrite` return shape.

- [x] **Step 2: Run them to verify they fail**

Run: `npm test`
Expected: FAIL on the assertions. A "not defined" or "module not found" failure proves nothing: create `chooseLocalCache` and `notifyOfflineSave` with their real signatures first, so the tests fail on behaviour

- [x] **Step 3: Write the minimal implementation** to the Interfaces, until they pass. Add the three locale keys to both locale files.

- [x] **Step 4: Run them to verify they pass**

Run: `npm test`
Expected: PASS

- [x] **Step 5: Run the type check**

Run: `npm run type-check`
Expected: PASS (every caller of `addCardSet` and `addLabel` uses the new `PendingWrite` shape)

- [x] **Step 6: Commit**

```bash
git add src/services/localCache.ts src/services/firebase.ts src/stores/session.ts src/stores/library.ts src/stores/stats.ts src/locales/en.json src/locales/hi.json tests/unit/localCache.spec.ts tests/unit/session.spec.ts tests/unit/library.spec.ts tests/unit/stats.spec.ts
git commit -m "feat(offline): persistent Firestore cache and non-blocking offline saves"
```

### Task 2: Enable study and editing controls offline

**Files:**
- Modify: `src/components/CardFlash.vue`
- Modify: `src/components/CardFlashSet.vue`
- Modify: `src/views/Add.vue`
- Modify: `src/views/View.vue`
- Modify: `src/views/Due.vue` (existing, from the spaced-repetition plan)
- Test: `tests/e2e/offline.spec.ts`

**Interfaces:**
- Consumes: the library store's offline write rule and `toast.offline-saved` (Task 1); existing `useSessionStore().online`; existing e2e helpers `signUp`, `createSet`, `setCard` (`tests/e2e/helpers.ts`).
- Produces: nothing new for other tasks.

Remove every `session.online` check in `src/` that disables or blocks reviewing, editing, creating, favouriting or moving a set to the bin: the learn/unlearn and delete-card buttons in `CardFlash.vue` (there is no peek rule any more), the edit chip and `swipeDisabled` in `CardFlashSet.vue`, the offline refusals in `Add.vue`'s `persist` and `duplicateSet`, and in `View.vue` the Reset button's `:disabled`, the `!session.online` returns in `mark`, `onRate` and `saveProgress`, and in `Due.vue`'s `saveTouched` (amended 2026-11-05 from the current code; grep `session.online` in src/ for the full list). `App.vue`'s offline banner stays. "Restore from backup" in `Settings.vue` (existing, from the faster-authoring plan) already refuses offline with `toast.offline-save` (rule 2.10) and stays as it is. Deleting forever is already refused by the store (Task 1), so `Bin.vue` doesn't change.

**Spec:**
- §10.2: "Reviewing, editing, creating, favouriting and moving sets to the bin work offline and sync when the connection is back." Creating and renaming labels work offline too. The controls that are disabled offline today are enabled.
- §10.3: "The first offline save after going offline shows: "Saved on this device. It will sync when you're back online.""
- §10.5: "Deleting forever from the bin, sign-in, profile changes, deleting the account, sharing (plan 8) and restore from backup stay online-only. Offline, delete forever says "You're offline. Connect to the internet to delete this set."; the others use rule 2.10's message."

**Tags:** `screen`, `failure-paths`, `security` (removes guards on writes; online-only actions must stay refused)

**Acceptance:**
Each case loads the app online, opens the pages it needs once online (so their lazy chunks are loaded), then calls `context.setOffline(true)`.
- Given a set "Spanish verbs" with one card, when the browser goes offline and the person opens its review page, marks the card learned and goes back to Home, then Home shows "1 / 1" and the snack says "Saved on this device. It will sync when you're back online." When the browser is back online and the page reloads, Home still shows "1 / 1".
- Given offline, when the person creates a set "Offline set" with one card and saves, then Home shows "Offline set". Back online, after a reload, Home still shows "Offline set".
- Given offline, when the person swipes or uses Edit on a set card, then the Edit button is enabled and the editor opens.
- Given offline, when the person favourites a set from its editor options and goes back, then Home shows the star on it, and after going back online and reloading the star is still there.
- Given offline, when the person moves a set to the bin from its editor, then it leaves Home. Back online, after a reload, it is in the bin.
- Given offline, when the person presses Delete forever on a set in the bin and confirms, then the snack says "You're offline. Connect to the internet to delete this set." and the set is still in the bin.
- Given offline, when the person creates the label "Verbs" on the Profile page, then it shows in the label list. Back online, after a reload, "Verbs" is still there.
- Given offline, when the person picks a backup file in Settings → "Restore from backup", then the snack says "You're offline. Connect to the internet to save." and no set is added.
- Given offline, when the person marks two cards learned in one offline period, then the "Saved on this device…" snack appears once, not twice.

- [x] **Step 1: Write the failing tests** for each Acceptance case, in `tests/e2e/offline.spec.ts`

- [x] **Step 2: Run them to verify they fail**

Run: `npm run test:e2e`
Expected: FAIL on the assertions (disabled controls, the old "You're offline. Connect to the internet to save." refusal on save)

- [x] **Step 3: Write the minimal implementation**: remove the gates listed above, until the tests pass

- [x] **Step 4: Run them to verify they pass**

Run: `npm run test:e2e`
Expected: PASS, the existing `a11y.spec.ts` included

- [x] **Step 5: Run the unit tests**

Run: `npm test`
Expected: PASS

- [x] **Step 6: Commit**

```bash
git add src/components/CardFlash.vue src/components/CardFlashSet.vue src/views/Add.vue src/views/View.vue src/views/Due.vue tests/e2e/offline.spec.ts
git commit -m "feat(offline): study, edit and create sets without a connection"
```

### Task 3: Sign-out clears the device cache

> Amended 2026-11-05 (spec 10.5, 10.6): Delete account is online-only too. Offline, the delete-account dialog shows
> rule 2.10's message and deletes nothing. After a successful deletion, it clears the cache the way sign-out does
> (`terminate`, `clearIndexedDbPersistence`, then a full page load). Add `src/components/DialogDeleteAccount.vue` and
> `deleteAccount` in `src/services/firebase.ts` to this task's files, with an acceptance case for each.
> The flow today: `DialogDeleteAccount.vue` → `useAccountStore().deleteAccount` (`src/stores/account.ts`) →
> `firebase.deleteAccount`; the dialog relies on the auth listener in `src/router/index.ts` (`router.replace('/login')`)
> to leave. Add `src/stores/account.ts` to the files; the cache clear and the full page load of `/login` replace
> that path. Offline, the store or the dialog shows `toast.offline-save` and deletes nothing.

**Files:**
- Modify: `src/services/firebase.ts`
- Modify: `src/views/Profile.vue`
- Modify: `src/components/DialogDeleteAccount.vue`
- Modify: `src/stores/account.ts`
- Test: `tests/unit/signOutAndClear.spec.ts`
- Test: `tests/e2e/offline-signout.spec.ts`

**Interfaces:**
- Consumes: the `initializeFirestore` set-up in `src/services/firebase.ts` and the `toast.offline-signout` locale key (Task 1); existing `signOut` and `useSessionStore().online`.
- Produces:

```ts
// src/services/firebase.ts
/** Waits for pending writes, terminates Firestore, deletes its IndexedDB cache, then signs out. */
export function signOutAndClear(): Promise<void>;
```

Order: `waitForPendingWrites(db)`, then `terminate(db)`, then `clearIndexedDbPersistence(db)`, then Firebase `signOut`. Because a terminated Firestore can't be used again, `Profile.vue` then does a full page load of `/login` (`window.location.assign('/login')`), not a router push. Offline, `Profile.vue` doesn't call it. It shows `toast.offline-signout` (Task 1) and stays signed in, because the pending writes would be lost.

**Spec:**
- §10.1: "Firestore uses its persistent local cache (IndexedDB, shared across tabs), falling back to memory when IndexedDB is not available."
- §10.6: "Signing out clears the local cache, so the next person on the device does not see the last user's sets. Offline, sign-out is refused with "You're offline. Connect to the internet to sign out, so your changes aren't lost." because unsynced changes would be cleared with the cache."

**Tags:** `security` (personal data left on a shared device), `failure-paths`

**Acceptance:**
- Given mocked `firebase/firestore` and `firebase/auth`, when `signOutAndClear()` runs, then `waitForPendingWrites`, `terminate`, `clearIndexedDbPersistence` and `signOut` are called in that order.
- Given `clearIndexedDbPersistence` rejects, when `signOutAndClear()` runs, then `signOut` is still called and the promise rejects with that error, so Profile shows it in the snack and the user is still signed out.
- Given `waitForPendingWrites` rejects, when `signOutAndClear()` runs, then nothing is terminated or cleared, the user stays signed in, and the promise rejects.
- Given a signed-in person online with one set, when they press "Sign Out", then the browser lands on `/login`, and `indexedDB.databases()` in the page lists no database whose name starts with `firestore/`.
- Given a signed-in person offline, when they press "Sign Out", then the snack says "You're offline. Connect to the internet to sign out, so your changes aren't lost.", the URL stays `/profile`, and after going online and reloading they are still signed in.

- [x] **Step 1: Write the failing tests** for each Acceptance case, in `tests/unit/signOutAndClear.spec.ts` and `tests/e2e/offline-signout.spec.ts`

- [x] **Step 2: Run the unit tests to verify they fail**

Run: `npm test`
Expected: FAIL on the assertions. Add `signOutAndClear` with its real signature first, so the tests fail on behaviour

- [x] **Step 3: Write the minimal implementation** to the Interfaces, until they pass

- [x] **Step 4: Run the unit tests to verify they pass**

Run: `npm test`
Expected: PASS

- [x] **Step 5: Run the e2e tests to verify they pass**

Run: `npm run test:e2e`
Expected: PASS

- [x] **Step 6: Commit**

```bash
git add src/services/firebase.ts src/views/Profile.vue src/components/DialogDeleteAccount.vue src/stores/account.ts tests/unit/signOutAndClear.spec.ts tests/e2e/offline-signout.spec.ts
git commit -m "feat(offline): clear the device cache on sign-out"
```
