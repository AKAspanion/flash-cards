# Email Verification Implementation Plan

**Status:** complete, commits 3ff327a..f1c096c, 2026-11-05; record in `2026-11-05-email-verification.record.md`

> **For agentic workers:** REQUIRED SUB-SKILL: the project's workflow policy names the executor (`run.executor`): ga:feature-build-team by default, or ga:feature-build. Follow the policy and this plan's Checkpoints. Steps use checkbox (`- [ ]`) syntax for tracking.

Plan, then build; tests with each task. Say 'test-first' or 'spec it first' to work that way.

**Goal:** Email/password sign-up sends a Firebase verification email, and every signed-in screen shows a banner at the top while the user's email is unverified, with Resend email and I've verified actions, as the splitify app does.

**Architecture:** `src/services/firebase.ts` gains the three Firebase calls (send on sign-up, resend, reload-and-check). `SessionUser` carries `emailVerified`; the account store wraps resend and check with the offline refusal and error snack the store already uses. A new `BannerVerifyEmail` component, mounted once in `App.vue` above the router view, shows on `meta.requireAuth` routes while `session.user.emailVerified` is false. Verification gates nothing: it is a reminder only.

**Tech Stack:** Vue 3 + Vuetify 3 + Pinia, Firebase Auth (modular SDK), vue-i18n (`en`, `hi`), Vitest with jsdom, Playwright against the Auth and Firestore emulators (project `demo-flash-cards`, auth port from `dev-ports.ts`).

**Spec:** none: the policy suggests a spec only for large work, and this is two tasks. The reference behaviour is the splitify app's own verify-email banner and its sign-up, resend and reload helpers (a separate repository).

## Global Constraints

- Only `src/services/firebase.ts` imports from `firebase/*`; views and components go through stores (conventions).
- Every user-facing string is an i18n key present in both `src/locales/en.json` and `src/locales/hi.json` (`tests/unit/locales.spec.ts`).
- Resend and I've verified need the server: offline each refuses with the existing `toast.offline-save` snack.
- Firebase Auth errors reach the user through `authErrorMessage` (`src/services/authErrors.ts`); `auth/too-many-requests` is already mapped.
- The resend cooldown is `RESEND_COOLDOWN_SECONDS = 60`, as in splitify.
- Google sign-in users arrive verified (`emailVerified: true`) and never see the banner; email accounts created before this change that never verified do see it.
- A failed verification send never fails the sign-up: the account exists and the user is signed in, and the banner's Resend covers it.

## Checkpoints

None (`run.checkpoints: none`): the run goes from Task 1 to the final review without stopping.

## Review Focus

- The verification email fails to send at sign-up (quota, network): sign-up still lands on `/home`, the snack says the account was created without claiming an email went out, and the banner offers Resend.
- Resend pressed repeatedly: the button stays disabled for 60 s after a send, and re-enables at once if the send failed.
- I've verified pressed before the link was opened: the banner stays and the snack says so; after the link, the banner goes without a page reload.
- Offline: both actions refuse with the offline snack and make no Firebase call.
- Signed out, on `/login`, or on the public `/privacy` and `/delete-account` pages: no banner.

---

### Task 1: Verification calls, session field and account-store actions

**Files:**
- Modify: `src/services/firebase.ts`
- Modify: `src/types.ts`
- Modify: `src/stores/session.ts`
- Modify: `src/stores/account.ts`
- Modify: `src/locales/en.json`
- Modify: `src/locales/hi.json`
- Test: `tests/unit/emailVerification.spec.ts`
- Test: `tests/unit/session.spec.ts`
- Test: `tests/unit/account.spec.ts`

**Interfaces:**
- Consumes: existing `getServices()`, `toSessionUser()`, `session.patchUser()`, `session.track()`, `session.showSnack()`, `authErrorMessage()`.
- Produces:

```ts
// src/types.ts
export interface SessionUser {
  // ...existing fields
  emailVerified: boolean;
}

// src/services/firebase.ts
/** Creates the account, then tries to send the verification email; a failed send is logged, not thrown. */
export function signUpWithEmail(email: string, password: string): Promise<{ verificationSent: boolean }>;
/** Sends the verification email to the signed-in user. Rejects when nobody is signed in. */
export function sendVerificationEmail(): Promise<void>;
/** Reloads the signed-in user and, once verified, refreshes their ID token. Resolves true once verified. */
export function reloadEmailVerified(): Promise<boolean>;

// src/stores/account.ts (added to the store's return)
/** Resolves true once the email is sent; false after showing why (offline, rate limit, network). */
resendVerification(): Promise<boolean>;
/** Resolves true, and sets session.user.emailVerified, once verified; false after showing why. */
checkVerified(): Promise<boolean>;
```

