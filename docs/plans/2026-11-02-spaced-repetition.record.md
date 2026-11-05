# SDD ledger — plan: docs/plans/2026-11-02-spaced-repetition.md
Plugin: ga 2.15.0 (e989938)
Policy: git.commit=task; run.checkpoints=none; run.unattended=false; run.on-conflict=stop; run.on-plan-defect=rule; run.max-fix-rounds=2; review.when=off; review.minors=defer; knowledge.update=after-finish
Run base: f98f1dd3f863362e41607e72fb8630b72036ba46
Ruling: Run branch feat/spaced-repetition is cut from master 80fc8f8 (#41 merged) plus three faster-authoring knowledge and record commits that missed #41 (01bcbc7, b83ec67, 839df32) and f98f1dd, this plan's amendment — the developer merged #41 before those docs commits were pushed; they belong on master — the PR also carries plan 2's knowledge commits
Pre-flight: Task 1 x all: Task 1 adds srs.ts, FlashCard.srs and every locale key; no other task edits locale files or types.ts
Pre-flight: Task 2 x Tasks 3, 4: rating prop, rate event, rate()/rateFocused(); Task 2 keeps flip, edit, add-after (plan 2) and scrollToCard/next/prev/goTo/flipFocused (plan 1)
Pre-flight: Task 3 x Task 4: View.vue (Task 3) and Due.vue/Home.vue/CardFlashSet.vue/router (Task 4) are disjoint; both reuse StudySummaryDialog unchanged; Task 3 alone edits StudyShortcutsDialog.vue
Pre-flight: Task 2: removing the peek rule changes plan 1's GroupCardFlash.spec.ts peek case; Task 2 updates that test to the new rule (spec 6.4)
Pre-flight: Task 4: Due.vue uses useSessionStore().unsavedChanges (plan amended f98f1dd)
Ruling: Task 1, Task 2, Task 3 and Task 4 run only the tests they write, by file; Task 3 and Task 4 are built side by side in worktrees and write their e2e specs without running them; the controller runs tests/e2e/srs-review.spec.ts and tests/e2e/due-review.spec.ts, plus tests/e2e/study-modes.spec.ts (the peek rule and rating change the review screen), on the merged branch at the end — policy: e2e at the end; worktrees share emulator ports — e2e failures surface after both tasks are in
Task 1: started 2026-11-05 11:06
Task 1: agent implementer a2e1e98b05aefc8c6
Task 1: complete (commits f98f1dd..587f62b, not reviewed)
Progress: 1/4 tasks — Task 1 Scheduler, due queue and copy — Scheduler, due queue and copy — SM-2 schedule, isDue, dueQueue/dueCount/setDueCounts, FlashCard.srs, 11 locale keys
Task 2: started 2026-11-05 11:07
Task 2: agent implementer a3af7892d03848843
Task 2: complete (commits 587f62b..b7dc08e, not reviewed)
Progress: 2/4 tasks — Task 2 Rating row on the card — Rating row on the card — Again/Hard/Good/Easy once revealed, rate()/rateFocused(), peek rule removed
Task 3: started 2026-11-05 11:09 (worktree from b7dc08e)
Task 4: started 2026-11-05 11:09 (worktree from b7dc08e)
Task 3: agent implementer a702607b24876a54a
Task 3: merged (cf58c84..cf58c84)
Task 3: complete (commits b7dc08e..cf58c84, not reviewed; e2e pending)
Progress: 3/4 tasks — Task 3 Rating on the review screen — Rating on the review screen — schedule on rate, 1–4 keys, again re-queued once, Reset clears srs
Task 4: agent implementer afbc68fef4dd8220e
Task 4: merged (272227f..272227f)
Task 4: complete (commits b7dc08e..272227f, not reviewed; e2e pending)
Progress: 4/4 tasks — Task 4 Due review across sets, Home banner and per-set count — Due review, Home banner and per-set counts — /due across sets, '{n} cards due' with Study now, '{n} due' / '{m} new' per set
Note: e2e on 272227f (srs-review, due-review, study-modes, a11y): 61 passed, 19 failed; study-modes and a11y all passed. Groups: .flash-card__rating .first() not visible (12), leaving the review screen after rating stays on /seed-Verbs/view (4), 'ALPHA' text not found (2), summary not shown (1). Details in .ga/runs/2026-11-02-spaced-repetition/e2e-failures.md
Ruling: Task 3 and Task 4: one fix round in place for the 19 e2e failures; each is diagnosed as a test or a code bug from the trace, and no Acceptance expectation is weakened — e2e is the tasks' own tests — one more e2e run
Note: Fix round 1 (38aff54, spec files only): all 19 were test bugs (Space pressed before the /due card mounted; leaving on the last card clicks Done, which opens the summary, so leave() now uses Back to home; uppercase title is CSS; Easy clicked mid-flip let Playwright's scroll-into-view move the slider). srs-review + due-review + study-modes: 74/74; a11y passed on 272227f and src/ is unchanged since
Run: finished 2026-11-05 11:33
