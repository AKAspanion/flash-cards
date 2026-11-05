# SDD ledger — plan: docs/plans/2026-11-02-study-modes.md
Plugin: ga 2.15.0 (e989938)
Policy: git.commit=task; run.checkpoints=none; run.unattended=false; run.on-conflict=stop; run.on-plan-defect=rule; run.max-fix-rounds=2; review.when=off; review.minors=defer; knowledge.update=after-finish
Run base: c0e0248590a414361aa3751f5bfe1108b5c87a17
Ruling: Run branch feat/study-modes is cut from master 64de011 plus c0e0248, the spec reverification this run builds on — the plan was amended in that commit (pnpm, scrollToCard) — none; c0e0248 is docs only
Pre-flight: Task 1 x Task 4: both edit src/locales/en.json and hi.json; Task 1 adds study.* and empty.study.*, Task 4 adds study.summary.*; disjoint keys, Task 4 waits on Task 1
Pre-flight: Task 1 x Task 3: Task 1 adds @vue/test-utils that Task 3's component test needs; Task 3 waits on Task 1
Pre-flight: Task 2 x Task 4: Task 4 consumes buildQueue, summarize, useStudyShortcuts exactly as Task 2 produces them (spec 13)
Pre-flight: Task 3 x Task 4: Task 4 consumes reverse, next, prev, goTo, flipFocused; GroupCardFlash already exposes scrollToCard (used by Add.vue), kept, and goTo calls it (plan amended c0e0248)
Pre-flight: Task 1: self-consistent; touches package.json and pnpm-lock.yaml, so it runs alone
Pre-flight: Task 2: self-consistent; new files only
Pre-flight: Task 3: self-consistent; acceptance case goTo(5) with three cards clamps to index 2 via scrollToCard; the plan's scrollTo stub still covers it because scrollToCard calls el.scrollTo
Pre-flight: Task 4: its own test is e2e; built in place last, it runs only tests/e2e/study-modes.spec.ts by name
Ruling: Task 1, Task 2, Task 3 and Task 4 run only the tests they write, by file name (pnpm exec vitest run <file>, or for Task 4 the e2e spec alone through emulators:exec), not the plan's whole-suite npm test / npm run test:e2e lines — the workflow policy: a task runs only the tests it writes; checks.per-task none — a regression elsewhere shows only at the end checks
Note: dev servers and dashboard not started: port 8080 held by the twa-google-guidelines-setup worktree's vite, 4800 by another project's dashboard; left running
Task 1: started 2026-11-05 09:34
Task 1: agent implementer aa65091b96858d353
Task 1: complete (commits c0e0248..534996d, not reviewed)
Progress: 1/4 tasks — Task 1 Data and copy foundation — 1/4 tasks — Task 1 Data and copy foundation — card fields survive round trips, studiedAt, dates helpers, study prefs and copy
Task 2: started 2026-11-05 09:35 (worktree from 534996d)
Task 3: started 2026-11-05 09:35 (worktree from 534996d)
Task 2: agent implementer a22c1db489bf7dd47
Task 2: merged (ec63dfa..ec63dfa)
Task 2: complete (commits 534996d..ec63dfa, not reviewed)
Progress: 2/4 tasks — Task 2 Study queue and keyboard shortcuts — Study queue and keyboard shortcuts — buildQueue, summarize and useStudyShortcuts with the rule 2.5 guards
Task 3: agent implementer ab4b57698173a244f
Task 3: merged (c778e81..c778e81)
Task 3: complete (commits 534996d..c778e81, not reviewed)
Progress: 3/4 tasks — Task 3 Card components can be driven from outside — Card components driven from outside — reverse prop, flip(), next/prev/goTo/flipFocused
Ruling: Task 4: GroupCardFlash's next(), prev() and goTo() set its focused index to the target at once and emit focused, rather than waiting for the scroll event; Task 4 may modify src/components/GroupCardFlash.vue and tests/unit/GroupCardFlash.spec.ts for this, keeping Task 3's tests passing — Task 3 reported next/prev read focused only after smooth scrolling lands, so K pressed twice quickly marks the same card twice and the K-then-K acceptance case fails — a small change to Task 3's component, covered by a unit test that calls next() twice without a scroll event
Task 4: started 2026-11-05 09:38
Task 4: agent implementer ab8bba29c8b52efb9
Task 4: complete (commits c778e81..579c902, not reviewed)
Progress: 4/4 tasks — Task 4 Review screen — options, shortcuts, reset and summary — Review screen — Study options panel, shortcuts dialog, reset, session summary, studiedAt on save
Note: Task 4 minor (deferred): Space pressed on a focused button also flips the card, because useStudyShortcuts doesn't skip events that are already defaultPrevented or targeted at buttons
Note: Task 4 minor (deferred): the left bar button's accessible name stays Back while its text reads Done
Run: finished 2026-11-05 09:52
