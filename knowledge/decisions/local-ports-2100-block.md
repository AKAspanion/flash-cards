---
type: Decision
title: Local ports live in the 2100 block
description: Every port the project opens on the developer's machine — dev server, emulators, previews — is fixed in one contiguous block starting at 2100, so it can run beside the developer's other projects.
status: draft
generated: { by: claude-code/claude-opus-5-5, at: 2026-11-05T04:10:30Z }
---

# Local ports live in the 2100 block

## Context

Local ports were scattered across tool defaults and one-off picks (the dev server, three emulators, two previews),
and several clashed with the developer's other projects: Expo on `8081`, another project's `vite preview` on `4173`.
On 2026-11-05 the developer asked for every local port to start at `2100`, numbered one by one, so this project's
local development runs independently of anything else on the machine.

## Decision

- Every local port is in one contiguous block starting at `2100`, the dev server first.
- The map lives in `DEV_PORTS` in `dev-ports.ts`, which the Vite config, the Playwright config and the app's
  emulator connection read. `firebase.json` repeats the emulator ports as literals, because the Firebase CLI reads
  plain JSON; `tests/unit/devPorts.spec.ts` fails when the two differ.
- Ports are fixed (`strictPort` where the tool has it): a taken port fails loudly instead of moving.
- A port added later, such as the functions or Pub/Sub emulator, takes the next free number in the block.

## Consequences

- Google sign-in against the real project from the dev server needs the dev server's origin and its
  `/__/auth/handler` on the OAuth web client ([redirect sign-in](google-sign-in-redirect.md)).
- Moving a port means changing `dev-ports.ts` (and `firebase.json` for an emulator); the test keeps them together.

## Sources

- [Local dev ports spec](../../docs/specs/2026-11-05-local-dev-ports.md)
- `dev-ports.ts`
- `firebase.json`
- `vite.config.ts`
- `playwright.config.ts`
- `src/services/firebase.ts`
- `tests/unit/devPorts.spec.ts`
