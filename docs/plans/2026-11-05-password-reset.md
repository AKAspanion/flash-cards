# Password Reset Implementation Plan

**Status:** complete, commits 43fea2c..e0e6a70, 2026-11-05; record in [2026-11-05-password-reset.record.md](2026-11-05-password-reset.record.md)

> **For agentic workers:** REQUIRED SUB-SKILL: the project's workflow policy names the executor (`run.executor`): ga:feature-build-team by default, or ga:feature-build. Follow the policy and this plan's Checkpoints. Steps use checkbox (`- [ ]`) syntax for tracking.

Plan, then build; tests with each task. Say 'test-first' or 'spec it first' to work that way.

**Goal:** A user who signed up with email and password can ask for a password reset link from `/login`.

**Architecture:** One new service call, `sendPasswordReset`, in `src/services/firebase.ts` wraps Firebase's
`sendPasswordResetEmail`. Its continue URL is the app's own `/login`, so after the user sets a new password on
Firebase's hosted action page, the Continue button brings them back to sign in. `/login` gains a third mode,
reset, next to sign-in and sign-up: an email field and a Send reset link button. The reply is the same whether or
not the address has an account.

**Tech Stack:** Vue 3 + Vuetify (`src/views/Login.vue`), Firebase Auth web SDK (`src/services/firebase.ts`), vue-i18n
(`src/locales/en.json`, `src/locales/hi.json`), Vitest (`tests/unit`), Playwright against the Auth emulator
(`tests/e2e`, `playwright.config.ts`, project `demo-flash-cards`, ports from `DEV_PORTS` in `dev-ports.ts`), pnpm.

**Spec:** none. The requirement [requirements/password-reset](../../knowledge/requirements/password-reset.md) (a
person has reviewed it) is the spec for this change, as the developer chose plan then build on 2026-11-05.

## Global Constraints

- Requirement: "From `/login`, a user enters their email address and receives a link to reset their password."
- Requirement: "The screen gives the same reply whether or not the address has an account, so it doesn't reveal who
  is registered."
- Requirement: "Errors are shown through the auth error mapping (`src/services/authErrors.ts`), in English and Hindi."
- Requirement: "Covered by an e2e test against the Auth emulator."
- Only `src/services/firebase.ts` calls Firebase; the view calls the service as the other sign-in calls do
  (conventions).
- Every user-facing string is an i18n key in both `src/locales/en.json` and `src/locales/hi.json`;
  `tests/unit/locales.spec.ts` checks that both files have the same keys.
- Emails are trimmed before they are sent to Firebase, as `signInWithEmail` does.
- Never read or print `.env.emulator` or `.env.local`.
- No task edits `knowledge/`. Each task's report lists its concepts, and one job writes them after the final review.

## Checkpoints

None (`run.checkpoints: none`). The run stops only where the developer adds a stop.

## Review Focus

- A reset requested for an unregistered address: the screen must show the same snack as for a registered one,
  including when the project's email enumeration protection is off and Firebase answers `auth/user-not-found`.
- Pressing Send reset link twice quickly: one request only (the button is busy while the first is in flight).
- An address with leading or trailing spaces, pasted from a password manager: trimmed, not refused as invalid.
- Offline, or Firebase down: the user sees the mapped network error, stays on the reset screen and keeps the address
  they typed.
- Returning from the reset mode to sign-in: the email the user typed is still filled in, so they can sign in at once
  with the new password.

---

### Task 1: Reset call, error mapping and strings

**Files:**
- Modify: `src/services/firebase.ts` (import `sendPasswordResetEmail`, add `sendPasswordReset` beside `signUpWithEmail`)
- Modify: `src/services/authErrors.ts` (add `auth/missing-email`)
- Modify: `src/locales/en.json`
- Modify: `src/locales/hi.json`
- Test: `tests/unit/passwordReset.spec.ts`
- Test: `tests/unit/authErrors.spec.ts`

**Interfaces:**
- Consumes: existing `getServices()` in `src/services/firebase.ts`, existing `authErrorMessage` and `AUTH_ERROR_KEYS`.
- Produces:

```ts
/**
 * Sends a password reset email. Resolves the same way whether or not the address has an account:
 * an `auth/user-not-found` rejection resolves instead. Every other error rejects, for authErrorMessage.
 */
export function sendPasswordReset(email: string): Promise<void>;
```

i18n keys, in both locale files:

