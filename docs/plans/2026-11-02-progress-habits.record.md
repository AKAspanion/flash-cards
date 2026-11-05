# SDD ledger — plan: docs/plans/2026-11-02-progress-habits.md
Plugin: ga 2.15.0 (e989938)
Policy: git.commit=task; run.checkpoints=none; run.unattended=false; run.on-conflict=stop; run.on-plan-defect=rule; run.max-fix-rounds=2; review.when=off; review.minors=defer; knowledge.update=after-finish
Run base: 64fc299afd60fad779e53cf7971e6dd481c36ccd
Note: Policy (developer, 2026-11-05): plans 5, 6, 9, 7 and 8 are built back to back on feat/usability-plans-5-9 and go in one PR; keep the stop named in the sharing plan (after its Task 1); ask before the push and the PR
Ruling: Run branch feat/usability-plans-5-9 is cut from master 181c816 (#43 merged) plus 64fc299, this plan's amendment — the developer asked for the remaining plans in one PR — one large PR
Pre-flight: Task 1 x Tasks 3, 5: Task 1 adds UserStats, DAILY_GOALS, DEFAULT_DAILY_GOAL, fetchUserStats/addReviews/saveDailyGoal and every locale key; Tasks 3-5 edit no locale file
Pre-flight: Task 1: firestore.rules gains user-stats with an owner-filtered list (spec 3.3) and OWNED_COLLECTIONS gains user-stats; ownedCollections.spec.ts keeps them in step
Pre-flight: Task 3 x Task 5: both modify src/router/index.ts and tests/unit/router.spec.ts; Task 5 waits on Task 3
Pre-flight: Task 4 x Task 5: View.vue/Due.vue (Task 4) vs Home.vue/Settings.vue/Stats.vue (Task 5); disjoint
Pre-flight: Task 4: tests/e2e/stats-helpers.ts uses DEV_PORTS (plan amended 64fc299)
Ruling: Task 1 runs its rules tests with pnpm run test:rules (Firestore emulator on DEV_PORTS.firestore) and its unit tests by file; Task 2, Task 3 run their unit tests by file; Task 4 and Task 5 write e2e without running it when built in worktrees; the controller runs tests/e2e/review-counts.spec.ts and tests/e2e/stats.spec.ts with srs-review, due-review and a11y at the end — policy: tests by file, e2e at the end — e2e failures surface late
Task 1: started 2026-11-05 12:24 (worktree from 64fc299)
Task 2: started 2026-11-05 12:24 (worktree from 64fc299)
Task 2: agent implementer a69cf689571b1740b
Task 2: merged (4ee311a..4ee311a)
Task 2: complete (commits 64fc299..4ee311a, not reviewed)
Progress: 1/5 tasks — Task 2 Streak maths — Streak maths — currentStreak, longestStreak, lastDays, totalReviewed
Task 1: agent implementer a6bd9866693628922
Task 1: merged (9e62e29..9e62e29)
Task 1: complete (commits 4ee311a..9e62e29, not reviewed)
Progress: 2/5 tasks — Task 1 Stats document, rules and copy — Stats document, rules and copy — user-stats rules (owner only, owner-filtered list), mapper, fetch/add/save, OWNED_COLLECTIONS
Note: Plugin: ga 2.16.0 (5660c9e)
Ruling: Task 3: plugin changed mid-run (ga 2.16.0: implement-with-subagents is now feature-build-team, finish-branch is feature-ship) — re-read the skill — the run goes on unchanged; rules files regenerated, scripts taken from feature-build-team — the skill text for reviews-off runs is the same — none
Task 3: started 2026-11-05 12:28
Task 3: agent implementer af83f858be8ea7c8a
Task 3: complete (commits 9e62e29..95a5c2e, not reviewed; store written before its tests (steps.tdd prefer), guards checked by removal)
Progress: 3/5 tasks — Task 3 Stats store — Stats store — load once per user, recordReviews, setGoal, reset on sign-out and user switch
Task 4: started 2026-11-05 12:30 (worktree from 95a5c2e)
Task 5: started 2026-11-05 12:30 (worktree from 95a5c2e)
Ruling: Task 4: a visit whose marks change no card data (re-marking a learned card) still writes its review count on leave, though no set is saved — spec 8.1 counts a review per card per session, and the plan's second acceptance case expects the re-mark to count — a stats write on a visit with nothing to save
Task 4: agent implementer a7b1cc6dd062d5611
Task 4: merged (f799088..f799088)
Task 4: complete (commits 95a5c2e..f799088, not reviewed; e2e pending)
Progress: 4/5 tasks — Task 4 Count reviews on the review screens — Count reviews on the review screens — once per card per visit, written after a successful save
Ruling: Task 5: the Stats view's unit test is tests/unit/StatsView.spec.ts, not tests/unit/Stats.spec.ts — on macOS's case-insensitive disk Stats.spec.ts overwrites Task 3's stats.spec.ts — none
Task 5: agent implementer a25fcafbe211fdf8b
Task 5: merged (f1cefe2..f1cefe2)
Task 5: complete (commits f799088..f1cefe2, not reviewed; e2e pending)
Progress: 5/5 tasks — Task 5 Streak and goal on Home, Stats page and daily goal setting — Streak and goal on Home, Stats page and daily goal setting
Note: End checks on f1cefe2: typecheck clean; lint 0 errors; unit 292/292 (rules suite apart). e2e (review-counts, stats, srs-review, due-review, a11y): 81 passed, 11 failed, all in review-counts (2 tests) and stats (4 tests). Details in .ga/runs/2026-11-02-progress-habits/e2e-failures.md
Ruling: Task 4 and Task 5: one fix round in place for the 11 e2e failures; each diagnosed as test or code, no Acceptance weakened — e2e is the tasks' own tests — one more e2e run
Note: Flake: tests/e2e/stats.spec.ts:157 bar dates follow the app language (mobile) — failed once on a slow load (page still on the spinner), passed on three reruns
Note: Fix round 1 (883ccdc): review-counts leave via the summary; Home menu scoped to main; the refused-goal snack shows the Firebase message (showError's existing behaviour); code bug: validStats required days, so a new account's first goal-only merge write was denied — now get('days', {}) is map, with a rules test. review-counts + stats: 40/40
Ruling: The after-finish knowledge and record jobs for plans 5, 6, 9, 7 and 8 run at the end of the combined run, one after another, on the final branch — running them per plan would leave their commits behind a branch that keeps moving, and the plans share concepts — knowledge lands at the end rather than per plan
Run: finished 2026-11-05 16:49
