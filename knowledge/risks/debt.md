---
type: Technical Debt
title: Technical debt
description: Known weak spots worth fixing — whole-set rewrites, out-of-date compatibility comments, and rules that must be deployed by hand ahead of code.
generated: { by: claude-code/claude-opus-5-5, at: 2026-11-02T19:30:00Z }
verified: human:panditankit1995@gmail.com
---

# Technical debt

## Items

- **Whole-set writes.** Cards are a JSON string inside their set, so every change rewrites the whole
  document. The app refuses a save over `MAX_CARDS_BYTES = 900_000`
  ([decision](../decisions/set-size-limit-900000-bytes.md)); `firestore.rules` does not enforce it. The format no longer has to stay as it is
  ([original app compatibility](../decisions/original-app-compatibility.md)).
- **Out-of-date reasons in comments.** `firestore.rules`, `src/services/cardSetMapper.ts`, `src/stores/prefs.ts`
  and `vite.config.ts` give compatibility with the original app as the reason for a shape, but that app is no longer
  in use.
- **Rules must be deployed ahead of code.** A push to `master` deploys hosting only, and rules are deployed by hand
  on purpose ([manual deploys](../decisions/manual-rules-and-functions-deploy.md)). Code that relies on new rules
  can go live before them unless someone deploys the rules first. The `user-stats` and `shared-sets` rules are such a
  case: stats and sharing fail until `deploy.yml` runs with `deploy_rules` ticked.

## History

- 2026-11-05: "No offline saves" was listed as debt; now saves work offline through a persistent cache, so the item is gone. See [offline study](../features/offline-study.md).
- 2026-11-05: the missing size cap was listed as debt; now the app refuses a save over 900,000 bytes, because faster authoring made big sets easy. See [the size decision](../decisions/set-size-limit-900000-bytes.md).
- 2026-11-03: "rules allow label deletion" was listed as debt; now intended, so account deletion can remove labels. See [Labels are deleted only with the account](../decisions/labels-deleted-only-with-account.md).
- 2026-11-03: the whole-set format was "kept on purpose" for the original app; now no longer required. Label
  deletion was an open question; now decided against, which leaves the rules out of step. Separate rules deploys
  were listed as debt; now deliberate. See [Labels cannot be deleted](../decisions/labels-cannot-be-deleted.md) and
  [Rules and functions are deployed by hand](../decisions/manual-rules-and-functions-deploy.md).

## Sources

- `src/services/cardSetMapper.ts`
- `src/stores/prefs.ts`
- `vite.config.ts`
- `firestore.rules`
- `.github/workflows/deploy.yml`
- `src/services/localCache.ts`