| Key | English |
|---|---|
| `login.forgot` | `Forgot password?` |
| `login.reset.send` | `Send reset link` |
| `login.reset.back` | `Back to login` |
| `login.subtitle.reset` | `Reset your password` |
| `toast.success.reset-sent` | `If an account exists for that address, we've sent it a link to reset the password.` |
| `auth.error.missing-email` | `Please enter your email address.` |

**Spec:**
- Requirement, Acceptance: "The screen gives the same reply whether or not the address has an account, so it doesn't
  reveal who is registered."
- Requirement, Acceptance: "Errors are shown through the auth error mapping (`src/services/authErrors.ts`), in
  English and Hindi."

**Tags:** `security`, `failure-paths`

**Acceptance:**
- Given `" user@example.test "`, when `sendPasswordReset` is called, then `sendPasswordResetEmail` receives the auth
  instance, `"user@example.test"`, and action code settings whose `url` is `` `${window.location.origin}/login` ``.
- Given Firebase resolves, when `sendPasswordReset` is called, then it resolves to `undefined`.
- Given Firebase rejects with `{ code: 'auth/user-not-found' }`, when `sendPasswordReset` is called, then it resolves
  to `undefined`, exactly as for a registered address.
- Given Firebase rejects with `{ code: 'auth/invalid-email' }`, `{ code: 'auth/network-request-failed' }` or
  `{ code: 'auth/too-many-requests' }`, when `sendPasswordReset` is called, then it rejects with that same error.
- Given `{ code: 'auth/missing-email' }`, when `authErrorMessage` maps it, then the key is `auth.error.missing-email`.
- Given both locale files, when `tests/unit/locales.spec.ts` runs, then they still have the same keys (run it once,
  by name, after adding the keys).

- [x] **Step 1: Write the failing tests** for each Acceptance case: `tests/unit/passwordReset.spec.ts` mocks
  `firebase/auth` with `vi.mock` (the way `tests/unit/signOutAndClear.spec.ts` mocks the SDK), and the new
  `auth/missing-email` case goes in `tests/unit/authErrors.spec.ts`. Add `sendPasswordReset` with its real
  signature, resolving without calling Firebase, so the tests fail on behaviour.

- [x] **Step 2: Run them to verify they fail**

Run: `npx vitest run tests/unit/passwordReset.spec.ts tests/unit/authErrors.spec.ts`
Expected: FAIL on the assertions, not on a missing export.

- [x] **Step 3: Write the minimal implementation** to the Interfaces: the service call, the error-map entry, and
  the six keys in both locale files. Write the Hindi in the same register as the existing `login` and `toast` keys.

- [x] **Step 4: Run them to verify they pass**

Run: `npx vitest run tests/unit/passwordReset.spec.ts tests/unit/authErrors.spec.ts tests/unit/locales.spec.ts`
Expected: PASS

- [x] **Step 5: Commit**

```bash
git add src/services/firebase.ts src/services/authErrors.ts src/locales/en.json src/locales/hi.json tests/unit/passwordReset.spec.ts tests/unit/authErrors.spec.ts
git commit -m "Add a password reset call that answers the same for unknown addresses, with its strings in English and Hindi."
```

**Knowledge:**
- `security/auth`: `sendPasswordReset` sends Firebase's reset email with `/login` as its continue URL, and treats
  `auth/user-not-found` as sent, so the reply doesn't reveal who is registered.
- `requirements/password-reset`: the call that meets it is `sendPasswordReset` in `src/services/firebase.ts` (Sources
  gains `tests/unit/passwordReset.spec.ts`).

### Task 2: Reset mode on the login screen, with its e2e test

**Files:**
- Modify: `src/views/Login.vue`
- Test: `tests/e2e/password-reset.spec.ts`

**Interfaces:**
- Consumes: `sendPasswordReset(email: string): Promise<void>` (Task 1); the keys `login.forgot`, `login.reset.send`,
  `login.reset.back`, `login.subtitle.reset`, `toast.success.reset-sent` (Task 1); existing `authErrorMessage`,
  `session.showSnack`, `PASSWORD`, `uniqueEmail` and `signUp` from `tests/e2e/helpers.ts`.
- Produces: nothing other tasks use.

The screen's mode becomes one of `'signIn' | 'signUp' | 'reset'`, replacing the `isSignIn` boolean:

- **Sign-in mode** adds a `Forgot password?` link button (class `login__link`, `type="button"`) under the card,
  above "or". It opens reset mode and keeps the typed email.
- **Reset mode**: subtitle `Reset your password`; the email field only (no password fields), with the same
  required and no-space rules; the submit button reads `Send reset link`; the Google button and the sign-up toggle
  are hidden; a `Back to login` link button returns to sign-in mode and keeps the email.
