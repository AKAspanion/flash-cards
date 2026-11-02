---
type: Technical Debt
title: Technical debt
description: Known weak spots worth fixing — whole-set rewrites with no size cap, no offline saves, out-of-date compatibility comments, and rules that must be deployed by hand ahead of code.
generated: { by: claude-code/claude-opus-5-5, at: 2026-11-02T19:30:00Z }
verified: human:panditankit1995@gmail.com
---

# Technical debt

## Items

- **Whole-set writes, no size cap.** Cards are a JSON string inside their set, so every change rewrites the whole
  document, and a large enough set stops saving at Firestore's per-document size limit. The cap is a requirement:
  [set size limit](../requirements/set-size-limit.md). The format no longer has to stay as it is
  ([original app compatibility](../decisions/original-app-compatibility.md)).
- **No offline saves.** The editor and study screens refuse to save while offline (`persist` in
  `src/views/Add.vue`, `saveProgress` in `src/views/View.vue`); nothing is queued. The approved plan
  `docs/plans/2026-11-02-offline-study.md` addresses it.
- **Out-of-date reasons in comments.** `firestore.rules`, `src/services/cardSetMapper.ts`, `src/stores/prefs.ts`
  and `vite.config.ts` give compatibility with the original app as the reason for a shape, but that app is no longer
  in use.
- **Rules must be deployed ahead of code.** A push to `master` deploys hosting only, and rules are deployed by hand
  on purpose ([manual deploys](../decisions/manual-rules-and-functions-deploy.md)). Code that relies on new rules
  can go live before them unless someone deploys the rules first.

## History

- 2026-11-03: "rules allow label deletion" was listed as debt; now intended, so account deletion can remove labels. See [Labels are deleted only with the account](../decisions/labels-deleted-only-with-account.md).
- 2026-11-03: the whole-set format was "kept on purpose" for the original app; now no longer required. Label
  deletion was an open question; now decided against, which leaves the rules out of step. Separate rules deploys
  were listed as debt; now deliberate. See [Labels cannot be deleted](../decisions/labels-cannot-be-deleted.md) and
  [Rules and functions are deployed by hand](../decisions/manual-rules-and-functions-deploy.md).

## Sources

- `src/services/cardSetMapper.ts`
- `src/views/Add.vue`
- `src/views/View.vue`
- `src/stores/prefs.ts`
- `vite.config.ts`
- `firestore.rules`
- `.github/workflows/deploy.yml`
- `docs/plans/2026-11-02-offline-study.md`
