---
type: Decision
title: The audit ignores picomatch's unpatched ReDoS advisory
description: CI's pnpm audit ignores GHSA-fc5q-39xc-vjpf, a high picomatch ReDoS with no fixed version, because picomatch comes only through vue-router's unused build-time plugin and never reaches the built app; the entry goes once picomatch ships a fix.
generated: { by: claude-code/claude-opus-5-5, at: 2026-11-18T04:47:57Z }
verified: human:ankitp@geekyants.com
stated: "Add an audit exception for GHSA-fc5q-39xc-vjpf (picomatch ReDoS, no patched version, only via vue-router's unused build-time plugin, not in the built app) in this PR, rather than leave CI failing? — Yes, in this PR"
stated_via: chat
---

# The audit ignores picomatch's unpatched ReDoS advisory

## Context

CI fails a pull request on any moderate or worse advisory in shipped dependencies (`pnpm audit --prod`,
[CI](../quality/ci.md)). On 2026-11-18 it began failing on `GHSA-fc5q-39xc-vjpf`, a high-severity ReDoS in
`picomatch` through single-branch repeated extglobs. Every picomatch version up to 4.0.7 is affected, and 4.0.7 is the
latest, so there is nothing to upgrade or override to. The latest `vue-router` (5.5.1) still depends on it.

`picomatch` comes only through `vue-router`, whose build-time file-routing plugin (`vue-router/unplugin`) pulls it in
along with `tinyglobby` and `unplugin`. This app lists its routes by hand in `src/router/index.ts` and never loads
that plugin (`vite.config.ts`), and the built app holds no `picomatch` code. A ReDoS there would need an attacker's
glob pattern at build time, which doesn't exist here.

## Decision

`pnpm-workspace.yaml` ignores `GHSA-fc5q-39xc-vjpf` under `auditConfig.ignoreGhsas`, so CI's audit passes. Every other
advisory still fails it. The developer chose this on 2026-11-18, over leaving CI failing until a patch ships.

## Consequences

- Once `picomatch` publishes a fixed version, the entry is removed and the lockfile updated, so the audit covers it
  again.
- If the app ever uses `vue-router`'s file-routing plugin, or anything that matches globs from user input, this
  decision needs revisiting.

## Sources

- `pnpm-workspace.yaml`
- `.github/workflows/ci.yml`
- `vite.config.ts`
- `src/router/index.ts`