- Submitting in reset mode validates the form as sign-in does (on submit, not by disabling the button), then calls
  `sendPasswordReset`. On success it shows `toast.success.reset-sent` and returns to sign-in mode with the email kept.
  On failure it shows `authErrorMessage(err, t)` and stays in reset mode with the email kept. It never navigates.
- While the request is in flight the submit button shows loading, and a second submit does nothing (the existing
  `busy` guard).

**Spec:**
- Requirement, Acceptance: "From `/login`, a user enters their email address and receives a link to reset their
  password."
- Requirement, Acceptance: "The screen gives the same reply whether or not the address has an account, so it doesn't
  reveal who is registered."
- Requirement, Acceptance: "Covered by an e2e test against the Auth emulator."

**Tags:** `screen`, `security`, `failure-paths`

**Acceptance:** (all in `tests/e2e/password-reset.spec.ts`)
- Given a registered user, signed out, on `/login`, when they press `Forgot password?`, then the subtitle reads
  `Reset your password`, the Email field shows, no Password field shows, and the button reads `Send reset link`.
- Given that screen with the user's email, when they press `Send reset link`, then the snack reads `If an account
  exists for that address, we've sent it a link to reset the password.`, the screen is back in sign-in mode with the
  email still filled in, and the Auth emulator's `GET /emulator/v1/projects/demo-flash-cards/oobCodes` (on
  `DEV_PORTS.auth`) lists one `PASSWORD_RESET` code for that email.
- Given that code, when the test resets the password through the emulator
  (`POST /identitytoolkit.googleapis.com/v1/accounts:resetPassword?key=fake-key` with `{ oobCode, newPassword }`)
  and signs in on `/login` with the new password, then it lands on `/home`; the old password now shows `Incorrect
  email or password.`
- Given an address with no account (`uniqueEmail()`), when the user sends a reset link, then the same snack text
  shows and the screen behaves exactly as for a registered address.
- Given `not-an-email` typed in reset mode, when the user presses `Send reset link`, then the snack reads `That email
  address is not valid.` and the screen stays in reset mode with `not-an-email` still in the field.
- Given an empty Email field in reset mode, when the user presses `Send reset link`, then the snack reads `Please
  enter your email` and no request is sent (no new code in the emulator).
- Given reset mode, when the user presses `Back to login`, then the screen is in sign-in mode (Password field and
  `Login` button visible) with the email kept.

- [x] **Step 1: Write the failing e2e tests** for each Acceptance case in `tests/e2e/password-reset.spec.ts`, reading
  the emulator's codes with Playwright's `request` fixture against `http://127.0.0.1:${DEV_PORTS.auth}`.

- [x] **Step 2: Run them to verify they fail**

Run: `pnpm run build:e2e && npx --yes firebase-tools@15.34.2 emulators:exec --only auth,firestore --project demo-flash-cards "playwright test tests/e2e/password-reset.spec.ts"`
Expected: FAIL: no `Forgot password?` button.

- [x] **Step 3: Write the minimal implementation** in `src/views/Login.vue` to the behaviour above, keeping the
  existing sign-in and sign-up behaviour and the validate-on-submit comment.

- [x] **Step 4: Run them to verify they pass**

Run: `pnpm run build:e2e && npx --yes firebase-tools@15.34.2 emulators:exec --only auth,firestore --project demo-flash-cards "playwright test tests/e2e/password-reset.spec.ts tests/e2e/auth.spec.ts"`
Expected: PASS, the existing sign-in and sign-up tests included.

- [x] **Step 5: Commit**

```bash
git add src/views/Login.vue tests/e2e/password-reset.spec.ts
git commit -m "Add a forgot password mode to the login screen that sends a reset link, with an e2e test against the Auth emulator."
```

**Knowledge:**
- `features/sign-in`: `/login` has a third mode, reset, opened by Forgot password?, which sends a reset link, gives
  the same snack for any address, and returns to sign-in with the email kept.
- `requirements/password-reset`: met by the reset mode of `src/views/Login.vue` and `tests/e2e/password-reset.spec.ts`.
- `quality/testing`: `tests/e2e/password-reset.spec.ts` reads reset codes from the Auth emulator's `oobCodes` endpoint.
- `decisions/password-reset-uses-firebase-action-page` (new): the reset link opens Firebase's hosted action page,
  not an in-app screen, and continues to `/login`, because it needs no new route and works in the Android TWA on the
  same host.
