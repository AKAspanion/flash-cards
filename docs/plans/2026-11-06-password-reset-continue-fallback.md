# Password Reset Continue-Link Fallback Implementation Plan

**Status:** complete, commits baa9366..9ffb5ac, 2026-11-06; record in `2026-11-06-password-reset-continue-fallback.record.md`

> **For agentic workers:** REQUIRED SUB-SKILL: the project's workflow policy names the executor (`run.executor`): ga:feature-build-team by default, or ga:feature-build. Follow the policy and this plan's Checkpoints. Steps use checkbox (`- [ ]`) syntax for tracking.

Plan, then build; tests with each task. Say 'test-first' or 'spec it first' to work that way.

**Goal:** A password reset email still goes out when Firebase refuses its continue link, as the verification email already does, instead of the screen saying password reset isn't available.

**Architecture:** `sendPasswordReset` in `src/services/firebase.ts` already sends with `continueTo('/login')` and Firebase's `languageCode` follows the app's language. It gains the same one-retry-without-settings rule `sendVerification` follows for `auth/unauthorized-continue-uri` and `auth/invalid-continue-uri`, through one shared helper, while keeping its same-reply handling of `auth/user-not-found` and `auth/user-disabled` on both attempts.

**Tech Stack:** Vue 3 + Pinia, Firebase Auth (modular SDK), Vitest with jsdom, Playwright against the Auth emulator.

**Spec:** none: one task applying the verification email's ruled fallback ("a continue-URL rejection retries the send once without a continue URL", final review of `docs/plans/2026-11-06-verification-email-continue-and-language.md`) to the password reset, as the developer asked on 2026-11-06.

## Global Constraints

- Only `src/services/firebase.ts` imports from `firebase/*` (conventions).
- The reset keeps its same reply for every address: `auth/user-not-found` and `auth/user-disabled` resolve, and nothing is logged for them ([password reset decision](../../knowledge/decisions/password-reset-uses-firebase-action-page.md)).
- Auth emails stay with Firebase's built-in sender (`knowledge/decisions/auth-emails-sent-by-firebase.md`).

## Checkpoints

None (`run.checkpoints: none`).

## Review Focus

- The retry must not undo the same-reply promise: a `user-not-found` or `user-disabled` on the retry resolves like the first attempt.
- A rejection that isn't a continue-URL code is not retried, so Firebase's throttle (`auth/too-many-requests`) isn't hit twice.

---

### Task 1: Retry the password reset once without its continue link

**Files:**
- Modify: `src/services/firebase.ts`
- Modify: `tests/unit/passwordReset.spec.ts`

**Interfaces:**
- Consumes: existing `continueTo()`, `CONTINUE_URL_REFUSED` and `sendVerification()` in `src/services/firebase.ts` (from the verification continue-link plan, already on this branch).
- Produces: no new export; `sendPasswordReset(email: string): Promise<void>` keeps its signature and same-reply behaviour.

```ts
// src/services/firebase.ts (private): one rule for every send that carries a continue link
async function withContinueFallback(send: (settings?: ActionCodeSettings) => Promise<void>, settings: ActionCodeSettings): Promise<void>;
```

**Spec:** none

**Tags:** security, failure-paths

**Knowledge:** `features/sign-in`: when Firebase refuses the reset email's continue link, the email is sent again without it, so it still arrives, with no Continue button back to `/login`.

**Acceptance:**
- Given `sendPasswordResetEmail` rejects with `auth/unauthorized-continue-uri` and then resolves, when `sendPasswordReset(' a@b.test ')` runs, then it resolves, and `sendPasswordResetEmail` was called twice: first with `a@b.test` and `{ url: '<origin>/login' }`, then with `a@b.test` and no settings.
- The same with `auth/invalid-continue-uri`.
- Given it rejects with `auth/unauthorized-continue-uri` twice, then `sendPasswordReset` rejects with that error.
- Given it rejects with `auth/unauthorized-continue-uri` and then `auth/user-not-found`, then `sendPasswordReset` resolves and logs nothing.
- Given it rejects with `auth/too-many-requests`, then it is called once and `sendPasswordReset` rejects.
- Given it rejects with `auth/user-not-found` or `auth/user-disabled` on the first attempt, then it is called once and `sendPasswordReset` resolves, as today.
- The verification sends keep their behaviour: the existing cases in `tests/unit/emailVerification.spec.ts` still pass, through the shared helper.

- [x] **Step 1: Write the failing tests** for each Acceptance case in `tests/unit/passwordReset.spec.ts`

- [x] **Step 2: Run them to verify they fail**

Run: `npx vitest run tests/unit/passwordReset.spec.ts`
Expected: FAIL on the assertions

- [x] **Step 3: Write the minimal implementation**: the shared helper, used by `sendVerification` and `sendPasswordReset`

- [x] **Step 4: Run them to verify they pass**

Run: `npx vitest run tests/unit/passwordReset.spec.ts tests/unit/emailVerification.spec.ts`
Expected: PASS

- [x] **Step 5: Commit**

```bash
git add src/services/firebase.ts tests/unit/passwordReset.spec.ts
git commit -m "Retry the password reset email once without its continue link when Firebase refuses the link."
```
