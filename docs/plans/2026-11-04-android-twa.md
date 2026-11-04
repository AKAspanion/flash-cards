# Android TWA Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: the project's workflow policy names the executor (`run.executor`): ga:implement-with-subagents by default, or ga:implement. Follow the policy and this plan's Checkpoints. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Package the flashcards PWA as a Google Play Trusted Web Activity, with the sign-in, account deletion, privacy policy, asset links and icon Play needs so the listing isn't rejected.

**Architecture:**
- **Task 1 (foundation):** moves Google sign-in to a same-origin redirect, adds the public-route flag and every new string, and changes the web manifest, maskable icon, npm scripts and `.gitignore`.
- **Three slices, built side by side on top of it:**
  - Task 2: account deletion on `/profile`.
  - Task 3: the public `/privacy` and `/delete-account` pages and links to them.
  - Task 4: the Bubblewrap Android project in `android/` and `assetlinks.json`.
- No server code and no rules change.

**Tech Stack:** Vue 3, Vuetify 4, Pinia, vue-router, vue-i18n, TypeScript, Vite with `vite-plugin-pwa`, Firebase Auth and Firestore (web SDK), Vitest (jsdom), Playwright with the Auth and Firestore emulators, Firebase Hosting, GitHub Actions CI (`.github/workflows/ci.yml`), Bubblewrap CLI `1.27.0` with the Android SDK.

**Spec:** `docs/specs/2026-11-04-android-twa.md`

## Global Constraints

- §2.1: "Every new user-facing string is in both `src/locales/en.json` and `src/locales/hi.json`. The English is the copy in this spec, word for word." The implementer writes the Hindi; the PR lists it for a Hindi reader to check. `tests/unit/locales.spec.ts` checks the two files have the same keys.
- §2.2: "Only `src/services/firebase.ts` calls Firebase; views go through stores."
- §2.3: "No new paid Firebase product and no server code."
- Store write actions catch their own errors, call `session.showError(err, '<i18n key>')` and resolve to `false` or `null`; slow calls go through `session.track(...)` (conventions).
- Unit tests are `tests/unit/<subject>.spec.ts` (Vitest, jsdom); end-to-end tests are `tests/e2e/<flow>.spec.ts`, Playwright on a production build against the emulators, run with `npm run test:e2e`. A task runs only the tests it writes, each by name.
- The package name is `in.spanion.flashcards` and the TWA host is `flashcards.spanion.in` (decisions `android-package-name`, `twa-built-with-bubblewrap`).
- The privacy contact is `Ankit Kumar Pandit`, `panditankit1995@gmail.com` (decision `privacy-contact`).

## Checkpoints

None. The policy sets `run.checkpoints: none`.

---

### Task 1: Redirect sign-in, public routes and shared config

**Files:**
- Create: `src/services/authDomain.ts`
- Modify: `src/services/firebase.ts`
- Modify: `src/services/authErrors.ts`
- Modify: `src/stores/session.ts`
- Modify: `src/main.ts`
- Modify: `src/views/Login.vue`
- Modify: `src/router/index.ts`
- Modify: `src/locales/en.json`
- Modify: `src/locales/hi.json`
- Create: `pwa-manifest.ts`
- Modify: `vite.config.ts`
- Modify: `tsconfig.json`
- Create: `public/img/icons/maskable-512x512.png`
- Modify: `package.json`
- Modify: `.gitignore`
- Modify: `README.md`
- Test: `tests/unit/authDomain.spec.ts`
- Test: `tests/unit/authErrors.spec.ts`
- Test: `tests/unit/router.spec.ts`
- Test: `tests/e2e/google-sign-in.spec.ts`

**Interfaces:**
- Consumes: existing `getServices()`, `GoogleAuthProvider` use and `authRedirect()`.
- Produces (used by Tasks 2, 3 and 4):

```ts
// src/services/authDomain.ts (no Firebase imports)
export function authDomainFor(host: string | undefined, useEmulators: boolean, configured: string): string;

// src/services/firebase.ts
export type RedirectOutcome =
  | { operationType: 'signIn' | 'reauthenticate' | 'link'; uid: string }
  | { error: unknown };
export function signInWithGoogle(): Promise<void>;
export function getRedirectOutcome(): Promise<RedirectOutcome | null>;

// src/stores/session.ts (added to useSessionStore)
redirectOutcome: Ref<RedirectOutcome | null>;
loadRedirectOutcome(): Promise<void>;

// src/router/index.ts
interface RouteMeta { requireAuth?: boolean; public?: boolean }
export function authRedirect(
  to: { fullPath: string; meta: { requireAuth?: boolean; public?: boolean }; query: Record<string, unknown> },
  signedIn: boolean,
): true | RouteLocationRaw;

// pwa-manifest.ts (repository root, imported by vite.config.ts; no Vite imports)
export const pwaManifest: Partial<ManifestOptions>; // type from vite-plugin-pwa

// src/services/authErrors.ts: isAuthCancel now true only for
// 'auth/redirect-cancelled-by-user' and 'auth/user-cancelled'
```

