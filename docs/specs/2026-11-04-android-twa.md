# Android TWA Spec

**Date:** 2026-11-04
**Status:** Draft, for the developer's review
**Scope:** Package the PWA as an Android Trusted Web Activity (TWA) for Google Play, and fix what Play would
reject: Digital Asset Links, an adaptive icon, Google sign-in that works inside a TWA, in-app and web account
deletion, and a privacy policy.

## 1. Why, and what's agreed

[requirements/android-twa](../../knowledge/requirements/android-twa.md) says the app ships on Google Play as a TWA.
Its packaging was left until now. The decisions behind this spec, all made by the developer on 2026-11-04 and
recorded in `knowledge/decisions/`:

| Decision | Rule |
|---|---|
| `android-package-name` | The package is `in.spanion.flashcards.twa`. |
| `twa-built-with-bubblewrap` | Bubblewrap CLI, its config and generated Gradle project committed in `android/`; keystore and passwords never in the repo; bundle built and signed locally; fallback `customtabs`; `appVersionCode` raised by hand each release. |
| `play-compliance-in-twa-work` | Account deletion (not export) and a privacy policy are built here. |
| `google-sign-in-redirect` | Google sign-in by same-origin redirect, replacing `google-sign-in-popup`. |
| `account-deletion-confirms-identity` | Deleting always re-confirms identity first; no typed confirmation. |
| `display-standalone` | The web manifest's `display` is `standalone`. |
| `twa-orientation` | The Android app declares `portrait`; it targets API 36 so large screens rotate; the web manifest sets no orientation. |
| `audience-13-and-over` | The target audience is 13 and over. |
| `privacy-contact` | Ankit Kumar Pandit, `panditankit1995@gmail.com`. |
| `deletion-is-permanent` | No backups or point-in-time recovery; emailed deletion requests done within `30 days`. |

Also binding: [account-deletion-covers-every-collection](../../knowledge/requirements/account-deletion-covers-every-collection.md),
and [labels-deleted-only-with-account](../../knowledge/decisions/labels-deleted-only-with-account.md) (deletion runs
in the browser; `firestore.rules` already lets the owner delete sets and labels, so no rules change).

## 2. Global rules

- 2.1 Every new user-facing string is in both `src/locales/en.json` and `src/locales/hi.json`. The English is the
  copy in this spec, word for word. The implementer writes the Hindi; the PR lists it for a Hindi reader to check.
- 2.2 Only `src/services/firebase.ts` calls Firebase; views go through stores
  ([conventions](../../knowledge/project/conventions.md)).
- 2.3 No new paid Firebase product and no server code.

## 3. Google sign-in by same-origin redirect

- 3.1 `signInWithGoogle` calls `signInWithRedirect(auth, new GoogleAuthProvider())`. `signInWithPopup` is no longer
  used anywhere.
- 3.2 The Firebase config's `authDomain` is `window.location.host` when the app runs in a browser and isn't using the
  emulators; otherwise it is `VUE_APP_AUTH_DOMAIN`. `VUE_APP_AUTH_DOMAIN` stays required, as today. This makes
  Google return to `/__/auth/handler` on the same origin on both `flashcards.spanion.in` and
  `spanion-flash-cards.web.app`, and on `localhost:8080` in dev.
- 3.3 The Vite dev server proxies `/__` to `https://<VUE_APP_PROJECT_ID>.firebaseapp.com` (`changeOrigin: true`), so
  the auth helper pages exist in dev.
- 3.4 A new `getRedirectOutcome()` in `firebase.ts` wraps `getRedirectResult` and resolves to
  `{ operationType, uid } | { error } | null`. The session store calls it once at start-up and keeps the outcome,
  for the login screen (an error) and the profile screen (§4). A sign-in error is shown with `authErrorMessage`.
- 3.5 While the redirect starts, the Google button shows its loading state. Pressing back on Google's page returns
  to `/login` with no error shown.
- 3.6 After a successful redirect the user lands on `/login?redirect=…` again, and the existing guard sends them on
  through `safeRedirect`.
- 3.7 `src/services/authErrors.ts` drops `auth/popup-blocked` and the popup checks in `isAuthCancel`, and their
  locale keys. It adds `auth/user-mismatch` → "That's a different Google account. Choose the account you signed in
  with." and `auth/requires-recent-login` → "Please confirm it's you again, then try once more."
- 3.8 README "Domains" lists the redirect URIs to add on the Google OAuth web client:
  `https://flashcards.spanion.in/__/auth/handler`, `https://spanion-flash-cards.web.app/__/auth/handler`,
  `http://localhost:8080/__/auth/handler`.

## 4. Account deletion

### 4.1 Service

