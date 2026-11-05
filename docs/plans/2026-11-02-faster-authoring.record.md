# SDD ledger — plan: docs/plans/2026-11-02-faster-authoring.md
Plugin: ga 2.15.0 (e989938)
Policy: git.commit=task; run.checkpoints=none; run.unattended=false; run.on-conflict=stop; run.on-plan-defect=rule; run.max-fix-rounds=2; review.when=off; review.minors=defer; knowledge.update=after-finish
Run base: 416a3bbba9bf1ebb0fc7c51e6a78ff5f391f2463
Ruling: Run branch feat/faster-authoring is cut from master 312f9c9 (study modes merged, #39) plus 416a3bb, the plan's amendment — the developer chose to merge #39 first; the plan was amended for plan 1's component API and studiedAt — none; 416a3bb is docs only
Pre-flight: Task 1 x Tasks 3, 4, 5: Task 1 adds every locale key the others use; they edit no locale file
Pre-flight: Task 1 x Task 3: Task 3 consumes parseImport, importFormatFor, skippedLinesText, MAX_IMPORT_FILE_BYTES and the size check in createSet/saveSet
Pre-flight: Task 2 x Tasks 3, 5: Tasks 3 and 5 consume setToCsv, setToJson, exportFileName, buildBackup, parseBackup, backupFileName and downloadText (spec 13 signature)
Pre-flight: Task 3 x Task 4: Add.vue (Task 3) hosts GroupCardFlash (Task 4); Task 4's add-after is handled inside GroupCardFlash, so Add.vue needs no change for it
Pre-flight: Task 4: keeps plan 1's reverse prop and flip/scrollToCard/next/prev/goTo/flipFocused (plan amended 416a3bb); scroll to the inserted card uses scrollToCard
Pre-flight: Task 5: restore creates labels through library.createLabel and sets through createSet; online-only per rule 2.10
Pre-flight: Tasks 1 and 2: new files except library.ts and the locales (Task 1); no overlap
Ruling: Task 1, Task 2, Task 3, Task 4 and Task 5 run only the tests they write, by file name; Task 3, Task 4 and Task 5 are built in worktrees and write their e2e specs without running them; the controller runs tests/e2e/authoring.spec.ts, tests/e2e/quick-entry.spec.ts and tests/e2e/backup.spec.ts by name on the merged branch at the end, and a failure goes back to that task's implementer — the policy runs e2e only at the end, and worktrees share emulator ports — e2e failures surface after all three tasks are in
Ruling: Task 4 is treated as failure-paths for its own tests: inserting a card when the set is at the size limit still saves through the store's size check — run check noted Task 4 builds a screen without the failure-paths tag; no review runs, so this only shapes its tests — none
Task 1: started 2026-11-05 10:04 (worktree from 416a3bb)
Task 2: started 2026-11-05 10:04 (worktree from 416a3bb)
Task 2: agent implementer a829556be0e7a2e2c
Task 2: merged (586e084..586e084)
Task 2: complete (commits 416a3bb..586e084, not reviewed)
Progress: 1/5 tasks — Task 2 Export, backup files and download — Export, backup files and download — setToCsv/Json, exportFileName, buildBackup/parseBackup, downloadText
Task 1: agent implementer ade461877f09da351
Task 1: merged (83b5f4a..83b5f4a)
Task 1: complete (commits 416a3bb..83b5f4a, not reviewed)
Progress: 2/5 tasks — Task 1 Import parsing, size limit and the copy — Import parsing, size limit and the copy — parseImport (lines and RFC 4180 CSV), 900,000-byte check in createSet/saveSet, 24 locale keys
Task 3: started 2026-11-05 10:08 (worktree from 83b5f4a)
Task 4: started 2026-11-05 10:08 (worktree from 83b5f4a)
Task 5: started 2026-11-05 10:08 (worktree from 83b5f4a)
Task 5: agent implementer a440f51ffba54b1b5
Task 5: merged (c5464c1..c5464c1)
Task 5: complete (commits 83b5f4a..c5464c1, not reviewed; e2e pending)
Progress: 3/5 tasks — Task 5 Backup and restore in Settings — Backup and restore in Settings — backup download, restore with label matching, online-only
Task 4: agent implementer a1508db17fc7fae44
Task 4: merged (e408623..e408623)
Task 4: complete (commits 83b5f4a..e408623, not reviewed; e2e pending)
Progress: 4/5 tasks — Task 4 Faster card entry — Faster card entry — Next: back side / Tab, Save and add next / Ctrl+Enter inserts and opens the next card
Task 3: agent implementer a2ebd558c3b71a476
Task 3: merged (2ec70fb..2ec70fb)
Ruling: Task 3: Duplicate set copies each card whole (every field, unknown ones included, and its date), with a new id, learned false and no srs; it does not rebuild cards from front and back — spec 3.1 keeps every card field across saves, and spec 5.4 asks for the same cards with progress cleared; the implementer rebuilt cards from front/back only — a small change in Add.vue and one e2e assertion
Ruling: Task 2: tests/unit/cardExport.spec.ts:122 aliases this (lint error @typescript-eslint/no-this-alias); rewrite that stub without the alias — npm run lint fails on it — none
Note: First e2e run on the merged branch broke off after 5 of 72 tests: the splitify project's emulators were running on 4400/9099 at the same time; not a result
Task 3: complete (commits 83b5f4a..b5b3e51, not reviewed; e2e pending; fix b5b3e51 (duplicate copies cards whole, lint))
Progress: 5/5 tasks — Task 3 Editor options: import, export, duplicate, reorder — Editor options — Import cards, Export as CSV/JSON, Reorder cards, Duplicate set
Note: End checks on b5b3e51: typecheck clean; lint 0 errors, 1 existing warning; build ok; smoke on port 8093 (8080 held by another session) served the app and every new module. e2e for authoring, quick-entry and backup not yet run: Firestore emulator pid 22711, orphaned by the first broken run, holds 8085 and stopping it was denied; splitify's emulators also cycle on 9099/4400
Note: e2e on b5b3e51 (authoring, quick-entry, backup): 56 passed, 16 failed = 8 tests x 2 projects; backup.spec all passed. Main cause: getByRole('button', { name: 'Save' }) in tests/e2e/helpers.ts now also matches the visible 'Save and add next' button (Task 4); also a Ctrl+Enter insert test timing out. Details in .ga/runs/2026-11-02-faster-authoring/e2e-failures.md
Ruling: Task 4 and Task 3: one fix round in place for the 8 failing e2e tests; the fix decides from the trace whether 'Save and add next' showing outside the open text dialog is a UI bug (then it renders only inside the open dialog) or the helper's Save locator is too loose (then exact: true), and checks tests/e2e/sets.spec.ts, which uses the same helper — e2e is the tasks' own tests; the shared helper means older suites may break too — one more e2e run
Note: Fix round 2 (4a4f71a, spec files only): all 8 were test bugs (Save locator not exact while the dialog closes; an extra flip click; options panel left open; .mdi-star matching the hidden swipe icon). e2e authoring + quick-entry + sets: 64/64; backup.spec passed 16/16 on b5b3e51 and src/ is unchanged since
Ruling: Task 3 and Task 4: no src/ change was needed for the e2e failures; the fix only tightened test locators and steps, keeping each Acceptance expectation — the fix report traced each failure to the test — none
Run: finished 2026-11-05 11:04
Known: an all-fail restore shows only the per-set snacks, no summary snack
Known: a backup set with no valid date restores with today's date
Known: no task, branch or final review ran; the branch was merged with master (2100 port block) and backup.spec.ts was pointed at DEV_PORTS (c76a4ff)
