# TWA Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: the project's workflow policy names the executor (`run.executor`): ga:implement-with-subagents by default, or ga:implement. Follow the policy and this plan's Checkpoints. Steps use checkbox (`- [x]`) syntax for tracking.

**Status:** complete

**Goal:** Make the deletion screens match the app's list-and-icon style, fix the stuck dialog after a cancelled Google re-confirmation, rename the app "FlashCards", remove the launch jitter, and drop the login screen's Delete account link.

**Architecture:**
- **Task 1 (foundation):** every string and name change, plus the early paint in `index.html`.
- **Task 2:** the web screens: profile row, deletion and privacy pages, the dialog fix, and the login screen.
- **Task 3:** the Android side: rename, regenerate, the splash-handover investigation, and the rebuilt signed artifacts.

Tasks 2 and 3 build side by side on Task 1.

**Tech Stack:** Vue 3, Vuetify 4, Pinia, vue-router, vue-i18n, TypeScript, Vite with `vite-plugin-pwa`, Firebase Auth and Firestore, Vitest (jsdom), Playwright with the Auth and Firestore emulators, Bubblewrap CLI `1.27.0` with the Android SDK, GitHub Actions CI (`.github/workflows/ci.yml`).

**Spec:** `docs/specs/2026-11-04-twa-polish.md`

## Global Constraints

- §1.1: "Every new user-facing string is in both `src/locales/en.json` and `src/locales/hi.json`." The English is the spec's copy, word for word; the Hindi is listed in the PR. `tests/unit/locales.spec.ts` checks the keys match.
- §1.2: "Screens follow the info screen's pattern (`src/views/Info.vue`): a `BarTop`, then a `surface-light` card of rows, each with an icon, a `text-title-small` title and a `text-body-small` description."
- §1.3: no change to what deletion does, only how it looks and how it recovers from a cancelled redirect.
- Unit tests are `tests/unit/<subject>.spec.ts`; end-to-end tests are `tests/e2e/<flow>.spec.ts`, run with `npm run test:e2e`. A task runs only the tests it writes, each by name.
- Never read, print or copy the keystore password: signing tools read it from `~/keys/flashcards/keystore-password.txt` with their `:file` / `file:` options.

## Checkpoints

None. The policy sets `run.checkpoints: none`.

---

### Task 1: Names, strings and the early paint

**Files:**
- Modify: `src/locales/en.json`
- Modify: `src/locales/hi.json`
- Modify: `pwa-manifest.ts`
- Modify: `index.html`
- Test: `tests/unit/earlyPaint.spec.ts`

**Interfaces:**
- Consumes: existing `pwaManifest`, existing locale keys, the dark-mode key `usePrefsStore` saves (`src/stores/prefs.ts`).
- Produces (used by Tasks 2 and 3): the names `FlashCards - Learn & Memorize` (`pwaManifest.name`) and `FlashCards` (`pwaManifest.short_name`); these locale keys:

```json
{
  "account": { "delete": { "row": "Remove your account and everything in it" } },
  "deletion": {
    "title": "Delete your FlashCards account",
    "what": { "title": "What's deleted" },
    "app": { "title": "In the app" },
    "email": { "title": "Can't sign in?" }
  }
}
```

`deletion.app.title` loses its trailing colon. The renamed values are `common.flashcards` and `info.tagline.title`, which become "FlashCards"; `empty.bin.title`, which becomes "FlashCards trash bin"; and `privacy.intro` and `privacy.children.body`, which say "FlashCards" instead of "Flashcards". Hindi gets `account.delete.row` and `deletion.what.title`; its other values stay.

`index.html` contract: a `<style>` in `<head>` sets `html, body` background `#ECECEC`. An inline `<script>` in `<head>`, run before the app's module, sets the dark background (the dark theme's `background` colour from `src/plugins/vuetify.ts`) when the saved prefs say dark. `#app` holds `<img class="boot-logo" src="/img/icons/android-chrome-192x192.png" alt="">`, centred, which Vue's mount replaces.

