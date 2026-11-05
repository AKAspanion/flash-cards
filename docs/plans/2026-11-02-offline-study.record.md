# SDD ledger — plan: docs/plans/2026-11-02-offline-study.md
Plugin: ga 2.16.0 (5660c9e)
Policy: git.commit=task; run.checkpoints=none; run.unattended=false; run.on-conflict=stop; run.on-plan-defect=rule; run.max-fix-rounds=2; review.when=end-of-plan; review.minors=defer; knowledge.update=end-of-plan
Run base: f22cf1932d6daeae51311c2479dc2aedf15fc0f1
Note: Policy (developer, 2026-11-05): plans 5, 6, 9, 7 and 8 are built back to back on feat/usability-plans-5-9 and go in one PR; keep the sharing plan's stop after its Task 1; ask before the push and the PR
Note: Policy changed while paused (ga 2.16 workflow): review.when end-of-plan (ga-final-reviewer and ga-security-reviewer over the whole branch, one fix wave), knowledge.update end-of-plan (written before the push), git.merge-request-video at-finish; security-tagged tasks dispatched on opus
Ruling: e2e runs with plain playwright against the Firebase emulators already running on the 2100 block from the main checkout (started by the local-dev-ports session), not emulators:exec — emulators:exec can't start while they hold the ports, and stopping another session's servers needs the developer — test data shares the running emulators with that session
Pre-flight: Task 1 x Tasks 2, 3: Task 1 adds initializeFirestore with persistent cache, PendingWrite add calls, the non-blocking offline write rule in library and stats stores, session.notifyOfflineSave and the locale keys; Task 2 removes UI gates, Task 3 adds signOutAndClear and the delete-account path
Pre-flight: Task 2 x Task 3: Task 2 edits CardFlash, CardFlashSet, Add, View, Due; Task 3 edits firebase.ts, Profile, DialogDeleteAccount, account store; disjoint
Pre-flight: Task 1: stats.ts gets the same offline path for recordReviews and setGoal; addReviews and saveDailyGoal call Firestore before their first await (plan amended f22cf19)
Pre-flight: Task 2: the gate list comes from the current code (plan amended f22cf19); Settings restore already refuses offline
Task 1: started 2026-11-05 14:16
Task 1: agent implementer a411f88296ce3acdb
Ruling: Task 1: a server refusal of an offline write shows the existing save error through session.showError, which displays Firebase's message when there is one — spec 10.4 asks for the existing save error snack, and every save in the app already behaves this way — users see Firebase wording on a refusal, as they do online
Ruling: Task 1: a refused offline recordReviews shows toast.error.stats, not the save error — spec 8.7 gives that message for a failed stats write — none
Ruling: Task 3: sign-out stays refused offline, which is what keeps an offline review count from reaching the next user's store — Task 1's offline recordReviews has no user-switch guard — a user switch in another tab while offline is not covered
Task 1: complete (commits 4c4d9bc..29e23bd, not reviewed (end-of-plan review))
Progress: 1/3 tasks — Task 1 Local cache and non-blocking offline writes — Local cache and non-blocking offline writes — persistent IndexedDB cache, client ids, offline saves count once on the device
Task 2: started 2026-11-05 14:22 (worktree from 29e23bd)
Task 3: started 2026-11-05 14:22 (worktree from 29e23bd)
Ruling: Task 3: src/utils/freshLoad.ts and a pending-snack read in src/stores/session.ts are accepted outside the brief's files — a full page load of /login would otherwise drop the 'Your account has been deleted.' snack that account-deletion.spec checks — a small sessionStorage handoff to review
Task 3: agent implementer a0652382810ea1803
Task 3: merged (e080bf5..e080bf5)
Task 3: complete (commits 29e23bd..e080bf5, not reviewed (end-of-plan review); e2e pending)
Progress: 2/3 tasks — Task 3 Sign-out clears the device cache — Sign-out and Delete account clear the device cache; both refused offline
Task 2: agent implementer a044c21b5dacca362
Task 2: merged (a586710..a586710)
Task 2: complete (commits 29e23bd..a586710, not reviewed (end-of-plan review); e2e pending)
Progress: 3/3 tasks — Task 2 Enable study and editing controls offline — Study and editing controls enabled offline; online-only actions still refused
Note: e2e on a586710 (offline, offline-signout, account-deletion, review-counts, sets; plain playwright against the running emulators): 46 passed, 14 failed. offline and offline-signout passed. account-deletion (3 tests) stays on /profile instead of /login; review-counts (4 tests) read missing or wrong counts. Typecheck clean, lint 0 errors. Details in .ga/runs/2026-11-02-offline-study/e2e-failures.md
Ruling: Task 3: Profile.vue's saveProfile refuses offline with toast.offline-save, in this fix round — spec 10.5 keeps profile changes online-only with rule 2.10's message; Task 2 found no task covered it — one more gate and its e2e case
Ruling: Task 1 and Task 3: one fix round in place (opus: account deletion is security code) for the account-deletion and review-counts regressions — existing suites broke on this plan's code — one more e2e run
Ruling: Reversed the shared-emulator ruling: e2e and rules tests need emulators started from this branch, because the running ones (main checkout, master) load master's firestore.rules, which have no user-stats or shared-sets block — the fix round showed the same 7 account-deletion and review-counts failures on a pre-plan build against those emulators — the developer must stop the ports session's emulators, or let this session run its own
Note: Fix round 1 (0f3b84f): Profile saveProfile refuses offline with toast.offline-save (spec 10.5), e2e case added and passing; account-deletion and review-counts failures traced to the shared emulator's master rules, unverified until emulators run this branch's rules
Note: e2e on 0f3b84f with emulators from this branch (offline, offline-signout, account-deletion, review-counts, sets): 60 passed, 2 failed — review-counts.spec.ts:159 only, whose premise (offline makes the set save fail) plan 7 removed
Ruling: Task 2: review-counts.spec.ts:159 forces a failed set save another way than going offline (e.g. a set over the size limit, which saveSet refuses before any write), keeping its expectation that a failed save records nothing — spec 10.2-10.3: an offline save now counts as done once it is in the local cache — none
Note: Fix round 2 (6f18d77): review-counts.spec.ts:159 now fails the save with a set over the size limit; the spec passes 12/12. Plan 7's e2e (offline, offline-signout, account-deletion, review-counts, sets) green with emulators from this branch
Run: finished 2026-11-05 16:49