New npm scripts in `package.json`:

```json
"twa:update": "cd android && npx --yes @bubblewrap/cli@1.27.0 update --skipVersionUpgrade",
"twa:build": "cd android && npx --yes @bubblewrap/cli@1.27.0 build"
```

New locale keys, English copy exactly as here, Hindi in `hi.json` under the same keys. Remove `auth.error.popup-blocked` from both files.

```json
{
  "auth": { "error": {
    "user-mismatch": "That's a different Google account. Choose the account you signed in with.",
    "recent-login": "Please confirm it's you again, then try once more."
  } },
  "account": { "delete": {
    "button": "Delete account",
    "title": "Delete your account?",
    "body": "This deletes your account and all your sets, cards and labels. It can't be undone.",
    "password": "Password",
    "confirm": "Delete my account",
    "google": "Continue with Google",
    "confirmed": "You're confirmed. Delete your account now?",
    "done": "Your account has been deleted.",
    "error": "Couldn't delete your account. Please try again."
  } },
  "links": { "privacy": "Privacy policy", "delete": "Delete account" },
  "privacy": {
    "title": "Privacy policy",
    "updated": "Last updated: 4 November 2026",
    "intro": "Flashcards is made by Ankit Kumar Pandit. This policy explains what the app stores and what you can do about it.",
    "store": {
      "title": "What we store",
      "account": "Your account: your email address, and, if you add them or sign in with Google, your name and profile photo link.",
      "content": "What you create: your sets, cards and labels.",
      "settings": "Settings such as language and dark mode stay on your device only."
    },
    "use": { "title": "How it is used", "body": "Only to sign you in and to show and save your sets. We don't show ads, we don't use analytics, and we don't sell or share your data with anyone." },
    "where": { "title": "Where it is kept", "body": "With Google Firebase (Authentication and Cloud Firestore), which stores it for us. Data travels encrypted." },
    "delete": { "title": "Deleting your data", "body": "You can delete your account and everything in it from your profile in the app. Deletion is immediate and permanent; we keep no backups. If you can't sign in, see Delete account." },
    "children": { "title": "Children", "body": "Flashcards is meant for people aged 13 and over and is not directed at children under 13." },
    "contact": { "title": "Contact", "body": "Ankit Kumar Pandit, {email}" },
    "changes": "If this policy changes, the date above changes with it."
  },
  "deletion": {
    "title": "Delete your Flashcards account",
    "intro": "Deleting your account removes your sign-in, your sets, cards and labels, straight away and for good. Nothing is kept.",
    "app": { "title": "In the app:", "body": "open your profile, choose Delete account, and confirm it's you." },
    "signin": "Sign in to delete",
    "profile": "Go to profile",
    "email": { "title": "Can't sign in?", "body": "Email {email} from the address on your account, asking to delete it. We delete it within 30 days and reply to confirm." }
  }
}
```