i18n keys added to both locale files (English copy exact; Hindi written to match and reviewed by the developer on the PR):

| Key | English |
|---|---|
| `toast.success.sign-up-verify` | `Account created. Check your inbox to verify your email.` |
| `verify.banner` | `Verify your email to keep your account safe.` |
| `verify.resend` | `Resend email` |
| `verify.check` | `I've verified` |
| `verify.sent` | `Sent. Check your inbox.` |
| `verify.not-yet` | `Not verified yet. Open the link in the email first.` |
| `verify.done` | `Email verified.` |

The existing `toast.success.sign-up` (`Account created successfully!`) stays, for a sign-up whose email didn't send.

**Spec:** none

**Tags:** security, failure-paths

**Knowledge:** `features/sign-in`: email sign-up sends a Firebase verification email, and a failed send doesn't fail the sign-up. `security/auth`: email verification is a reminder only; no rule or route requires `emailVerified`.

**Acceptance:**
- Given Firebase creates the account, when `signUpWithEmail(' a@b.test ', 'secret1')` runs, then it creates the account with `a@b.test` (trimmed), calls `sendEmailVerification` with the new user, and resolves `{ verificationSent: true }`.
- Given `sendEmailVerification` rejects, when `signUpWithEmail` runs, then it still resolves, with `{ verificationSent: false }`, and logs the error.
- Given `createUserWithEmailAndPassword` rejects with `auth/email-already-in-use`, when `signUpWithEmail` runs, then it rejects with that error and sends no email.
- Given nobody is signed in, when `sendVerificationEmail()` runs, then it rejects and calls nothing.
- Given the current user reloads as verified, when `reloadEmailVerified()` runs, then it calls `reload()`, then `getIdToken(true)`, and resolves `true`; reloaded as unverified, it resolves `false` and doesn't refresh the token.
- Given a Firebase `User` with `emailVerified: true`, when `toSessionUser` maps it, then the result has `emailVerified: true`; with `false`, `false`.
- Given the device is offline, when `resendVerification()` or `checkVerified()` runs, then it shows `toast.offline-save`, calls no api function and resolves `false`.
- Given online and the send succeeds, when `resendVerification()` runs, then it resolves `true` and shows `verify.sent`.
- Given the send rejects with `auth/too-many-requests`, when `resendVerification()` runs, then it shows `authErrorMessage`'s text for it (`auth.error.too-many-requests`) and resolves `false`.
- Given `reloadEmailVerified` resolves `true`, when `checkVerified()` runs, then `session.user.emailVerified` becomes `true`, the snack shows `verify.done`, and it resolves `true`.
- Given `reloadEmailVerified` resolves `false`, when `checkVerified()` runs, then `session.user.emailVerified` stays `false`, the snack shows `verify.not-yet`, and it resolves `false`.
- Given `reloadEmailVerified` rejects with `auth/network-request-failed`, when `checkVerified()` runs, then it shows `auth.error.network`'s text and resolves `false`.

- [x] **Step 1: Write the failing tests** for each Acceptance case: the Firebase calls in `tests/unit/emailVerification.spec.ts` (mock `firebase/app`, `firebase/auth` and `firebase/firestore` as `tests/unit/signOutAndClear.spec.ts` does), the mapping in `tests/unit/session.spec.ts`, the store actions in `tests/unit/account.spec.ts` (its existing `api` mock gains `sendVerificationEmail` and `reloadEmailVerified`)

- [x] **Step 2: Run them to verify they fail**

Run: `npx vitest run tests/unit/emailVerification.spec.ts tests/unit/session.spec.ts tests/unit/account.spec.ts`
Expected: FAIL on the assertions. Add the three functions and two actions with their real signatures first, so the failure is behaviour, not "not a function"

- [x] **Step 3: Write the minimal implementation** to the Interfaces, until they pass, and add the seven i18n keys to both locale files

- [x] **Step 4: Run them to verify they pass**

Run: `npx vitest run tests/unit/emailVerification.spec.ts tests/unit/session.spec.ts tests/unit/account.spec.ts tests/unit/locales.spec.ts`
Expected: PASS

- [x] **Step 5: Commit**

```bash
git add src/services/firebase.ts src/types.ts src/stores/session.ts src/stores/account.ts src/locales/en.json src/locales/hi.json tests/unit/emailVerification.spec.ts tests/unit/session.spec.ts tests/unit/account.spec.ts
git commit -m "Send a verification email on sign-up and add resend and check actions to the account store."
```

