---
type: Decision
title: E2E tests run only before a deploy
description: The Playwright e2e job is skipped on pull requests and runs only when deploy.yml calls CI, so every hosting deploy still waits for it.
generated: { by: claude-code/claude-opus-5-5, at: 2026-11-04T17:45:10Z }
verified: human:panditankit1995@gmail.com
---

# E2E tests run only before a deploy

## Context

`.github/workflows/ci.yml` ran two jobs on every pull request: `checks` and `e2e`, the Playwright suite against the
emulators. `.github/workflows/deploy.yml` calls the same workflow before it deploys hosting.

## Decision

The `e2e` job runs only when `deploy.yml` calls `ci.yml`, on a push to `master` or a manual run. On pull requests it is
skipped (`if: ${{ github.event_name != 'pull_request' }}`). The developer decided this on 2026-11-04.

## Consequences

- A pull request can merge with an e2e failure that no one has seen yet. The deploy that follows the merge runs e2e
  first, and a failure there stops the deploy.
- Branch protection on `master` still lists the e2e check as required. A job skipped by its `if` reports success, so
  it doesn't block a pull request.
- To run e2e before merging, run `pnpm run test:e2e` locally ([testing](../quality/testing.md)).

## Sources

- `.github/workflows/ci.yml`
- `.github/workflows/deploy.yml`
