# SDD ledger — plan: docs/plans/2026-11-06-friendly-error-messages.md
Plugin: ga 2.16.0 (5660c9e)
Policy: git.commit=task; run.checkpoints=none; run.unattended=false; run.on-conflict=stop; run.on-plan-defect=rule; run.max-fix-rounds=2; review.when=end-of-plan; review.minors=defer; knowledge.update=end-of-plan
Run base: 1811c683567f68a749088227b4fb7ec8795d2c54
Provisional: plan approved on settled facts — the developer's message of 2026-11-06 about the technical snack wording — the developer confirms the plan
Note: no spec — a wording bug; added to branch fix/bug-batch-2026-11-06 for PR #49
Task 1: started 2026-11-06 13:42
Task 1: agent implementer afe728967729002e3
Ruling: Task 1: accept the Object.hasOwn lookup and console.error of unmapped auth errors in authErrors.ts — both inside the task's files, tested first; the second keeps the cause visible now that the snack hides it — an unmapped account error is logged twice (account.ts showAuthError also logs)
Task 1: complete (commits d9623fc..d9623fc, not reviewed)
Final review: started 2026-11-06 13:46
Final review: Ruling: Plan defect: Task 1's Files missed tests/unit/account.spec.ts and tests/unit/library.spec.ts, whose three cases pin the old raw-message snack — the fix wave updates them — they test the behaviour this plan changes — none
Final review: Ruling: Minors 2 and 3a raised to Important: stats load shows a key for the action (new toast.error.stats-load), clearShareId failure shows share.sync-failed — the change's purpose is wording that fits the action; a wrong key now always shows — two keys in en and hi
Final review: minor (deferred): signed-out errors the app throws (firebase.ts:116 etc.) show the caller's key, not a signed-out message; the auth watcher redirects to /login at once
Final review: minor (deferred): deleteAccount shows account.delete.error for auth/requires-recent-login
Final review: minor (deferred): a failed sign-out while still signed in shows toast.error.generic
Final review: minor (deferred): an unmapped account auth error is logged twice (account.ts showAuthError and authErrorMessage)
Final review: minor (deferred): FirebaseConfigError setup steps show only in the console (developer-only)
Final review: minor (deferred): session.showError still logs the whole error; no caller passes personal data today
Final fixes: agent final-fixer a075a946864843260
Note: Fix wave 5c0f475: 5 addressed; unit 642 passed, typecheck pass, lint pass (1 pre-existing warning)
Note: Fix wave re-review (final-r1-reviewer.md): 5/5 addressed, no new Critical or Important
Final review: minor (deferred): authErrorMessage logs only 'Error' for an app-thrown error without a code; its message is lost from the console
Final review: complete (5 findings to fix (1 security), 5 fixed, 0 parked)
Note: End checks: unit 642 passed, typecheck and lint pass on 5c0f475; e2e 75 passed on d9623fc (stats, read-aloud, set-card-swipe, library); smoke pass on 17a9fee; knowledge stale none, verify 575/0/12
Run: finished 2026-11-06 13:58
