---
type: Decision
title: The app displays standalone, not fullscreen
description: The web manifest's display mode is standalone, so the web app and the Android TWA both keep the status bar and avoid immersive mode's keyboard problems.
status: draft
generated: { by: claude-code/claude-opus-5-5, at: 2026-11-04T07:33:32Z }
---

# The app displays standalone, not fullscreen

## Context

The manifest built by `VitePWA` in `vite.config.ts` had `display: 'fullscreen'`. In a TWA that means immersive
mode on every screen: no status bar, and an on-screen keyboard that is known to cover inputs.

## Decision

`display` is `standalone`, for the installed web app and for the Android app alike, so the two behave the same.
The developer chose this on 2026-11-04.

## Consequences

- Installed copies of the web app show the system status bar.
- The Bubblewrap config takes its display mode from the manifest.

## Sources

- `vite.config.ts`