**Spec:**
- §4.1: "`pwa-manifest.ts`: `name` "FlashCards - Learn & Memorize", `short_name` "FlashCards"."
- §4.3: "`index.html`: title "FlashCards"; description "FlashCards: a learning and memorization helper app."; noscript "FlashCards needs JavaScript to work. Please enable it to continue.""
- §4.4: "`en.json`: `common.flashcards` and `info.tagline.title` become "FlashCards", `empty.bin.title` "FlashCards trash"
- §5.1: "`index.html` paints the app's background before any script runs"
- §2.1: description "Remove your account and everything in it".

**Tags:** security, failure-paths

**Knowledge:**
- `decisions/app-name-flashcards`: names in `pwa-manifest.ts`, `index.html` and `en.json` follow it.
- `apps/flash-cards`: `index.html` paints the background and the icon before the app mounts, matching the Android splash.

**Acceptance:**
- `pwaManifest.name` is `FlashCards - Learn & Memorize`, and `short_name` is `FlashCards`.
- No value in `src/locales/en.json` contains `Flashcards`.
- `en.json` and `hi.json` have the same keys.
- `index.html`: the `<title>` is `FlashCards`; the description meta and the noscript text use `FlashCards`; `#app` contains an `img.boot-logo`.
- Given localStorage with the saved dark preference on, when the inline head script runs in jsdom, then `document.documentElement.style.background` (or the class it sets) is the dark background. Given no saved prefs, it is `#ECECEC`. Given unparseable prefs, it is `#ECECEC` and nothing throws.

- [x] **Step 1: Write the failing tests** in `tests/unit/earlyPaint.spec.ts`, reading `index.html`, `pwa-manifest.ts` and `en.json`, and running the head script's text in jsdom with prepared localStorage.

- [x] **Step 2: Run them to verify they fail**

Run: `npx vitest run tests/unit/earlyPaint.spec.ts`
Expected: FAIL on the assertions.

- [x] **Step 3: Write the minimal implementation:** the locale changes, the manifest names, and the `index.html` title, meta, noscript, style, head script and boot logo.

- [x] **Step 4: Run them to verify they pass**

Run: `npx vitest run tests/unit/earlyPaint.spec.ts tests/unit/locales.spec.ts`
Expected: PASS

- [x] **Step 5: Commit**

```bash
git add src/locales/en.json src/locales/hi.json pwa-manifest.ts index.html tests/unit/earlyPaint.spec.ts
git commit -m "Rename the app FlashCards and paint the background before the app loads."
```

---

### Task 2: Deletion screens, the cancelled-redirect fix and the login screen

**Files:**
- Modify: `src/views/Profile.vue`
- Modify: `src/components/DialogDeleteAccount.vue`
- Modify: `src/views/Deletion.vue`
- Modify: `src/views/Privacy.vue`
- Modify: `src/views/Login.vue`
- Modify: `tests/e2e/account-deletion.spec.ts`
- Modify: `tests/e2e/public-pages.spec.ts`

**Interfaces:**
- Consumes: the `account.delete.row`, `deletion.what.title`, `deletion.app.title` and `deletion.email.title` keys (Task 1); existing `useAccountStore`, `shouldResumeDeletion`, `CONTACT_EMAIL`, `BarTop`.
- Produces: nothing other tasks use.

**Spec:**
- §2.1: "the red "Delete account" text button is replaced by a row at the end of the profile card's list, after "Your Labels""
- §2.2: "`mdi-delete-forever-outline`, "What's deleted": the intro text."
- §2.3: "The closing line ("If this policy changes…") sits under the card."
- §2.4: "The deletion dialog keeps the bin's dialog look (`src/views/Bin.vue`)."
- §3.1: "The dialog is `persistent`, and Cancel disabled, only while the deletion request itself runs."
- §3.2: "When the page is shown again from the back/forward cache (`pageshow` with `persisted`), the dialog's busy state resets."
- §3.3: "After coming back from Google without a re-confirmation (Back, or closing Google's page), the dialog stays at its first step with Cancel enabled."
- §5.2: "The login screen's email field doesn't auto-focus on touch devices (`(pointer: coarse)`)"
- §6.1: "The login screen no longer links to `/delete-account`; it keeps "Privacy policy"."