- `OWNED_COLLECTIONS` in `src/services/ownedCollections.ts` (no Firebase imports, so a unit test can read it; `firebase.ts` uses it) lists each collection a user owns and its owner field:
  `[{ name: 'flash-card-sets', ownerField: 'uid' }, { name: 'labels', ownerField: 'uid' }]`.
- `reauthenticateWithPassword(password)` uses `EmailAuthProvider.credential(user.email, password)` and
  `reauthenticateWithCredential`.
- `reauthenticateWithGoogle()` calls `reauthenticateWithRedirect(user, new GoogleAuthProvider())`.
- `deleteAccount()` queries each of `OWNED_COLLECTIONS` with `where(ownerField, '==', uid)`, where `uid` is the
  current user's, deletes the documents with `writeBatch` in chunks of at most `500`, then calls `deleteUser`. Sets
  in the bin are in `flash-card-sets` too, so they go with the rest.
- Which confirmation a user gets: `password` when `providerData` has `password`, otherwise Google.

### 4.2 Screen (`/profile`)

- At the end of the profile card, above the Sign out button, a text button "Delete account" in the error colour.
- The dialog, title "Delete your account?", body: "This deletes your account and all your sets, cards and labels.
  It can't be undone."
  - Email users: a password field ("Password") and a button "Delete my account".
  - Google users: a button "Continue with Google". It stores `{ uid, at }` under the `sessionStorage` key
    `flashcards.pendingDelete`, then starts the reconfirmation redirect.
  - "Cancel" closes the dialog.
- Back from Google, `/profile` reopens the dialog with the body plus "You're confirmed. Delete your account now?"
  and the button "Delete my account", only when the redirect outcome is `reauthenticate` for the same `uid` and the
  stored `at` is under `5 minutes` old. The key is removed either way. Nothing is deleted without that tap.
- A failed reconfirmation shows its error, and the dialog stays at its first step.
- While deleting, the button shows loading and the dialog can't be closed. On success: library reset, toast "Your
  account has been deleted.", and the auth listener moves to `/login`. On failure: the error is shown
  (`session.showError`, fallback "Couldn't delete your account. Please try again."), and a retry deletes whatever is
  left.

### 4.3 Tests

- Unit: the `OWNED_COLLECTIONS` names cover every `match /<collection>/{…}` in `firestore.rules`. A collection that
  isn't user-owned has to be named in the test's own exception list. Today that list is empty.
- Unit: the restored-dialog rule (same uid, under 5 minutes, `reauthenticate` only) as a pure function.
- E2e (emulators): an email user with a set and a label deletes their account with their password, lands on
  `/login`, and can't sign in again. The emulator shows no documents left for that uid.

## 5. Public pages

- 5.1 Routes with `meta: { public: true }` are let through for signed-in and signed-out users: `authRedirect`
  returns `true` for them. Unit test in `tests/unit/router.spec.ts`.
- 5.2 `/privacy` (`src/views/Privacy.vue`) and `/delete-account` (`src/views/Deletion.vue`) are public. Each has a back
  button: to `/home` when signed in, `/login` when not.
- 5.3 Links: the login screen shows "Privacy policy" and "Delete account" under the form. The info screen lists
  "Privacy policy" and "Delete account".

### 5.4 Privacy policy copy (`/privacy`)

> **Privacy policy**
> Last updated: 4 November 2026
>
> Flashcards is made by Ankit Kumar Pandit. This policy explains what the app stores and what you can do about it.
>
> **What we store**
> - Your account: your email address, and, if you add them or sign in with Google, your name and profile photo
>   link.
> - What you create: your sets, cards and labels.
> - Settings such as language and dark mode stay on your device only.
>
> **How it is used**
> Only to sign you in and to show and save your sets. We don't show ads, we don't use analytics, and we don't sell
> or share your data with anyone.
>
> **Where it is kept**
> With Google Firebase (Authentication and Cloud Firestore), which stores it for us. Data travels encrypted.
>
> **Deleting your data**
> You can delete your account and everything in it from your profile in the app. Deletion is immediate and
> permanent; we keep no backups. If you can't sign in, see [Delete account](/delete-account).
>
> **Children**
> Flashcards is meant for people aged 13 and over and is not directed at children under 13.
>
> **Contact**
> Ankit Kumar Pandit, panditankit1995@gmail.com
>
> If this policy changes, the date above changes with it.

### 5.5 Delete account copy (`/delete-account`)

> **Delete your Flashcards account**
>
> Deleting your account removes your sign-in, your sets, cards and labels, straight away and for good. Nothing is
> kept.
>
> **In the app:** open your profile, choose Delete account, and confirm it's you. *(button: "Sign in to delete" →
> `/login?redirect=/profile`, or "Go to profile" → `/profile` when signed in)*
>
> **Can't sign in?** Email panditankit1995@gmail.com from the address on your account, asking to delete it. We
> delete it within 30 days and reply to confirm.

