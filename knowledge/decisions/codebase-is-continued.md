---
type: Decision
title: This repository's code is continued, not rewritten
description: The flash-cards code at the repository root is the project's own live codebase, adopted into ga on 2026-11-03; work builds on it in place rather than replacing or migrating it.
generated: { by: claude-code/claude-opus-5-5, at: 2026-11-02T19:10:12Z }
verified: human:panditankit1995@gmail.com
---

# This repository's code is continued, not rewritten

## Context

ga was set up in this repository on 2026-11-03 (`origin: adopted` in `.ga/project.json`), when the developer asked
to build the knowledge base for this codebase. The code was not handed over from a client: it is the project's own
code, already deployed and under active development through pull requests on `master`. ga asks of any adopted code
whether it is for reference, to continue, or to migrate.

## Decision

Continue it. The Vue SPA in `src/`, the Firebase configuration (`firebase.json`, `firestore.rules`) and the Cloud
Functions in `functions/` are built on where they are, keeping their existing structure and conventions.

## Consequences

- The knowledge base describes the code as it is, drafted by `ga:learn-codebase`, and is kept current as the code
  changes.
- ga's `build`, `update` and `plan` generators refuse to run here, since the project is adopted; modules are added
  with `/ga:add-module` and features follow the normal discover → spec → plan flow.

## Sources

- `.ga/project.json`
- `package.json`
- `firebase.json`
- `firestore.rules`
