---
type: Decision
title: No analytics for now
description: The app collects no analytics; VUE_APP_MEASUREMENT_ID is passed to the Firebase config, but Analytics is never started.
generated: { by: claude-code/claude-opus-5-5, at: 2026-11-02T19:30:00Z }
verified: human:panditankit1995@gmail.com
---

# No analytics for now

## Context

`.env.example` and `getServices` in `src/services/firebase.ts` carry `VUE_APP_MEASUREMENT_ID`, but nothing
starts Firebase Analytics. No success metrics are tracked.

## Decision

No analytics for now. The developer decided this on 2026-11-03.

## Consequences

- Adding analytics later needs its own decision, along with the consent and privacy text that goes with it.
- `VUE_APP_MEASUREMENT_ID` stays in the config, unused.

## Sources

- `.env.example`
- `src/services/firebase.ts`
