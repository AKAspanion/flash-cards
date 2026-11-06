# Friendly error messages Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: the project's workflow policy names the executor (`run.executor`): ga:feature-build-team by default, or ga:feature-build. Follow the policy and this plan's Checkpoints. Steps use checkbox (`- [ ]`) syntax for tracking.

Plan, then build; tests with each task. Say 'test-first' or 'spec it first' to work that way.

**Goal:** Error snacks show the app's own plain message for the action, never Firebase's technical text such as `PERMISSION_DENIED: evaluation error at L50:32 …`.

**Architecture:** `session.showError(err, key)` (`src/stores/session.ts`) shows `err.message` when there is one and the i18n key only as a fallback; it will always show the key's text and keep the raw error for the console. `authErrorMessage` (`src/services/authErrors.ts`) falls back to `err.message` for unmapped codes; it will fall back to `auth.error.generic`.

**Tech Stack:** Vue 3, Pinia, vue-i18n (en, hi); Vitest unit tests in `tests/unit/`, Playwright e2e in `tests/e2e/` on the Firebase emulators.

**Spec:** none: a wording bug; the developer, 2026-11-06: "ok, then wording is very technical use a user friendly one", about the snack of a refused goal save.

## Global Constraints

- Every user-facing string is an i18n key present in both `src/locales/en.json` and `src/locales/hi.json`.
- No task edits `knowledge/` (`knowledge.update: end-of-plan`).

## Checkpoints

None (`run.checkpoints: none`).

## Review Focus

- A save refused by the rules, a network failure and a signed-out user all show a sentence a person understands, in the app's language.
- The raw error still reaches the console, so a developer can see the cause.

---

### Task 1: Snacks show the action's own message, not Firebase's

**Files:**
- Modify: `src/stores/session.ts` (`showError`)
- Modify: `src/services/authErrors.ts` (`authErrorMessage` fallback)
- Modify: `tests/unit/session.spec.ts`
- Modify: `tests/unit/authErrors.spec.ts`
- Modify: `tests/e2e/stats.spec.ts` (the refused goal save case, ~line 229)
- Modify: `tests/e2e/read-aloud-language.spec.ts` (the refused save case, ~line 170)

**Interfaces:**
- Consumes: existing `showSnack(text: string)` in the session store and the existing keys `toast.error.*` and `auth.error.generic`.
- Produces: unchanged signatures:

```ts
function showError(err: unknown, fallbackKey?: string): void; // default key 'toast.error.generic'
export function authErrorMessage(err: unknown, t: (key: string) => string): string;
```

Behaviour: `showError` logs `err` with `console.error` and shows `i18n.global.t(key)` — the key passed, or `toast.error.generic` — whatever `err.message` says. `authErrorMessage` returns the mapped key's text for a known code, as now, and `t('auth.error.generic')` for any other error, whatever its message. The parameter keeps its name `fallbackKey` (20 callers); its comment says it is the message shown.

**Spec:** none

**Tags:** security, failure-paths

**Knowledge:** project/conventions: an error snack always shows the i18n key the caller passes (`toast.error.generic` by default); the raw error goes only to the console. findings/unmapped-auth-errors-show-the-raw-firebase-message: fixed, unmapped auth errors show `auth.error.generic`.

**Acceptance:**
- Given an error whose message is `PERMISSION_DENIED: evaluation error at L50:32 for 'update' @ L50`, when `showError(err, 'toast.error.save')` runs, then the snack text is `Could not save. Please try again.` and `console.error` received the error.
- Given any error, when `showError(err)` runs with no key, then the snack is `Something went wrong. Please try again.`
- Given the Hindi locale, when `showError(err, 'toast.error.save')` runs, then the snack is the Hindi `toast.error.save` text.
- Given an error with no message (a string, `null`), when `showError` runs, then the snack is the key's text.
- Given `{ code: 'auth/some-unmapped-code', message: 'Firebase: Error (auth/some-unmapped-code).' }`, when `authErrorMessage` runs, then it returns `t('auth.error.generic')`; a known code still returns its own key's text.
- Given a goal save the rules refuse (the existing e2e case), when it fails, then the snack contains `Could not save. Please try again.` and not `PERMISSION_DENIED`, and the select keeps the old goal.
- Given a set save the rules refuse (the existing read-aloud e2e case), then the snack shows `Could not save. Please try again.` and not `PERMISSION_DENIED`.

- [ ] **Step 1: Write the failing tests** for each Acceptance case: unit cases in `tests/unit/session.spec.ts` and `tests/unit/authErrors.spec.ts` (replace "falls back to the raw message, then a generic one"), and change the two e2e assertions
- [ ] **Step 2: Run them to verify they fail**

Run: `pnpm exec vitest run tests/unit/session.spec.ts tests/unit/authErrors.spec.ts`
Expected: FAIL on the snack text and the generic fallback

- [ ] **Step 3: Write the minimal implementation** in `session.ts` and `authErrors.ts`
- [ ] **Step 4: Run them to verify they pass**

Run: `pnpm exec vitest run tests/unit/session.spec.ts tests/unit/authErrors.spec.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/stores/session.ts src/services/authErrors.ts tests/unit/session.spec.ts tests/unit/authErrors.spec.ts tests/e2e/stats.spec.ts tests/e2e/read-aloud-language.spec.ts
git commit -m "Show the app's own message for a failed save or sign-in instead of Firebase's technical text."
```
