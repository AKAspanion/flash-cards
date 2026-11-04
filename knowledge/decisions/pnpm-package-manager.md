---
type: Decision
title: The project installs with pnpm
description: The web app and functions/ both install with pnpm, pinned by packageManager in package.json, each with its own overrides and build-script policy in a pnpm-workspace.yaml.
status: draft
generated: { by: claude-code/claude-opus-5-5, at: 2026-11-04T17:34:46Z }
---

# The project installs with pnpm

## Context

The web app and `functions/` were installed with npm, each with its own `package-lock.json`. On 2026-11-04 the
developer switched both to pnpm.
The version is pinned by `packageManager` in `package.json`. pnpm 12 also enforces a minimum release age: it rejects a
lockfile entry published less than a day ago, so a fresh resolution picks the newest version that has been out for at
least a day.

## Decision

- The root and `functions/` each install with pnpm, with their own `pnpm-lock.yaml` and `pnpm-workspace.yaml`.
  `functions/` is not a workspace package of the root: it is installed on its own (`pnpm --dir functions`).
- Dependency overrides live under `overrides` in each `pnpm-workspace.yaml`, because pnpm ignores npm's `overrides`
  field in `package.json`. Left there, the security pins on `@grpc/grpc-js`, `ejs`, `minimatch` and `glob` silently
  stopped applying, and the functions audit found two moderate advisories.
- Install-time build scripts are refused unless `allowBuilds` allows them. The root sets the scripts of
  `@firebase/util` and `protobufjs` to `false`, because the browser app needs neither; `functions/pnpm-workspace.yaml`
  allows both, as the developer set it.
- CI and deploy set pnpm up with `pnpm/action-setup`, which reads `packageManager`, and then install with
  `pnpm install --frozen-lockfile` ([CI](../quality/ci.md)).

## Consequences

- A lockfile resolved while the release-age check was off can hold a package less than a day old, and pnpm then
  refuses to install. The fix is `pnpm clean --lockfile`, then `pnpm install`, which re-resolves within the policy.
- A new override goes in `pnpm-workspace.yaml`, not `package.json`.
- A dependency that needs its build script has to be allowed in `allowBuilds`, or install fails with
  an ignored-builds error.

## Sources

- `package.json`
- `pnpm-workspace.yaml`
- `pnpm-lock.yaml`
- `.github/workflows/ci.yml`
- `.github/workflows/deploy.yml`
- `functions/package.json`
- `functions/pnpm-workspace.yaml`
