# SDD ledger — plan: docs/plans/2026-11-02-library-search-sort.md
Plugin: ga 2.15.0 (e989938)
Policy: git.commit=task; run.checkpoints=none; run.unattended=false; run.on-conflict=stop; run.on-plan-defect=rule; run.max-fix-rounds=2; review.when=off; review.minors=defer; knowledge.update=after-finish
Run base: 3edc2148cfaa6b36f0fb636b9a5c6b2ff65cda81
Ruling: Run branch feat/library-search-sort is cut from master 0b77919 (#42 merged) plus 3edc214, this plan's amendment — plan 4 depends on plan 1 only, merged in #39 — none
Ruling: Task 2 and Task 3 stay untagged for failure-paths: they only display stored prefs and set fields, and load no data of their own — run check noted screens without the tag; no review runs here, so the tag would only add a lens nobody applies — none
Pre-flight: Task 1 x Tasks 2, 3: Task 1 adds SetOrder values, SET_ORDERS, titleMatches, cardMatchCount, learnedPercent, relativeTime and every locale key; Tasks 2 and 3 edit no locale or util file
Pre-flight: Task 2 x Task 3: Settings.vue (Task 2) vs CardFlashSet.vue and Home.vue (Task 3), disjoint
Pre-flight: Task 3: CardFlashSet already shows plan 3's due/new counts; the new lines fit beside them in 182 px (plan amended 3edc214)
Pre-flight: Task 1: filterAndSortSets change doesn't affect dueQueue, which sorts by title on its own
Ruling: Task 1, Task 2 and Task 3 run only the tests they write, by file; Task 2 and Task 3 are built side by side in worktrees and write their e2e specs without running them; the controller runs tests/e2e/library-sort.spec.ts and tests/e2e/library-search.spec.ts, plus tests/e2e/due-review.spec.ts (Task 3 shares the set card with its counts), on the merged branch at the end — policy: e2e at the end; worktrees share emulator ports — e2e failures surface after both tasks are in
Task 1: started 2026-11-05 11:47
Task 1: agent implementer a218ac5fb7bcb092e
Task 1: complete (commits 3edc214..3eed15f, not reviewed)
Progress: 1/3 tasks — Task 1 Card search, new orders, relative time and the copy — Card search, new orders, relative time and copy — titleMatches, cardMatchCount, learnedPercent, Progress and Recently studied, relativeTime
Task 2: started 2026-11-05 11:48 (worktree from 3eed15f)
Task 3: started 2026-11-05 11:48 (worktree from 3eed15f)
Ruling: Task 2: the Recently studied e2e case reviews Beta, not Alpha, and expects Beta before Alpha — alphabetical order already puts Alpha first, so reviewing Alpha couldn't fail without the sort — none; same requirement, stronger test
Task 2: agent implementer a778748e137440278
Task 2: merged (7fd8ee4..7fd8ee4)
Task 2: complete (commits 3eed15f..7fd8ee4, not reviewed; e2e pending)
Progress: 2/3 tasks — Task 2 New orders in Settings — New orders in Settings — Least learned first and Recently studied
Task 3: agent implementer a6c08437e8a41fb84
Task 3: merged (760a8bc..760a8bc)
Task 3: complete (commits 3eed15f..760a8bc, not reviewed; e2e pending)
Progress: 3/3 tasks — Task 3 Match count and last-studied line on set cards — Match count and last-studied line on set cards
Note: e2e on 760a8bc (library-sort, library-search, due-review, a11y): 40 passed, 16 failed; due-review and a11y all passed. library-search: getByLabel('Search') matches 2 elements (toggle button and input share the label). library-sort: the order select isn't found as combobox 'Card-sets order'. Details in .ga/runs/2026-11-02-library-search-sort/e2e-failures.md
Ruling: Task 2 and Task 3: one fix round in place for the 16 e2e failures; each diagnosed as test or code from the trace, no Acceptance weakened — e2e is the tasks' own tests — one more e2e run
Note: Fix round 1 (607a005, cfffcee): library-search and two library-sort tests were test bugs (Search toggle and field share a label; the select's inner input isn't clickable; uppercase is CSS); the select-open a11y test found a real violation (aria-input-field-name: the open order list's aria-labelledby pointed at no label), fixed in Settings.vue with list-props aria-label. library-sort + library-search + due-review: 50/50
Run: finished 2026-11-05 12:03
