---
type: Decision
title: Rules and functions are deployed by hand
description: A push to master deploys hosting only; firestore.rules and the Cloud Functions are deployed deliberately by hand.
status: draft
generated: { by: claude-code/claude-opus-5-5, at: 2026-11-02T19:30:00Z }
---

# Rules and functions are deployed by hand

## Context

`.github/workflows/deploy.yml` deploys hosting on every push to `master`. It deploys `firestore.rules` only when
run by hand with `deploy_rules` ticked. The Cloud Functions are deployed from a developer's machine with
`npm run deploy:functions`.

## Decision

Keep it that way: `firestore.rules` and the functions are deployed only by hand. The developer decided this on
2026-11-03.

## Consequences

- A change that needs new rules has to have them deployed by hand before, or together with, the hosting deploy that
  relies on them. Otherwise the live app can call Firestore in a way the live rules reject.
- CI still builds and tests both on every pull request ([CI](../quality/ci.md)).

## Sources

- `.github/workflows/deploy.yml`
- `package.json`
