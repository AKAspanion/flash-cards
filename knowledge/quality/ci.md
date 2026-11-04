---
type: Runbook
title: CI and deploy
description: GitHub Actions runs lint, types, unit, rules, build, audits and e2e on every pull request; a push to master runs the same checks and then deploys hosting; rules deploy only on a manual run.
generated: { by: claude-code/claude-opus-5-5, at: 2026-11-02T19:12:23Z }
verified: human:panditankit1995@gmail.com
---

# CI and deploy

## Pipelines

- `.github/workflows/ci.yml`, on every pull request and called by deploy: job `checks` (lint, type-check, unit
  tests, rules tests, production build, `pnpm audit --prod` of shipped dependencies, build and audit of
  `functions/`) and
  job `e2e` (the Playwright suite; the report is uploaded on failure).
- `.github/workflows/deploy.yml`, on push to `master` or by hand: runs `ci.yml`, checks that the deploy variables
  and secret exist, builds, and deploys hosting to the live channel, passing the optional AdSense variables `VUE_APP_ADSENSE_CLIENT` and `VUE_APP_ADSENSE_SLOT` to the build ([environment](../operations/environment.md)). Run by hand with `deploy_rules` ticked, it also
  deploys `firestore.rules`. One deploy runs at a time (concurrency group `deploy-production`).
- Both workflows set pnpm up with `pnpm/action-setup` and install the root with `pnpm install --frozen-lockfile`, and `functions/` with
  `pnpm --dir functions` ([pnpm](../decisions/pnpm-package-manager.md)).
- `.github/workflows/codeql.yml`: CodeQL analysis on pull requests, pushes and weekly.
- `.github/dependabot.yml`: weekly grouped npm and GitHub Actions updates.
- Cloud Functions are not deployed by CI: `npm run deploy:functions` from a developer's machine. Rules and
  functions are deployed by hand on purpose: see [manual deploys](../decisions/manual-rules-and-functions-deploy.md).
- Every pull request is reviewed by the developer, Hindi strings included: see
  [PR review](../decisions/pr-review.md).

## Gates

- A pull request must pass both CI jobs.
- Hosting deploys only after CI passes on `master`.
- Actions are pinned to commit SHAs and kept current by Dependabot (README, "CI/CD").

## History

- 2026-11-04: the root and `functions/` installed with `npm ci` and were audited with `npm audit`; now `pnpm install --frozen-lockfile` and `pnpm audit --prod`, because both moved to pnpm. See [pnpm](../decisions/pnpm-package-manager.md).

## Sources

- `.github/workflows/ci.yml`
- `.github/workflows/deploy.yml`
- `.github/workflows/codeql.yml`
- `.github/dependabot.yml`
- `package.json`
- `pnpm-workspace.yaml`
- `README.md`
