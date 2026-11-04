# TWA Splash Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: the project's workflow policy names the executor (`run.executor`): ga:implement-with-subagents by default, or ga:implement. Follow the policy and this plan's Checkpoints. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A cold launch of the Android app shows one splash, held until the first screen is ready, then one fade.

**Architecture:** The Android `LauncherActivity` grants itself read permission on the library's splash URI, so Chrome 152+
accepts the splash handover again. The web page draws the same splash image as an overlay beside `#app`, and
`src/main.ts` fades it out once the router's first navigation has resolved and painted.

**Tech Stack:** Vue 3, Vuetify, Vite, Vue Router, Vitest (`tests/unit`), Playwright (`tests/e2e`); the Android project
is Bubblewrap-generated Java with `androidbrowserhelper` 2.7.4.

**Spec:** [docs/specs/2026-11-04-twa-splash.md](../specs/2026-11-04-twa-splash.md)

## Global Constraints

- The splash's background is `#ECECEC` whatever the dark setting (spec §3.1).
- The splash image is `300px` × `300px`, centred (spec §3.1).
- The fade is `300` ms; the overlay is removed after `400` ms even if the fade's end is never reported (spec §3.3).
- No minimum display time (spec §3.2).
- No task edits `knowledge/`: the after-finish job writes the concepts each task lists.

## Checkpoints

None. After the last task, the session installs the signed APK on the developer's phone and records a cold launch
before the finish (spec §5).

---

### Task 1: Android splash handover

**Files:**
- Modify: `android/app/src/main/java/in/spanion/flashcards/twa/LauncherActivity.java`
- Test: `tests/unit/twa.spec.ts`

**Interfaces:**
- Consumes: existing `@string/providerAuthority` (`android/app/build.gradle`, `twaManifest.applicationId + '.fileprovider'`)
  and the library's splash file `twa_splash/splash_image.png` under `getFilesDir()`.
- Produces: a private method `grantSplashUriPermission()` on `LauncherActivity`, called as the first statement of
  `onCreate(Bundle)`, before `super.onCreate(savedInstanceState)`.

```java
private void grantSplashUriPermission();
```

**Spec:**
- §2.1: "grants the app itself read permission on the library's splash file before `super.onCreate()` starts the launch."
- §2.1: "The URI: the FileProvider authority `@string/providerAuthority` and the file `twa_splash/splash_image.png` under `getFilesDir()`."
- §2.1: "The flags: `FLAG_GRANT_READ_URI_PERMISSION | FLAG_GRANT_PERSISTABLE_URI_PERMISSION`."
- §2.1: "Any exception is logged with `Log.w` and the launch goes on, without a splash, as today."
- §2.3: "`tests/unit/twa.spec.ts` fails when the grant is missing or comes after `super.onCreate(`"

**Tags:** `security`, `failure-paths`

**Knowledge:**
- `apps/android: LauncherActivity grants itself READ | PERSISTABLE on twa_splash/splash_image.png before super.onCreate(), so Chrome 152+ accepts the splash`
- `operations/android-release: after Bubblewrap regenerates android/, re-apply the splash grant; the twa unit test fails without it; remove it once GoogleChrome/android-browser-helper#623 is fixed`
- `findings/twa-splash-image-not-transferred: Fixed — Chrome 152+ checks the sender's URI grant; the self-grant restores the handover`

**Acceptance:**
- Given `LauncherActivity.java`, then `onCreate` calls `grantSplashUriPermission()` before `super.onCreate(`.
- Given `LauncherActivity.java`, then it calls `grantUriPermission(` with `getPackageName()`, with both
  `FLAG_GRANT_READ_URI_PERMISSION` and `FLAG_GRANT_PERSISTABLE_URI_PERMISSION`.
- Given `LauncherActivity.java`, then the URI is built with `FileProvider.getUriForFile` from
  `getString(R.string.providerAuthority)` and a file `twa_splash/splash_image.png` under `getFilesDir()`.
- Given `LauncherActivity.java`, then the grant sits in a `try` whose `catch (Exception` logs with `Log.w(`.
- Given the Gradle build, when `./gradlew assembleRelease` runs in `android/` (cached Gradle 8.14, outside the sandbox),
  then it compiles.

- [ ] **Step 1: Write the failing tests** for each Acceptance case but the build, as a `describe('LauncherActivity.java')`
  block in `tests/unit/twa.spec.ts` reading the file as text

- [ ] **Step 2: Run them to verify they fail**

Run: `npx vitest run tests/unit/twa.spec.ts -t "LauncherActivity"`
Expected: FAIL on the assertions

- [ ] **Step 3: Write the minimal implementation**: add `grantSplashUriPermission()` and call it first in `onCreate`,
  with the imports it needs (`android.content.Intent`, `android.util.Log`, `androidx.core.content.FileProvider`,
  `java.io.File`)

- [ ] **Step 4: Run them to verify they pass**

Run: `npx vitest run tests/unit/twa.spec.ts -t "LauncherActivity"`
Expected: PASS

- [ ] **Step 5: Build it**

Run: `cd android && ./gradlew assembleRelease` (outside the sandbox; use the cached Gradle 8.14 under `~/.gradle/wrapper/dists/` if the wrapper download times out)
Expected: BUILD SUCCESSFUL. Signing is the session's job afterwards, not this task's.

- [ ] **Step 6: Commit**

```bash
git add android/app/src/main/java/in/spanion/flashcards/twa/LauncherActivity.java tests/unit/twa.spec.ts
git commit -m "Grant the splash URI to the app itself so Chrome accepts the TWA splash again."
```

