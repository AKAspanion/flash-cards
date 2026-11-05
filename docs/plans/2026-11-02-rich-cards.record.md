# SDD ledger — plan: docs/plans/2026-11-02-rich-cards.md
Plugin: ga 2.16.0 (5660c9e)
Policy: git.commit=task; run.checkpoints=none; run.unattended=false; run.on-conflict=stop; run.on-plan-defect=rule; run.max-fix-rounds=2; review.when=end-of-plan; review.minors=defer; knowledge.update=end-of-plan
Run base: ef4bde80be34131d6611d266c015663af20efd4e
Note: Policy (developer, 2026-11-05): plans 5, 6, 9, 7 and 8 are built back to back on feat/usability-plans-5-9 and go in one PR; keep the sharing plan's stop after its Task 1; ask before the push and the PR; after-finish jobs run at the end
Ruling: Task 1 stays not-security (two dependencies and a set field; the sanitizer is Task 2's, which is tagged security); Task 4 is treated as failure-paths for its own tests: an image address that fails to load, and speech synthesis that errors or is missing — run check notes — none
Pre-flight: Task 1 x all: dependencies (root manifest, lockfile) — runs alone; adds SpeechLanguages, cardSetMapper speech, every locale key incl. study.shortcuts.read-aloud (plan amended ef4bde8)
Pre-flight: Task 2 x Task 4: renderCardText, cardPlainText; Task 4 renders every face through them
Pre-flight: Task 3 x Task 4: speechAvailable, speak, voiceLanguages; Task 3 edits Add.vue only, Task 4 the card components, View.vue, Due.vue and StudyShortcutsDialog.vue
Pre-flight: Task 4: CardFlash and GroupCardFlash keep plans 1-3's props, emits and exposed methods (plan amended ef4bde8)
Ruling: Task 1, Task 2, Task 3 and Task 4 run only the tests they write, by file; Task 3 and Task 4's e2e specs are written in worktrees and run by the controller on the merged branch with study-modes, srs-review and a11y — policy — e2e failures surface late
Task 1: started 2026-11-05 12:42
Task 1: agent implementer a2850e3052be117c6
Task 1: complete (commits ef4bde8..91c6f64, not reviewed)
Progress: 1/4 tasks — Task 1 Dependencies, the `speech` field and the copy — Dependencies, speech field and copy — markdown-it 14, DOMPurify 3, CardSet.speech, locale keys; audit clean
Task 2: started 2026-11-05 12:43 (worktree from 91c6f64)
Task 3: started 2026-11-05 12:43 (worktree from 91c6f64)
Task 2: agent implementer a44da1c12f7c24b49
Task 2: merged (5210e98..5210e98)
Task 2: complete (commits 91c6f64..5210e98, not reviewed)
Progress: 2/4 tasks — Task 2 Sanitized Markdown renderer — Sanitized Markdown renderer — renderCardText and cardPlainText, 50 tests incl. hostile inputs
Task 3: agent implementer ab4af1a23c7e86386
Task 3: merged (461118b..461118b)
Task 3: complete (commits 91c6f64..461118b, not reviewed; e2e pending)
Progress: 3/4 tasks — Task 3 Speech helper and the read-aloud language option — Speech helper and read-aloud language option
Task 4: started 2026-11-05 12:47
Task 4: agent implementer a392a05f2a78fc192
Task 4: complete (commits 461118b..d7c9965, not reviewed; e2e rich-cards + read-aloud-language + study-modes + srs-review + due-review 122/122)
Progress: 4/4 tasks — Task 4 Rendered cards, image insertion and read aloud — Rendered cards, image insertion and read aloud — v-html only through renderCardText; R on the review screen and /due
Run: finished 2026-11-05 16:49