**Spec:**
- §3.1: "`signInWithGoogle` calls `signInWithRedirect(auth, new GoogleAuthProvider())`. `signInWithPopup` is no longer used anywhere."
- §3.2: "The Firebase config's `authDomain` is `window.location.host` when the app runs in a browser and isn't using the emulators; otherwise it is `VUE_APP_AUTH_DOMAIN`. `VUE_APP_AUTH_DOMAIN` stays required, as today."
- §3.3: "The Vite dev server proxies `/__` to `https://<VUE_APP_PROJECT_ID>.firebaseapp.com` (`changeOrigin: true`), so the auth helper pages exist in dev."
- §3.4: "A new `getRedirectOutcome()` in `firebase.ts` wraps `getRedirectResult` and resolves to `{ operationType, uid } | { error } | null`. The session store calls it once at start-up and keeps the outcome, for the login screen (an error) and the profile screen (§4). A sign-in error is shown with `authErrorMessage`."
- §3.5: "While the redirect starts, the Google button shows its loading state. Pressing back on Google's page returns to `/login` with no error shown."
- §3.6: "After a successful redirect the user lands on `/login?redirect=…` again, and the existing guard sends them on through `safeRedirect`."
- §3.7: "`src/services/authErrors.ts` drops `auth/popup-blocked` and the popup checks in `isAuthCancel`, and their locale keys."
- §3.8: README "Domains" lists the redirect URIs `https://flashcards.spanion.in/__/auth/handler`, `https://spanion-flash-cards.web.app/__/auth/handler`, `http://localhost:8080/__/auth/handler`.
- §5.1: "Routes with `meta: { public: true }` are let through for signed-in and signed-out users: `authRedirect` returns `true` for them."
- §6.1: "`VitePWA`'s manifest in `vite.config.ts` gains `id: '/'` and `scope: '/'`, and `display` becomes `standalone`. No `orientation`."
- §6.2: "The 512 icon becomes `purpose: 'any'`. A new `img/icons/maskable-512x512.png` is `purpose: 'maskable'`. It is the existing 512 icon padded on its own `#ECECEC` background to 580px and scaled back to 512px."
- §7.4: "`npm run twa:update` and `npm run twa:build` run Bubblewrap in `android/`."
- §7.5: "`.gitignore` adds `*.jks`, `*.keystore`, `android/**/build/`, `android/.gradle/`, `android/local.properties`, `*.aab`, `*.apk` and `*.idsig`."

**Tags:** security, failure-paths

**Knowledge:**
- `features/sign-in`: Google sign-in leaves the page for Google and comes back to `/login`, whose guard sends the user on; a failed redirect's error shows on `/login`.
- `security/auth`: the auth domain is the host serving the app, so Google's handler is always same-origin; `getRedirectResult` runs once at start-up.
- `apps/flash-cards`: routes with `meta.public` (`/privacy`, `/delete-account`) are open to everyone; every other route except `/login` needs a signed-in user.
- `operations/environment`: `VUE_APP_AUTH_DOMAIN` is only the fallback auth domain (emulators, non-browser); the dev server proxies `/__` to the project's `firebaseapp.com`.
- `operations/run-locally`: Google sign-in in dev needs `http://localhost:8080/__/auth/handler` on the OAuth web client.