**Tags:** security, screen, failure-paths

**Knowledge:**
- `features/account-deletion`: Delete account is a row with an icon at the end of the profile card. The dialog is locked only while the deletion runs, and resets when the page comes back from Google.
- `features/privacy-and-deletion-pages`: both pages are info-style cards of icon rows. Login links only to the privacy policy; info links to both.
- `features/sign-in`: the email field auto-focuses only on devices with a fine pointer.

**Acceptance:**
- E2e: on `/profile`, a button named "Delete account" sits inside the profile card (`.profile__card`), and the old red text button is gone. Clicking the row opens the dialog titled "Delete your account?".
- E2e (emulators, Google user): in the dialog, click "Continue with Google". On the emulator's page, go back with `page.goBack()`. The dialog either is closed or shows "Cancel" enabled, and clicking "Cancel" closes it. The user is still signed in on `/profile`.
- E2e (password user): with the dialog open, "Cancel" is enabled and closes it. While "Delete my account" runs, Cancel is disabled. The existing password-deletion test still passes.
- E2e: `/delete-account`, signed out, shows "Delete your FlashCards account" and the row titles "What's deleted", "In the app" and "Can't sign in?". "Sign in to delete" leads to `/login?redirect=/profile`, and the `mailto:panditankit1995@gmail.com` link is present.
- E2e: `/privacy` shows "Privacy policy", "Last updated: 4 November 2026" and the six section titles, with the `mailto:` link and a link to `/delete-account`.
- E2e: `/login` has a "Privacy policy" link and no "Delete account" link.
- E2e (mobile project, `hasTouch`): on `/login`, the email field isn't focused after load. On the desktop project it is.
- The existing axe scans of `/privacy`, `/delete-account`, `/login` and `/profile` pass.

- [x] **Step 1: Write the failing tests** for each Acceptance case in `tests/e2e/account-deletion.spec.ts` and `tests/e2e/public-pages.spec.ts`

- [x] **Step 2: Run them to verify they fail**

Run: `npm run build:e2e && npx --yes firebase-tools@15.34.2 emulators:exec --only auth,firestore --project demo-flash-cards "npx playwright test tests/e2e/account-deletion.spec.ts tests/e2e/public-pages.spec.ts"`
Expected: FAIL on the new cases.

- [x] **Step 3: Write the minimal implementation:**
  - The profile row.
  - The dialog fix: lock only during the delete call, plus a `pageshow` listener added on mount and removed on unmount.
  - The two pages as info-style cards.
  - The login link removal, and auto-focus only when `matchMedia('(pointer: coarse)')` doesn't match.

- [x] **Step 4: Run them to verify they pass**

Run: `npm run build:e2e && npx --yes firebase-tools@15.34.2 emulators:exec --only auth,firestore --project demo-flash-cards "npx playwright test tests/e2e/account-deletion.spec.ts tests/e2e/public-pages.spec.ts tests/e2e/a11y.spec.ts"`
Expected: PASS

- [x] **Step 5: Commit**

```bash
git add src/views/Profile.vue src/components/DialogDeleteAccount.vue src/views/Deletion.vue src/views/Privacy.vue src/views/Login.vue tests/e2e/account-deletion.spec.ts tests/e2e/public-pages.spec.ts
git commit -m "Match the deletion screens to the app's list style and unstick the dialog after a cancelled redirect."
```

---

### Task 3: Android rename, splash handover and signed artifacts

**Files:**
- Modify: `android/twa-manifest.json`
- Modify: every file `npm run twa:update` rewrites under `android/` (at least `android/app/build.gradle`, `android/app/src/main/res/raw/web_app_manifest.json`, `android/app/src/main/res/values/strings.xml` if it holds the name, `android/manifest-checksum.txt`), each listed from `git status --porcelain android/` in the commit
- Modify: `tests/unit/twa.spec.ts`

