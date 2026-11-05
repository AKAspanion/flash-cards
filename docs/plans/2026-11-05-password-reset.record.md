# SDD ledger — plan: docs/plans/2026-11-05-password-reset.md
Plugin: ga 2.16.0 (5660c9e)
Policy: git.commit=task; run.checkpoints=none; run.unattended=false; run.on-conflict=stop; run.on-plan-defect=rule; run.max-fix-rounds=2; review.when=end-of-plan; review.minors=defer; knowledge.update=end-of-plan
Run base: 43fea2ce4234df89bcf96610ce1f26a0b73ac204
Ruling: no dev servers in this worktree — port 2100 is held by a dev server another checkout runs, and Vite's strictPort refuses to move — nothing reloads live here; the end's smoke check and any e2e run start their own build
Pre-flight: Task 1 and Task 2 share no file; Task 2 consumes sendPasswordReset and the locale keys from Task 1, so they run in turn. feat/email-verification also edits src/services/firebase.ts and both locale files: a small merge conflict for whichever merges second
Task 1: started 2026-11-05 18:21
Task 1: agent implementer a9b8b2e2aba557424
Ruling: Task 1: the auth/user-not-found branch of sendPasswordReset logs nothing — a log line would reveal that the address has no account, which the requirement forbids; every other error is rethrown and shown — a missing reset email for an unregistered address leaves no client trace, which is the intent
Task 1: complete (commits 43fea2c..395379d, not reviewed)
Task 2: started 2026-11-05 18:24
Progress: 1/2 tasks — Task 1 Reset call, error mapping and strings — 1/2 tasks — Task 1 Reset call, error mapping and strings — sendPasswordReset trims, continues to /login, answers the same for unknown addresses; six keys in English and Hindi
Task 2: agent implementer ac1fd7098e74f7661
Ruling: Task 2: reset mode, and only reset mode, checks the address's shape (/^[^@\s]+@[^@\s]+$/) before sending, with the existing auth.error.invalid-email text — the Auth emulator answers a malformed address with EMAIL_NOT_FOUND, which sendPasswordReset rightly treats as sent, so the not-an-email case would show 'link sent'; a shape check reveals nothing about who is registered — an unusual but valid address the loose pattern refuses; the pattern only needs one @ and no spaces
Task 2: complete (commits 395379d..108c108, not reviewed)
Progress: 2/2 tasks — Task 2 Reset mode on the login screen, with its e2e test — 2/2 tasks — Task 2 Reset mode on the login screen — Forgot password? opens a reset mode that sends the link and returns to sign-in; e2e against the Auth emulator
Final review: started 2026-11-05 18:31
Note: End checks on 108c108: typecheck pass, lint pass (0 errors; 1 warning in GroupCardFlash.vue, which the branch doesn't touch), smoke not run (port 2100 held by another checkout's dev server; a production vite build passed instead, and Task 2's e2e run had already served /login from a production build)
Final review: agent final-reviewer ae0ead3cb4e2a4a74
Final review: agent final-security-reviewer ade8cd6c7da003bd0
Final review: minor (deferred): Login.vue: sendReset repeats run()'s busy/try/finally shape (final reviewer Minor 4)
Final review: minor (deferred): Login.vue: the password field has no expand transition, so the card jumps when reset mode opens (final reviewer Minor 6)
Final review: minor (deferred): Login.vue: the mode links remove themselves with v-if, so keyboard focus drops to the body (final reviewer Minor 1)
Final review: Ruling: Email Enumeration Protection is a Firebase console setting the code can't check; the knowledge job records that the requirement depends on it, as an open question for the developer, and auth/user-disabled resolves as sent — with the protection off, the network response tells registered addresses apart whatever the screen does (security reviewer Important 1) — if the developer finds it off, they turn it on in the console; no code change
Note: Fix wave 108c108..7cc2665: reset-unavailable mapping, missing-email uses email.enter, user-disabled resolves as sent, mode links disabled while busy, e2e for a failed request and a double press
Note: End checks on 7cc2665: typecheck pass, lint pass (0 errors; the same untouched GroupCardFlash.vue warning); smoke still blocked by another checkout's dev server on 2100
Final review: minor (deferred): firebase.ts: sendPasswordReset's JSDoc still names only auth/user-not-found as resolving; auth/user-disabled does too (re-review Minor 1)
Final review: minor (deferred): password-reset.spec.ts: no case for a failed send followed by a successful one (re-review Minor 2)
Final review: minor (deferred): authErrors.ts: auth/quota-exceeded maps to reset-specific wording in the shared map (re-review Minor 3)
Final review: minor (deferred): passwordReset.spec.ts: missing space after a comma in an it.each list (re-review Minor 4)
Final review: complete (11 findings, 6 fixed, 0 parked)
Note: Open finding: [findings/login-reset-links-drop-focus](../../knowledge/findings/login-reset-links-drop-focus.md) — switching to or from reset drops keyboard focus
Run: finished 2026-11-05 19:12