**Acceptance:**
- Given host `flashcards.spanion.in`, emulators off, configured `flashcards.spanion.in`, then `authDomainFor` returns `flashcards.spanion.in`.
- Given host `spanion-flash-cards.web.app`, emulators off, then `authDomainFor` returns `spanion-flash-cards.web.app`.
- Given host `localhost:8080`, emulators off, then `authDomainFor` returns `localhost:8080`.
- Given emulators on, host `localhost:4317`, configured `demo.firebaseapp.com`, then it returns `demo.firebaseapp.com`.
- Given no host (not in a browser), then it returns the configured value.
- Given error `{ code: 'auth/user-mismatch' }`, then `authErrorMessage` gives "That's a different Google account. Choose the account you signed in with."
- Given `{ code: 'auth/requires-recent-login' }`, then it gives "Please confirm it's you again, then try once more."
- Given `{ code: 'auth/popup-blocked' }`, then it no longer maps to a locale key (falls back to the error's message).
- Given `{ code: 'auth/redirect-cancelled-by-user' }`, then `isAuthCancel` is `true`.
- Given `{ code: 'auth/popup-closed-by-user' }` or `{ code: 'auth/unauthorized-domain' }`, then `isAuthCancel` is `false`.
- Given a route `/privacy` with `meta.public`, then `authRedirect` returns `true` for a signed-out user and for a signed-in user, even with `?redirect=/bin`.
- Given a route without `meta.public` or `meta.requireAuth` (`/login`), then a signed-in user is still sent on to the redirect target, as today.
- E2e (emulators): a signed-out user on `/login?redirect=/settings` clicks the Google button, completes the Auth emulator's Google sign-in page (add a new account, auto-generate the user, sign in), and lands on `/settings` signed in, with no error message shown.
- E2e (emulators): back on `/login`, cancelling on the emulator's page or pressing back leaves the user on `/login` with no error message.
- The web manifest built by `npx vite build` has `id` `/`, `scope` `/`, `display` `standalone`, no `orientation`, the 512 icon with purpose `any`, and `img/icons/maskable-512x512.png` with purpose `maskable`. The maskable PNG is 512×512 (`sips -g pixelWidth -g pixelHeight`).

- [ ] **Step 1: Write the failing tests** for the unit Acceptance cases in `tests/unit/authDomain.spec.ts`, `tests/unit/authErrors.spec.ts` (replace the popup case) and `tests/unit/router.spec.ts`, and the two e2e cases in `tests/e2e/google-sign-in.spec.ts`. Create `src/services/authDomain.ts` with the real signature returning the configured value, so the tests fail on behaviour.

- [ ] **Step 2: Run them to verify they fail**

Run: `npx vitest run tests/unit/authDomain.spec.ts tests/unit/authErrors.spec.ts tests/unit/router.spec.ts`
Expected: FAIL on the assertions for the new cases.

- [ ] **Step 3: Write the minimal implementation** to the Interfaces:
  - `authDomainFor` and its use in `firebase.ts`'s config.
  - `signInWithRedirect` and `getRedirectOutcome`.
  - `redirectOutcome` and `loadRedirectOutcome` in the session store, called once from `src/main.ts` after Pinia is installed.
  - Login shows a redirect error through `authErrorMessage`, and keeps the Google button loading after it's clicked.
  - The `meta.public` branch in `authRedirect`.
  - The locale keys.
  - The manifest moves to `pwaManifest` in `pwa-manifest.ts`, with the §6.1 and §6.2 changes, and `vite.config.ts` passes it to `VitePWA`. Add `pwa-manifest.ts` to the `include` in `tsconfig.json` only if `npx vue-tsc --noEmit` doesn't already cover it.
  - The dev-server proxy in `vite.config.ts`. Read `VUE_APP_PROJECT_ID` with `loadEnv(mode, process.cwd(), 'VUE_APP_')`, and add the proxy only when it is set.
  - The maskable icon, made with `sips --padToHeightWidth 580 580 --padColor ECECEC` on a copy of `public/img/icons/android-chrome-512x512.png`, then `sips -z 512 512`.
  - The npm scripts, the `.gitignore` lines, and the README "Domains" redirect URIs, replacing the popup wording there.

- [ ] **Step 4: Run them to verify they pass**

Run: `npx vitest run tests/unit/authDomain.spec.ts tests/unit/authErrors.spec.ts tests/unit/router.spec.ts tests/unit/locales.spec.ts`
Expected: PASS

- [ ] **Step 5: Run the new e2e test**

Run: `npm run build:e2e && npx --yes firebase-tools@15.34.2 emulators:exec --only auth,firestore --project demo-flash-cards "npx playwright test tests/e2e/google-sign-in.spec.ts"`
Expected: PASS on both projects.

- [ ] **Step 6: Commit**

```bash
git add src/services/authDomain.ts src/services/firebase.ts src/services/authErrors.ts src/stores/session.ts src/main.ts src/views/Login.vue src/router/index.ts src/locales/en.json src/locales/hi.json pwa-manifest.ts vite.config.ts tsconfig.json public/img/icons/maskable-512x512.png package.json .gitignore README.md tests/unit/authDomain.spec.ts tests/unit/authErrors.spec.ts tests/unit/router.spec.ts tests/e2e/google-sign-in.spec.ts
git commit -m "Sign in with Google by same-origin redirect and add the shared TWA config."
```

---

### Task 2: Account deletion

**Files:**
- Create: `src/services/ownedCollections.ts`
- Modify: `src/services/firebase.ts`
- Create: `src/utils/pendingDelete.ts`
- Create: `src/stores/account.ts`
- Create: `src/components/DialogDeleteAccount.vue`
- Modify: `src/views/Profile.vue`
- Test: `tests/unit/ownedCollections.spec.ts`
- Test: `tests/unit/pendingDelete.spec.ts`
- Test: `tests/e2e/account-deletion.spec.ts`

**Interfaces:**
- Consumes: `RedirectOutcome`, `session.redirectOutcome` (Task 1); the `account.delete.*` locale keys (Task 1); existing `session.showError`, `session.showSnack`, `session.track`, `library.reset()`.
- Produces:

```ts
// src/services/ownedCollections.ts (no Firebase imports)
export interface OwnedCollection { name: string; ownerField: string }
export const OWNED_COLLECTIONS: readonly OwnedCollection[];

// src/services/firebase.ts
export function confirmMethod(): 'password' | 'google';
export function reauthenticateWithPassword(password: string): Promise<void>;
export function reauthenticateWithGoogle(): Promise<void>;
export function deleteAccount(): Promise<void>;

// src/utils/pendingDelete.ts
export const PENDING_DELETE_KEY = 'flashcards.pendingDelete';
export const PENDING_DELETE_MAX_AGE_MS: number; // 300000, five minutes
export interface PendingDelete { uid: string; at: number }
export function readPendingDelete(storage: Storage): PendingDelete | null;
export function writePendingDelete(storage: Storage, value: PendingDelete): void;
export function clearPendingDelete(storage: Storage): void;
export function shouldResumeDeletion(
  pending: PendingDelete | null,
  outcome: RedirectOutcome | null,
  uid: string,
  now: number,
): boolean;

// src/stores/account.ts: useAccountStore (setup store) exposes
interface AccountStore {
  confirmWithPassword(password: string): Promise<boolean>;
  confirmWithGoogle(): Promise<void>;
  deleteAccount(): Promise<boolean>;
}
```

**Spec:**
- §4.1: "`OWNED_COLLECTIONS` in `src/services/ownedCollections.ts` (no Firebase imports, so a unit test can read it; `firebase.ts` uses it) lists each collection a user owns and its owner field: `[{ name: 'flash-card-sets', ownerField: 'uid' }, { name: 'labels', ownerField: 'uid' }]`."
- §4.1: "`deleteAccount()` queries each of `OWNED_COLLECTIONS` with `where(ownerField, '==', uid)`, where `uid` is the current user's, deletes the documents with `writeBatch` in chunks of at most `500`, then calls `deleteUser`."
- §4.1: "Which confirmation a user gets: `password` when `providerData` has `password`, otherwise Google."
- §4.2: "Google users: a button "Continue with Google". It stores `{ uid, at }` under the `sessionStorage` key `flashcards.pendingDelete`, then starts the reconfirmation redirect."
- §4.2: "Back from Google, `/profile` reopens the dialog with the body plus "You're confirmed. Delete your account now?" and the button "Delete my account", only when the redirect outcome is `reauthenticate` for the same `uid` and the stored `at` is under `5 minutes` old. The key is removed either way. Nothing is deleted without that tap."
- §4.2: "A failed reconfirmation shows its error, and the dialog stays at its first step."
- §4.2: "While deleting, the button shows loading and the dialog can't be closed. On success: library reset, toast "Your account has been deleted.", and the auth listener moves to `/login`. On failure: the error is shown (`session.showError`, fallback "Couldn't delete your account. Please try again."), and a retry deletes whatever is left."
- §4.3: "the `OWNED_COLLECTIONS` names cover every `match /<collection>/{…}` in `firestore.rules`. A collection that isn't user-owned has to be named in the test's own exception list. Today that list is empty."

**Tags:** security, failure-paths, screen

**Knowledge:**
- `features/account-deletion` (new): Delete account on `/profile` re-confirms identity (password, or a Google redirect and a final tap within 5 minutes) and then removes every owned collection's documents, then the Auth user.
- `requirements/account-deletion-and-export`: deletion is met by `features/account-deletion`; export is still open.
- `data/model`: `OWNED_COLLECTIONS` in `src/services/ownedCollections.ts` lists the collections a user owns, for account deletion.
- `security/data-protection`: a user can delete all their data from the app; nothing is kept.

**Acceptance:**
- Given `firestore.rules` as it is, then every `match /<collection>/{…}` name appears in `OWNED_COLLECTIONS`. Adding a `match /other/{id}` to a copy of the rules text passed to the test's helper fails it.
- Given a stored `{ uid: 'u1', at: now - 60_000 }` and outcome `{ operationType: 'reauthenticate', uid: 'u1' }` for user `u1`, then `shouldResumeDeletion` is `true`.
- Given the same with `at: now - 300_001`, then `false`.
- Given the stored uid `u2` with user `u1`, then `false`.
- Given outcome `{ operationType: 'signIn', uid: 'u1' }`, then `false`.
- Given outcome `{ error }`, then `false`.
- Given no stored value, then `false`.
- Given `sessionStorage` holding `not json` under `flashcards.pendingDelete`, then `readPendingDelete` returns `null`.
- E2e (emulators, email): a signed-up user with one set (`createSet`) and one label (created on `/profile`) opens Delete account and sees "Delete your account?" and "This deletes your account and all your sets, cards and labels. It can't be undone.".
- In that dialog, a wrong password shows "Incorrect email or password." and nothing is deleted.
- With the right password and "Delete my account", the user lands on `/login`, sees "Your account has been deleted.", and can't sign in with that email again ("Incorrect email or password.").
- After deletion, the Firestore emulator holds no `flash-card-sets` or `labels` document with that user's uid. Look up the uid by email from the Auth emulator's REST accounts list before deleting, and query Firestore's REST API with `Authorization: Bearer owner`.
- E2e (emulators, Google): a user signed in through the emulator's Google page opens Delete account and sees "Continue with Google". Choosing the same account on the emulator's page brings them back to `/profile` with "You're confirmed. Delete your account now?". "Delete my account" lands on `/login` with "Your account has been deleted.".
- E2e: "Cancel" in the first step closes the dialog, and the user stays signed in on `/profile`.

- [ ] **Step 1: Write the failing tests** for the unit cases in `tests/unit/ownedCollections.spec.ts` and `tests/unit/pendingDelete.spec.ts`, and the e2e cases in `tests/e2e/account-deletion.spec.ts`. Create `src/services/ownedCollections.ts` with an empty `OWNED_COLLECTIONS`, and `src/utils/pendingDelete.ts` with the real signatures returning `null` or `false`.

- [ ] **Step 2: Run them to verify they fail**

Run: `npx vitest run tests/unit/ownedCollections.spec.ts tests/unit/pendingDelete.spec.ts`
Expected: FAIL on the assertions.

- [ ] **Step 3: Write the minimal implementation** to the Interfaces:
  - The service functions.
  - The account store, following the store error convention.
  - `DialogDeleteAccount.vue`: first step, the confirmed step, and loading.
  - The Delete account button on `Profile.vue`, above Sign out, in the error colour.
  - `Profile.vue` reopening the dialog on mount when `shouldResumeDeletion` is true, and clearing the key either way.
  - A failed reconfirmation outcome on `/profile` shows its error through `authErrorMessage`.

- [ ] **Step 4: Run them to verify they pass**

Run: `npx vitest run tests/unit/ownedCollections.spec.ts tests/unit/pendingDelete.spec.ts`
Expected: PASS

- [ ] **Step 5: Run the new e2e test**

Run: `npm run build:e2e && npx --yes firebase-tools@15.34.2 emulators:exec --only auth,firestore --project demo-flash-cards "npx playwright test tests/e2e/account-deletion.spec.ts"`
Expected: PASS on both projects.

- [ ] **Step 6: Commit**

```bash
git add src/services/ownedCollections.ts src/services/firebase.ts src/utils/pendingDelete.ts src/stores/account.ts src/components/DialogDeleteAccount.vue src/views/Profile.vue tests/unit/ownedCollections.spec.ts tests/unit/pendingDelete.spec.ts tests/e2e/account-deletion.spec.ts
git commit -m "Let users delete their account and all their data from the profile screen."
```

---

### Task 3: Privacy and delete-account pages

**Files:**
- Create: `src/utils/contact.ts`
- Create: `src/views/Privacy.vue`
- Create: `src/views/Deletion.vue`
- Modify: `src/router/index.ts`
- Modify: `src/views/Login.vue`
- Modify: `src/views/Info.vue`
- Modify: `tests/e2e/a11y.spec.ts`
- Test: `tests/e2e/public-pages.spec.ts`

**Interfaces:**
- Consumes: `meta.public` in `authRedirect` (Task 1); the `privacy.*`, `deletion.*` and `links.*` locale keys (Task 1); existing `BarTop` and `session.user`.
- Produces:

```ts
// src/utils/contact.ts
export const CONTACT_EMAIL = 'panditankit1995@gmail.com';
```

| Route | Name | View | Meta |
|---|---|---|---|
| `/privacy` | `privacy` | `src/views/Privacy.vue` | `{ public: true }` |
| `/delete-account` | `delete-account` | `src/views/Deletion.vue` | `{ public: true }` |

**Spec:**
- §5.2: "`/privacy` (`src/views/Privacy.vue`) and `/delete-account` (`src/views/Deletion.vue`) are public. Each has a back button: to `/home` when signed in, `/login` when not."
- §5.3: "Links: the login screen shows "Privacy policy" and "Delete account" under the form. The info screen lists "Privacy policy" and "Delete account"."
- §5.4: the privacy policy copy, as the `privacy.*` keys hold it. The email is a `mailto:` link, and "Delete account" in the deletion paragraph links to `/delete-account`.
- §5.5: "Deleting your account removes your sign-in, your sets, cards and labels, straight away and for good." The rest of the page is the `deletion.*` keys. Its button is `deletion.signin`, to `/login?redirect=/profile`, or `deletion.profile`, to `/profile`, when signed in. The email is a `mailto:` link.

**Tags:** security, screen, failure-paths

**Knowledge:**
- `features/privacy-and-deletion-pages` (new): `/privacy` and `/delete-account` are public pages, linked from login and info, that Play's listing points at.
- `features/settings-and-about`: the info screen links to the privacy policy and the delete-account page.

**Acceptance:**
- Given a signed-out visitor, when they open `/privacy`, then they stay on `/privacy`. They see the heading "Privacy policy", "Last updated: 4 November 2026", and a link `mailto:panditankit1995@gmail.com`.
- Given a signed-in user, when they open `/privacy`, then they stay on `/privacy`, and the back button goes to `/home`.
- Given a signed-out visitor on `/delete-account`, then they see "Delete your Flashcards account". "Sign in to delete" leads to `/login?redirect=/profile`, and after signing in by email they land on `/profile`.
- Given a signed-in user on `/delete-account`, then they see "Go to profile", which leads to `/profile`.
- On `/delete-account`, "Can't sign in?" is followed by text containing "within 30 days" and a `mailto:panditankit1995@gmail.com` link.
- On `/login`, the links "Privacy policy" and "Delete account" lead to `/privacy` and `/delete-account`.
- On `/info`, "Privacy policy" and "Delete account" lead to the same pages.
- `/privacy` and `/delete-account` pass the axe scan in `tests/e2e/a11y.spec.ts`, signed out, at both Playwright projects' widths.

- [ ] **Step 1: Write the failing tests** for each Acceptance case in `tests/e2e/public-pages.spec.ts`, and add the two pages to the scans in `tests/e2e/a11y.spec.ts`.

- [ ] **Step 2: Run them to verify they fail**

Run: `npm run build:e2e && npx --yes firebase-tools@15.34.2 emulators:exec --only auth,firestore --project demo-flash-cards "npx playwright test tests/e2e/public-pages.spec.ts tests/e2e/a11y.spec.ts"`
Expected: FAIL: the pages redirect to `/home` or `/login`.

- [ ] **Step 3: Write the minimal implementation**:
  - The contact constant.
  - The two views, in the existing screen style (a `BarTop` with a back button, then text).
  - The two routes with `meta: { public: true }`.
  - The links on `Login.vue` and `Info.vue`.

- [ ] **Step 4: Run them to verify they pass**

Run: `npm run build:e2e && npx --yes firebase-tools@15.34.2 emulators:exec --only auth,firestore --project demo-flash-cards "npx playwright test tests/e2e/public-pages.spec.ts tests/e2e/a11y.spec.ts"`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/utils/contact.ts src/views/Privacy.vue src/views/Deletion.vue src/router/index.ts src/views/Login.vue src/views/Info.vue tests/e2e/a11y.spec.ts tests/e2e/public-pages.spec.ts
git commit -m "Add public privacy policy and delete-account pages."
```

---

### Task 4: Bubblewrap Android project and asset links

**Files:**
- Create: `android/twa-manifest.json`
- Create: `android/` (the Gradle project Bubblewrap generates: `android/build.gradle`, `android/settings.gradle`, `android/gradle.properties`, `android/gradlew`, `android/gradlew.bat`, `android/gradle/wrapper/gradle-wrapper.jar`, `android/gradle/wrapper/gradle-wrapper.properties`, `android/app/build.gradle`, `android/app/src/main/AndroidManifest.xml`, `android/app/src/main/java/in/spanion/flashcards/*.java`, `android/app/src/main/res/**`, and every other file it writes)
- Create: `public/.well-known/assetlinks.json`
- Modify: `README.md`
- Test: `tests/unit/twa.spec.ts`

**Interfaces:**
- Consumes: `pwaManifest` from `pwa-manifest.ts` and `img/icons/maskable-512x512.png` (Task 1); the `twa:update` script (Task 1).
- Produces:

```json
// public/.well-known/assetlinks.json
[{
  "relation": ["delegate_permission/common.handle_all_urls"],
  "target": { "namespace": "android_app", "package_name": "in.spanion.flashcards", "sha256_cert_fingerprints": [] }
}]
```

```json
// android/twa-manifest.json, the fields this plan fixes (Bubblewrap adds its own defaults)
{
  "packageId": "in.spanion.flashcards",
  "host": "flashcards.spanion.in",
  "name": "Flashcards - Learn & Memorize",
  "launcherName": "Flashcards",
  "startUrl": "/",
  "display": "standalone",
  "orientation": "portrait",
  "themeColor": "#E91E63",
  "backgroundColor": "#ECECEC",
  "fallbackType": "customtabs",
  "enableNotifications": false,
  "iconUrl": "https://flashcards.spanion.in/img/icons/android-chrome-512x512.png",
  "maskableIconUrl": "https://flashcards.spanion.in/img/icons/maskable-512x512.png",
  "webManifestUrl": "https://flashcards.spanion.in/manifest.webmanifest",
  "appVersionName": "1.0.0",
  "appVersionCode": 1,
  "signingKey": { "path": "~/keys/flashcards-upload.jks", "alias": "upload" }
}
```

**Spec:**
- §6.3: "`public/.well-known/assetlinks.json` holds one `delegate_permission/common.handle_all_urls` statement for `android_app` `in.spanion.flashcards`. `sha256_cert_fingerprints` starts empty."
- §6.4: "Unit test `tests/unit/twa.spec.ts`:" the package in `assetlinks.json` matches `android/twa-manifest.json`; the TWA's `host` is `flashcards.spanion.in`; every fingerprint matches `^([0-9A-F]{2}:){31}[0-9A-F]{2}$`; the TWA's `display`, `themeColor` and `backgroundColor` match the web manifest; `orientation` is `portrait` and `fallbackType` is `customtabs`.
- §7.2: "The Gradle project is generated by Bubblewrap `1.27.0` (`npx --yes @bubblewrap/cli@1.27.0 update`) and committed."
- §7.3: "It targets API `36` or later. If Bubblewrap's template targets lower, raise `targetSdkVersion` and `compileSdkVersion` in `android/app/build.gradle` and say so in the release runbook, because `update` rewrites it."
- §7.6: "If Bubblewrap needs to download a JDK or Android SDK packages, or accept a licence, the implementer stops and asks the developer."

**Tags:** security

**Knowledge:**
- `apps/android` (new): the Bubblewrap TWA project in `android/`, configured by `android/twa-manifest.json`, targeting API 36, verified against the site by `public/.well-known/assetlinks.json`.
- `operations/android-release` (new runbook): spec §8's steps, including re-raising the target SDK after `npm run twa:update` if Bubblewrap lowers it.
- `requirements/android-twa`: the packaging details it left open are decided (link the decisions).

**Acceptance:**
- Given the committed files, then `assetlinks.json`'s `package_name` equals `twa-manifest.json`'s `packageId`, and both are `in.spanion.flashcards`.
- `host` is `flashcards.spanion.in`.
- Given a fingerprint `AB:CD` added to a copy of the asset links passed to the test's validator, then the validator rejects it. A well-formed 32-pair uppercase fingerprint passes. The empty list passes.
- The TWA's `display` `standalone`, `themeColor` `#E91E63` and `backgroundColor` `#ECECEC` match `pwaManifest`'s `display`, `theme_color` and `background_color`.
- `orientation` is `portrait`, `fallbackType` is `customtabs`, `enableNotifications` is `false`.
- `android/app/build.gradle` has `targetSdkVersion` and `compileSdkVersion` of at least `36`.
- `git check-ignore` reports `android/app/build/`, `android/local.properties` and a file `x.jks` as ignored.

- [ ] **Step 1: Write the failing tests** for each Acceptance case in `tests/unit/twa.spec.ts`.

- [ ] **Step 2: Run them to verify they fail**

Run: `npx vitest run tests/unit/twa.spec.ts`
Expected: FAIL: the files are missing or don't match.

- [ ] **Step 3: Write `public/.well-known/assetlinks.json` and `android/twa-manifest.json`** as in Interfaces, with `appVersionName` equal to `package.json`'s `version`.

- [ ] **Step 4: Generate the Android project.**
  1. Write `~/.bubblewrap/config.json`, pointing `jdkPath` at the installed JDK (`/usr/libexec/java_home`) and `androidSdkPath` at `~/Library/Android/sdk`.
  2. Bubblewrap downloads the icons from the URLs in `twa-manifest.json`, and the maskable one isn't live yet. Serve `public/` locally with `python3 -m http.server 8099` from `public/`, point both icon URLs at `http://localhost:8099/...` for the run, then restore the production URLs.
  3. Run `npm run twa:update`.
  4. If Bubblewrap refuses the JDK, offers to download a JDK or SDK packages, or asks to accept a licence, stop and report to the developer instead.

- [ ] **Step 5: Raise the target SDK** in `android/app/build.gradle` to `36` if the generated value is lower.

- [ ] **Step 6: Add a README section "Android app"** pointing at `android/`, the two npm scripts, and the release runbook in `knowledge/operations/android-release.md`.

- [ ] **Step 7: Run the tests to verify they pass**

Run: `npx vitest run tests/unit/twa.spec.ts`
Expected: PASS

- [ ] **Step 8: Commit.** Stage `android/` file by file, from the list `git status --porcelain android/` prints, never the directory.

```bash
git add android/twa-manifest.json public/.well-known/assetlinks.json README.md tests/unit/twa.spec.ts
git commit -m "Add the Bubblewrap Android project and the Digital Asset Links file."
```