**Interfaces:**
- Consumes: `pwaManifest.name` and `short_name` (Task 1); the keystore at `/Users/ankitkumarpandit/keys/flashcards/upload.keystore` (alias `upload`) and its password file `keystore-password.txt`, read only by the signing tools.
- Produces: `~/keys/flashcards/app-release-1.0.0-1.aab`, `~/keys/flashcards/app-release-1.0.0-1.apk` and `~/keys/flashcards/store/feature_graphic.png`, replaced in place.

**Spec:**
- §4.2: "`android/twa-manifest.json`: `name` "FlashCards - Learn & Memorize", `launcherName` "FlashCards". `android/` is regenerated with Bubblewrap."
- §4.5: "the signed AAB and APK in `~/keys/flashcards/` are rebuilt and re-signed (still `1.0.0`, code"
- §5.3: "The TWA splash handover to Chrome fails on every cold start"
- §5.3: "If it can't be fixed from this project, the build reports what it found instead of changing anything for it."

**Tags:** security, failure-paths

**Knowledge:**
- `apps/android`: the launcher name is FlashCards. The splash handover finding: what was found and whether it's fixed.
- `operations/android-release`: the artifacts were rebuilt for the rename; the splash check is part of the device checks.

**Acceptance:**
- `twa.spec.ts`: `name` equals `pwaManifest.name`, and `launcherName` equals `pwaManifest.short_name`.
- `android/app/src/main/res/raw/web_app_manifest.json` says `FlashCards - Learn & Memorize` and `display` `standalone`.
- Nothing under `android/` contains `localhost`.
- `aapt2 dump badging` on the rebuilt APK shows the label `FlashCards - Learn & Memorize`, the launchable-activity label `FlashCards`, package `in.spanion.flashcards.twa`, versionCode `1`, versionName `1.0.0`.
- `apksigner verify --print-certs` shows SHA-256 `466e2a92e2119d31d7682babaaca10ea58651976f297ab5a528792d8d1f227f8`, and `jarsigner -verify` on the AAB says "jar verified".
- The feature graphic is 1024×500 and reads "FlashCards".
- Splash investigation, time-boxed to 30 minutes:
  - Install the new APK on the developer's phone over the connected wireless `adb` (`~/Library/Android/sdk/platform-tools/adb`, run outside the sandbox).
  - Cold-launch with Chrome force-stopped and capture logcat.
  - Report whether "Failed to transfer splash image" still appears, what was tried, and the cause if found.
  - Change the Android project for it only if a fix is found and confirmed on the phone. Otherwise change nothing for it.
  - Never keep screen recordings past the task (they show the developer's notifications).

- [x] **Step 1: Write the failing test cases** in `tests/unit/twa.spec.ts`

- [x] **Step 2: Run them to verify they fail**

Run: `npx vitest run tests/unit/twa.spec.ts`
Expected: FAIL on the names.

- [x] **Step 3: Rename and regenerate.** Set the two names in `android/twa-manifest.json`. Serve `public/` with `python3 -m http.server 8099` from `public/`, point the icon URLs at it for the run, run `npm run twa:update`, then restore the production URLs and stop the server.

- [x] **Step 4: Run the test to verify it passes**

Run: `npx vitest run tests/unit/twa.spec.ts`
Expected: PASS

- [x] **Step 5: Rebuild and sign the artifacts.** Build `bundleRelease assembleRelease` with the cached Gradle 8.14 (`~/.gradle/wrapper/dists/gradle-8.14-all/*/gradle-8.14/bin/gradle`, outside the sandbox). Sign the AAB with `jarsigner -storepass:file`. Zipalign and sign the APK with `apksigner --ks-pass file:`. Replace the files in `~/keys/flashcards/`, delete any `.idsig`, and verify both. Redraw the feature graphic with the new name at 1024×500.

- [x] **Step 6: Investigate the splash handover** as the Acceptance says, and write what was found to the report.

- [x] **Step 7: Commit**

```bash
git add android/twa-manifest.json android/manifest-checksum.txt android/app/build.gradle android/app/src/main/res/raw/web_app_manifest.json tests/unit/twa.spec.ts
git commit -m "Rename the Android app FlashCards and regenerate the project."
```
