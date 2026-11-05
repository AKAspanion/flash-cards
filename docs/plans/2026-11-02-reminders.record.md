# SDD ledger — plan: docs/plans/2026-11-02-reminders.md
Plugin: ga 2.16.0 (5660c9e)
Policy: git.commit=task; run.checkpoints=none; run.unattended=false; run.on-conflict=stop; run.on-plan-defect=rule; run.max-fix-rounds=2; review.when=end-of-plan; review.minors=defer; knowledge.update=end-of-plan
Run base: d7c9965012c1c6f3e3411f8b0ca703c57448c161
Note: Policy (developer, 2026-11-05): plans 5, 6, 9, 7 and 8 are built back to back on feat/usability-plans-5-9 and go in one PR; keep the sharing plan's stop after its Task 1; ask before the push and the PR; after-finish jobs run at the end
Ruling: Task 2 stays not-security and untagged for failure-paths: it stores a time on the device and downloads a file through downloadText; it loads no data — run check notes — none
Pre-flight: Task 1 x Task 2: buildReminderIcs and the locale keys; Task 2 downloads through downloadText (faster-authoring plan)
Pre-flight: Task 2 x plan 5: Settings.vue already has plan 5's Daily goal row and select; the reminder row is additive
Pre-flight: Task 3: App.vue and a new composable; badge = dueCount (spaced-repetition plan); cleared on sign-out; touches none of Task 1/2's files
Ruling: Task 1, Task 2 and Task 3 run only the tests they write, by file; Task 2's e2e spec is run by the controller on the merged branch — policy — none
Task 1: started 2026-11-05 13:14 (worktree from d7c9965)
Task 3: started 2026-11-05 13:14 (worktree from d7c9965)
Task 3: agent implementer aadbd151013fc5b32
Task 3: merged (d10e7e5..d10e7e5)
Task 3: complete (commits d7c9965..d10e7e5, not reviewed)
Progress: 1/3 tasks — Task 3 App icon badge with the due count — App icon badge with the due count, cleared on sign-out
Task 1: agent implementer a387e7fa70cd69e61
Task 1: merged (7c442fe..7c442fe)
Task 1: complete (commits d10e7e5..7c442fe, not reviewed)
Progress: 2/3 tasks — Task 1 Calendar file builder — Calendar file builder — RFC 5545 daily event, reminder copy
Task 2: started 2026-11-05 13:16
Task 2: agent implementer a675aed9dca679bf4
Task 2: complete (commits 7c442fe..fe883a6, not reviewed; e2e reminders 12/12)
Progress: 3/3 tasks — Task 2 Daily reminder setting — Daily reminder setting — time remembered on the device, Add to calendar downloads flashcards-reminder.ics
Run: finished 2026-11-05 16:49
