# SDD ledger — plan: docs/plans/2026-11-05-local-dev-ports.md
Plugin: ga 2.15.0 (e989938)
Policy: git.commit=task; run.checkpoints=none; run.unattended=false; run.on-conflict=stop; run.on-plan-defect=rule; run.max-fix-rounds=2; review.when=off; review.minors=defer; knowledge.update=after-finish
Run base: 97eba9af960f33b346ae3a1cbcb0602f00e82b6e
Ruling: Dev servers start after the last task, not before Task 1 — this plan moves the dev server and emulator ports, and Task 2 checks 2100 is free; servers started on the old ports would be stale and in the way — the developer waits for the end to see the running app
Task 1: started 2026-11-05 09:45
Task 1: agent implementer a75b987f609f1641b
Task 1: complete (commits 97eba9a..0663ce7, not reviewed)
Progress: 1/3 tasks — Task 1 The port map and its guard — 1/3 tasks — Task 1 The port map and its guard — DEV_PORTS in dev-ports.ts, firebase.json emulators on 2101–2106, guarded by devPorts.spec.ts
Ruling: Task 2 is built in place, beside Task 3 in a worktree — Task 2's acceptance can only be checked by starting the dev server and preview on their real ports, which needs the main checkout's env and node_modules; Task 3 is docs only and touches none of Task 2's files — Task 2's server checks could collide with nothing else in this run; if wrong, Task 3 merges a minute later
Task 2: started 2026-11-05 09:46
Task 3: started 2026-11-05 09:46 (worktree from 0663ce7)
Task 3: agent implementer ab30a4599373dcb85
Task 2: agent implementer a42fa7694d82584c8
Task 2: complete (commits 0663ce7..868b7e4, not reviewed)
Progress: 2/3 tasks — Task 2 The dev server, previews and emulator connection read DEV_PORTS — 2/3 tasks — Task 2 apps read DEV_PORTS — dev server 2100, preview 2107, e2e 2108, emulator connection 2102/2103
Task 3: complete (commits 0663ce7..5fc6220, not reviewed)
Progress: 3/3 tasks — Task 3 README and the deferred AI plans name the new ports — 3/3 tasks — Task 3 docs — README and the deferred AI plans name the 2100 block
Ruling: The stale-concept reread goes to the after-finish job — CLAUDE.md's policy gives knowledge stale and the concept edits (run-locally, google-sign-in-redirect, android-release, testing still name 8080/4317) to the after-finish job once the merge request is open — those concepts name the old ports until that job runs
Run: finished 2026-11-05 09:50
