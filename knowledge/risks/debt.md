---
type: Technical Debt
title: Technical debt
description: Known weak spots worth fixing — whole-set rewrites with a document size ceiling, no offline saves, labels that can't be deleted, and rules deployed separately from hosting.
status: draft
generated: { by: claude-code/claude-opus-5-5, at: 2026-11-02T19:12:23Z }
---

# Technical debt

## Items

- **Whole-set writes.** Cards are a JSON string inside their set, so every change rewrites the whole document, and a
  set is bounded by Firestore's per-document size limit. The format is kept on purpose
  ([original app compatibility](../decisions/original-app-compatibility.md)), but very large sets will fail to save.
- **No offline saves.** The editor and study screens refuse to save while offline (`persist` in
  `src/views/Add.vue`, `saveProgress` in `src/views/View.vue`); nothing is queued. The approved plan
  `docs/plans/2026-11-02-offline-study.md` addresses it.
- **Labels can't be deleted**, and sets keep label ids that nothing cleans up: see
  [label deletion](../questions/label-deletion.md).
- **Rules and hosting deploy separately.** A push to `master` deploys hosting only; a rules change needs a manual run
  of `deploy.yml` with `deploy_rules` ticked, so code that relies on new rules can go live before them
  (`.github/workflows/deploy.yml`).

## Sources

- `src/services/cardSetMapper.ts`
- `src/views/Add.vue`
- `src/views/View.vue`
- `src/services/firebase.ts`
- `.github/workflows/deploy.yml`
- `docs/plans/2026-11-02-offline-study.md`