### Task 2: Web splash held until the first screen is ready

**Files:**
- Create: `public/img/splash.png` (a copy of `android/app/src/main/res/drawable-xxhdpi/splash.png`)
- Create: `src/utils/bootSplash.ts`
- Modify: `index.html`
- Modify: `src/main.ts`
- Test: `tests/unit/bootSplash.spec.ts`
- Test: `tests/e2e/boot-splash.spec.ts`

**Interfaces:**
- Consumes: existing `router.isReady()` from `src/router/index.ts`.
- Produces:

```ts
export const BOOT_SPLASH_ID = 'boot-splash';
export const BOOT_SPLASH_FADE_MS = 300;
export const BOOT_SPLASH_REMOVE_MS = 400;
/** Fades out and removes the #boot-splash overlay. Safe to call more than once, or with no overlay. */
export function hideBootSplash(doc?: Document): void;
```

**Spec:**
- §3.1: "`index.html` has a splash overlay, `#boot-splash`, beside `#app` rather than inside it, so mounting Vue doesn't remove it."
- §3.1: "It covers the viewport, on `#ECECEC` whatever the dark setting, as the native and Chrome splashes are."
- §3.1: "It shows the native splash image, copied from the `xxhdpi` drawable to `public/img/splash.png`, centred at `300px` × `300px`."
- §3.1: "It is `aria-hidden="true"`."
- §3.1: "Under `<noscript>`, a style hides it, so the "needs JavaScript" message shows."
- §3.1: "It replaces the boot logo inside `#app`."
- §3.2: "`src/main.ts` hides the splash once `router.isReady()` has resolved and the first screen has painted (the next
  animation frame after mount)."
- §3.2: "There is no minimum time: a fast launch hides it sooner."
- §3.2: "If the first navigation fails, the splash still hides, so an error can be seen."
- §3.3: "Hiding fades the overlay's opacity to 0 over `300` ms, with `pointer-events: none` from the start, then removes it from the page. It is removed after `400` ms even if the fade's end is never reported. Hiding twice, or with no overlay, does nothing."
- §3.4: "The dark-aware page background from `public/early-paint.js` stays"

**Tags:** `security`, `failure-paths`, `screen`

**Knowledge:**
- `apps/flash-cards: index.html draws #boot-splash (the native splash image on #ECECEC) beside #app; src/main.ts hides it with hideBootSplash() once router.isReady() settles and a frame has painted`
- `decisions/splash-held-until-ready: the web half is src/utils/bootSplash.ts`

**Acceptance:**
- Given a document with `#boot-splash`, when `hideBootSplash(doc)` runs, then the overlay at once has
  `pointer-events: none` and a hiding class whose CSS sets `opacity: 0` with a `300ms` transition; and when its
  `transitionend` fires, it is removed from the document.
- Given a document with `#boot-splash` and no `transitionend`, when `hideBootSplash(doc)` runs and `400` ms pass (fake
  timers), then the overlay is removed.
- Given `hideBootSplash(doc)` already ran, when it runs again before or after removal, then nothing throws and no second
  timer is set.
- Given a document with no `#boot-splash`, when `hideBootSplash(doc)` runs, then nothing throws.
- Given `index.html`, then `#boot-splash` is a sibling of `#app` (not inside it), has `aria-hidden="true"`, holds an
  `img` with `src="/img/splash.png"`, and `#app` holds no `.boot-logo`; a `<noscript>` style sets
  `#boot-splash { display: none }`.
- Given the first navigation rejects, when `src/main.ts` handles `router.isReady()`, then `hideBootSplash()` is still
  called (it runs on settle, not only on success).
- E2e, in `tests/e2e/boot-splash.spec.ts`: given a fresh visit to `/login`, when the "Login" button is visible, then
  `#boot-splash` has count `0` within `1000` ms, and clicking the Email field focuses it.

- [ ] **Step 1: Write the failing unit tests** for the `hideBootSplash` and `index.html` cases in
  `tests/unit/bootSplash.spec.ts` (jsdom; read `index.html` as text for its cases), and the e2e case in
  `tests/e2e/boot-splash.spec.ts`

- [ ] **Step 2: Run the unit tests to verify they fail**

Run: `npx vitest run tests/unit/bootSplash.spec.ts`
Expected: FAIL on the assertions (create `src/utils/bootSplash.ts` with the real signatures first)

- [ ] **Step 3: Write the minimal implementation**: copy the image, add the overlay, its CSS and the `<noscript>`
  style to `index.html` (removing `.boot-logo` and its CSS), write `src/utils/bootSplash.ts`, and in `src/main.ts`,
  after `mount('#app')`, call `hideBootSplash()` in a `requestAnimationFrame` once `router.isReady()` settles

- [ ] **Step 4: Run the unit tests to verify they pass**

Run: `npx vitest run tests/unit/bootSplash.spec.ts`
Expected: PASS

- [ ] **Step 5: Run the e2e test to verify it passes**

Run: `npx playwright test tests/e2e/boot-splash.spec.ts`
Expected: PASS (build first with `npm run build:e2e`, then run it inside the emulators: `npx --yes firebase-tools@15.34.2 emulators:exec --only auth,firestore --project demo-flash-cards "playwright test tests/e2e/boot-splash.spec.ts"`)

- [ ] **Step 6: Commit**

```bash
git add public/img/splash.png src/utils/bootSplash.ts index.html src/main.ts tests/unit/bootSplash.spec.ts tests/e2e/boot-splash.spec.ts
git commit -m "Hold the launch splash until the first screen is ready, then fade it once."
```