### Task 2: Verify-email banner and sign-up message

**Files:**
- Create: `src/components/BannerVerifyEmail.vue`
- Modify: `src/App.vue`
- Modify: `src/views/Login.vue`
- Test: `tests/unit/BannerVerifyEmail.spec.ts`
- Test: `tests/e2e/verify-email.spec.ts`

**Interfaces:**
- Consumes: `signUpWithEmail(): Promise<{ verificationSent: boolean }>` (Task 1), `useAccountStore().resendVerification()` and `checkVerified()` (Task 1), `SessionUser.emailVerified` (Task 1), the seven `verify.*` / `toast.success.sign-up-verify` keys (Task 1), existing `useSessionStore()`, existing `route.meta.requireAuth`.
- Produces: `<banner-verify-email />`, no props, no events; renders nothing unless shown.

**Spec:** none

**Tags:** security, screen, failure-paths

**Knowledge:** `features/sign-in`: after an email sign-up the snack says to check the inbox, or only that the account was created when the email didn't send. `features/email-verification` (new): the banner's rules, where it shows, the 60 s resend cooldown, and that it gates nothing. `design-system/components`: `BannerVerifyEmail` is the top-of-screen reminder mounted once in `App.vue`.

**Acceptance:**
- Given a signed-in user with `emailVerified: false` on a `requireAuth` route, when the app renders, then a `v-banner` with `role="status"` sits at the top of `v-main`, above the router view, reading `Verify your email to keep your account safe.` with buttons `Resend email` and `I've verified`.
- Given `emailVerified: true`, or no user, or a route without `requireAuth` (`/login`, `/privacy`, `/delete-account`), when the app renders, then no banner renders.
- Given Resend email is pressed and `resendVerification()` resolves `true`, then the button is disabled and shows the seconds left (`Resend email (59)` counting down), and is enabled again after 60 s.
- Given Resend email is pressed and `resendVerification()` resolves `false`, then the button is enabled again at once.
- Given I've verified is pressed, then the button shows loading until `checkVerified()` settles; when it resolves `true` the banner disappears without a page reload.
- Given an email sign-up whose `verificationSent` is `true`, when it lands on `/home`, then the snack reads `Account created. Check your inbox to verify your email.`; when `false`, it reads `Account created successfully!`.
- E2E, `tests/e2e/verify-email.spec.ts`: sign up with `signUp()` from `tests/e2e/helpers.ts`; the banner is visible on `/home`; press I've verified and see `Not verified yet. Open the link in the email first.` with the banner still there; fetch the `VERIFY_EMAIL` code for that email from the Auth emulator's `GET /emulator/v1/projects/demo-flash-cards/oobCodes` (host `127.0.0.1`, port `auth` from `dev-ports.ts`) and request its `oobLink`; press I've verified and see `Email verified.` and no banner; reload `/home` and still no banner.
- E2E, same file: press Resend email and see `Sent. Check your inbox.` and the button disabled.

- [x] **Step 1: Write the failing tests** for each unit Acceptance case in `tests/unit/BannerVerifyEmail.spec.ts` (mount with Pinia and a router; fake timers for the cooldown), and the e2e flows in `tests/e2e/verify-email.spec.ts`

- [x] **Step 2: Run the unit tests to verify they fail**

Run: `npx vitest run tests/unit/BannerVerifyEmail.spec.ts`
Expected: FAIL on the assertions. Create `BannerVerifyEmail.vue` as an empty component first, so the failure is behaviour

- [x] **Step 3: Write the minimal implementation**: the component, its mount in `App.vue` inside `v-main` above `router-view`, and the sign-up snack choice in `Login.vue`, until the unit tests pass

- [x] **Step 4: Run the unit tests to verify they pass**

Run: `npx vitest run tests/unit/BannerVerifyEmail.spec.ts`
Expected: PASS

- [x] **Step 5: Run the e2e spec alone to verify it passes**

Run: `pnpm run build:e2e && npx --yes firebase-tools@15.34.2 emulators:exec --only auth,firestore --project demo-flash-cards "playwright test tests/e2e/verify-email.spec.ts"`
Expected: PASS

- [x] **Step 6: Commit**

```bash
git add src/components/BannerVerifyEmail.vue src/App.vue src/views/Login.vue tests/unit/BannerVerifyEmail.spec.ts tests/e2e/verify-email.spec.ts
git commit -m "Show a verify-email banner on signed-in screens and say to check the inbox after sign-up."
```