## 6. Web manifest and Digital Asset Links

- 6.1 `VitePWA`'s manifest in `vite.config.ts` gains `id: '/'` and `scope: '/'`, and `display` becomes `standalone`.
  No `orientation`.
- 6.2 Icons: the 512 icon becomes `purpose: 'any'`. A new `img/icons/maskable-512x512.png` is `purpose: 'maskable'`.
  It is the existing 512 icon padded on its own `#ECECEC` background to 580px and scaled back to 512px, which keeps
  the artwork inside the 40% safe-zone radius.
- 6.3 `public/.well-known/assetlinks.json` holds one `delegate_permission/common.handle_all_urls` statement for
  `android_app` `in.spanion.flashcards.twa`. `sha256_cert_fingerprints` starts empty. The developer adds the upload key's
  fingerprint, then Play's app-signing key's (§8). Firebase Hosting serves the file before the `**` rewrite, as
  `application/json` with no redirect. The build must copy it into `dist/.well-known/`.
- 6.4 Unit test `tests/unit/twa.spec.ts`:
  - `assetlinks.json` names the same package as `android/twa-manifest.json`.
  - The TWA's `host` is `flashcards.spanion.in`.
  - Every fingerprint matches `^([0-9A-F]{2}:){31}[0-9A-F]{2}$`.
  - The TWA's `display`, `themeColor` and `backgroundColor` match the web manifest.
  - The TWA's `orientation` is `portrait` and `fallbackType` is `customtabs`.

## 7. Android project (`android/`)

- 7.1 `android/twa-manifest.json`:
  - `packageId: in.spanion.flashcards.twa`, `host: flashcards.spanion.in`, `startUrl: /`
  - name and launcher name from the web manifest
  - `display: standalone`, `orientation: portrait`, `fallbackType: customtabs`
  - `enableNotifications: false`
  - `iconUrl` and `maskableIconUrl` pointing at the production icons
  - `appVersionName` = the `package.json` version, `appVersionCode: 1`
  - `signingKey.path` pointing outside the repository (`~/keys/flashcards-upload.jks`)
- 7.2 The Gradle project is generated by Bubblewrap `1.27.0` (`npx --yes @bubblewrap/cli@1.27.0 update`) and
  committed.
- 7.3 It targets API `36` or later. If Bubblewrap's template targets lower, raise `targetSdkVersion` and
  `compileSdkVersion` in `android/app/build.gradle` and say so in the release runbook, because `update` rewrites it.
- 7.4 `npm run twa:update` and `npm run twa:build` run Bubblewrap in `android/`.
- 7.5 `.gitignore` adds `*.jks`, `*.keystore`, `android/**/build/`, `android/.gradle/`, `android/local.properties`,
  `*.aab`, `*.apk` and `*.idsig`.
- 7.6 If Bubblewrap needs to download a JDK or Android SDK packages, or accept a licence, the implementer stops and
  asks the developer.

## 8. Release runbook (written to the knowledge base at the finish)

It covers:
1. Creating the upload keystore outside the repository.
2. Adding its fingerprint to `assetlinks.json` (`keytool -list -v`).
3. `npm run twa:build`.
4. Creating the app in Play Console with Play App Signing.
5. Adding Play's app-signing fingerprint and deploying hosting.
6. Checking with Google's Statement List tester.
7. The redirect URIs (§3.8) and Firebase authorised domains.
8. Data safety answers:
   - collected: email address, name, user IDs, user-generated content, and the photo link
   - not shared
   - encrypted in transit
   - deletion available
9. Content rating, and target audience 13+.
10. Privacy policy URL `https://flashcards.spanion.in/privacy`, deletion URL
   `https://flashcards.spanion.in/delete-account`.
11. The device checks below.
12. `VUE_APP_PLAY_STORE_URL`.
13. Raising `appVersionCode` for each release.

Device checks before each submission, on a phone and a tablet or foldable:
- no browser bar on launch
- Google and email sign-in
- account deletion by both routes
- portrait lock on the phone, rotation on the large screen
- offline start shows the app shell

## 9. Out of scope

- Data export: still required by [account-deletion-and-export](../../knowledge/requirements/account-deletion-and-export.md),
  not by Play.
- Password reset: [requirements/password-reset](../../knowledge/requirements/password-reset.md), not a Play
  requirement.
- Push notifications (usability spec 12.3), Play Billing, and building or signing in CI.
- Uploading to Play, the store listing text and screenshots: the developer does these in Play Console.

## 10. Open questions

None.
