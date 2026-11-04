# SDD ledger — plan: docs/plans/2026-11-04-twa-polish.md
Plugin: ga 2.15.0 (e989938)
Policy: git.commit=task; run.checkpoints=none; run.unattended=false; run.on-conflict=stop; run.on-plan-defect=rule; run.max-fix-rounds=2; review.when=off; review.minors=defer; knowledge.update=after-finish
Run base: c5554a688265c3f5586000ef2f6aa0f026e884e6
Pre-flight: Task 1 -> Tasks 2, 3: T1 produces the locale keys and pwaManifest names; T2 consumes the keys, T3 the names. Tasks 2 and 3 share no files.
Ruling: Task 2 may run its own e2e in its worktree — Task 3 beside it starts no emulators or preview server, so no ports are shared — a port clash would fail Task 2's run, which is then retried at the end
Task 1: started 2026-11-04 14:51
Task 1: agent implementer a44c1306a17940bc9
Task 1: complete (commits c5554a6..6c32ab6, not reviewed)
Task 1: Ruling: Keep the Hindi deletion.app.title without its colon — matches the English key change; the brief's 'Hindi stays' meant the brand name — one Hindi string to put back
Progress: 1/3 tasks — Task 1 Names, strings and the early paint — 1/3 tasks — Task 1 Names, strings and the early paint — FlashCards name everywhere in English, early background and icon before the app loads
Task 2: started 2026-11-04 14:52 (worktree from 6c32ab6)
Task 3: started 2026-11-04 14:52 (worktree from 6c32ab6)
Task 3: Ruling: Task 3 runs in place in the main worktree, beside Task 2 in its own worktree — it must write ~/keys/flashcards, which a worktree agent couldn't do last run; it shares no files with Task 2 — none if the file sets stay disjoint
Task 2: agent implementer a63a5ead674bc2245
Task 3: agent implementer a3553b37d08966798
Task 3: complete (commits 6c32ab6..73d8a55, not reviewed; splash handover reproduced, not fixed)
Note: Splash handover: Chrome 156's receiveFile returns false with no log; androidbrowserhelper then launches without a splash, leaving the cold-start black gap. No project-side fix found in the 30-minute box.
Progress: 2/3 tasks — Task 3 Android rename, splash handover and signed artifacts — 2/3 tasks — Task 3 Android rename, splash handover and signed artifacts — FlashCards in the launcher, AAB/APK re-signed, feature graphic redrawn; splash handover failure is Chrome-side
Task 2: merged (e758e8f..e758e8f)
Task 2: complete (commits 6c32ab6..e758e8f, not reviewed)
Progress: 3/3 tasks — Task 2 Deletion screens, the cancelled-redirect fix and the login screen — 3/3 tasks — Task 2 Deletion screens, the cancelled-redirect fix and the login screen — icon-row deletion and privacy pages, profile row, dialog unlocked except while deleting, login without the delete link
Task 2: Ruling: Profile row icon set to the spec's mdi-account-remove-outline in the error colour, and deletion.app.body capitalised in en.json instead of with CSS — spec 2.1 names that icon; a CSS capital was a workaround for the string — none
Note: Flake: tests/e2e/public-pages.spec.ts signed-in delete-account — signUp's /home wait timed out once in the full suite on desktop; 48/48 on three repeats alone
