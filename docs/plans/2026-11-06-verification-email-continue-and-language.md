# Verification Email Continue Link and Language Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: the project's workflow policy names the executor (`run.executor`): ga:feature-build-team by default, or ga:feature-build. Follow the policy and this plan's Checkpoints. Steps use checkbox (`- [ ]`) syntax for tracking.

Plan, then build; tests with each task. Say 'test-first' or 'spec it first' to work that way.

**Goal:** The verification email's Firebase page offers a Continue button back to the app, and every Firebase auth email (verification, password reset) and Google's sign-in page use the app's chosen language, English or Hindi.

**Architecture:** `sendEmailVerification` gets action code settings with a continue URL of the app's own `/home`, the same pattern `sendPasswordReset` uses for `/login`. A new `setAuthLanguage()` in `src/services/firebase.ts` sets Firebase Auth's `languageCode`, and the prefs store keeps it in step with `prefs.lang`, at start-up and on every change.

**Tech Stack:** Vue 3 + Pinia, Firebase Auth (modular SDK), Vitest with jsdom, Playwright against the Auth emulator.

**Spec:** none: one task; the developer asked for exactly these two changes on 2026-11-06, following up the email verification plan (`docs/plans/2026-11-05-email-verification.md`).

## Global Constraints

- Only `src/services/firebase.ts` imports from `firebase/*`; components and views go through stores (conventions).
- The continue URL's host is the page's own origin, which is always an authorised domain (production, the `.web.app` host, localhost for the emulators), as with the password reset.
- The app's languages are `en` and `hi` (`Lang` in `src/stores/prefs.ts`); Firebase takes the same codes.

## Checkpoints

None (`run.checkpoints: none`).

## Review Focus

- A failed or missing continue URL must not fail the send: an invalid continue URL is a Firebase error (`auth/invalid-continue-uri`, `auth/unauthorized-continue-uri`), so the URL must always be built from `window.location.origin`.
- The language must be set before the first send of a session, including a sign-up straight after a cold load.
- After Continue, the app opens `/home` with the cached user still unverified, so the banner stays until I've verified is pressed; that is expected, not a defect.

---

### Task 1: Continue URL on verification emails, and auth emails in the app's language

**Files:**
- Modify: `src/services/firebase.ts`
- Modify: `src/stores/prefs.ts`
- Modify: `tests/unit/emailVerification.spec.ts`
- Modify: `tests/unit/prefs.spec.ts`
- Modify: `tests/e2e/verify-email.spec.ts`

**Interfaces:**
- Consumes: existing `signUpWithEmail()` and `sendVerificationEmail()` (email verification Task 1), existing `usePrefsStore`'s `lang` ref in `src/stores/prefs.ts`.
- Produces:

```ts
// src/services/firebase.ts
/** Sets the language Firebase Auth uses for its emails and its own pages. */
export function setAuthLanguage(lang: 'en' | 'hi'): void;
```

`signUpWithEmail` and `sendVerificationEmail` keep their signatures; each passes `{ url: \`${window.location.origin}/home\` }` as the action code settings to `sendEmailVerification`.

**Spec:** none

**Tags:** security

**Knowledge:** `features/email-verification`: the verification email's Firebase page continues to `/home`, where the banner stays until I've verified is pressed, since the page load keeps the cached user. `security/auth`: Firebase Auth's `languageCode` follows `prefs.lang`, so verification and reset emails and Google's sign-in page come in English or Hindi; each language's template is edited separately in the Firebase console.

**Acceptance:**
- Given a signed-in user, when `sendVerificationEmail()` runs, then `sendEmailVerification` is called with that user and `{ url: '<origin>/home' }`, where `<origin>` is `window.location.origin`.
- Given a new account, when `signUpWithEmail()` sends its email, then `sendEmailVerification` is called with `{ url: '<origin>/home' }`, and a rejected send still resolves `{ verificationSent: false }`.
- Given `setAuthLanguage('hi')`, then the auth instance's `languageCode` is `'hi'`; given `'en'`, it is `'en'`.
- Given saved `lang` of `hi`, when the prefs store is created, then `setAuthLanguage` is called with `'hi'` before anything else uses it; when `lang` changes to `en`, it is called with `'en'`.
- E2E, in `tests/e2e/verify-email.spec.ts`: after `signUp()`, the Auth emulator's `VERIFY_EMAIL` code for that email has an `oobLink` whose `continueUrl` query parameter is the app's own origin plus `/home`.

- [ ] **Step 1: Write the failing tests** for each Acceptance case: the send calls and `setAuthLanguage` in `tests/unit/emailVerification.spec.ts`, the store sync in `tests/unit/prefs.spec.ts` (mock `@/services/firebase`), the continue URL in `tests/e2e/verify-email.spec.ts`

- [ ] **Step 2: Run the unit tests to verify they fail**

Run: `npx vitest run tests/unit/emailVerification.spec.ts tests/unit/prefs.spec.ts`
Expected: FAIL on the assertions. Add `setAuthLanguage` with its real signature first, so the failure is behaviour

- [ ] **Step 3: Write the minimal implementation** to the Interfaces, until they pass

- [ ] **Step 4: Run the unit tests to verify they pass**

Run: `npx vitest run tests/unit/emailVerification.spec.ts tests/unit/prefs.spec.ts`
Expected: PASS

- [ ] **Step 5: Run the e2e spec alone to verify it passes**

Run: `pnpm run build:e2e && npx --yes firebase-tools@15.34.2 emulators:exec --only auth,firestore --project demo-flash-cards "playwright test tests/e2e/verify-email.spec.ts"`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/services/firebase.ts src/stores/prefs.ts tests/unit/emailVerification.spec.ts tests/unit/prefs.spec.ts tests/e2e/verify-email.spec.ts
git commit -m "Send the verification email with a continue link to the app, and send auth emails in the app's language."
```
