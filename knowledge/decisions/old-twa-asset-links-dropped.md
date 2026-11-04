---
type: Decision
title: The 2020 TWA's asset links are dropped
description: The site no longer vouches for the older Android app com.flashcards.twa; assetlinks.json names only in.spanion.flashcards.twa, so any copy of the old app still installed shows a browser bar.
generated: { by: claude-code/claude-opus-5-5, at: 2026-11-04T08:12:33Z }
verified: human:panditankit1995@gmail.com
---

# The 2020 TWA's asset links are dropped

## Context

`public/.well-known/assetlinks.json` was first committed in January 2020 for an earlier TWA, package
`com.flashcards.twa`, with two signing-certificate fingerprints, and production still served it. Its Play Store
page answered 404 on 2026-11-04. The new app is `in.spanion.flashcards.twa` ([package name](android-package-name.md)).

## Decision

`assetlinks.json` holds only the `in.spanion.flashcards.twa` statement. The old package's statement and fingerprints
are removed. The developer chose this on 2026-11-04, over keeping both statements.

## Consequences

- Any copy of `com.flashcards.twa` still installed loses verification and opens the site with a browser bar.
- The old statement is in git history (before the TWA work) if it is ever needed again.

## Sources

- `public/.well-known/assetlinks.json`
