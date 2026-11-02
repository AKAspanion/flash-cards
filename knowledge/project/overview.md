---
type: Project Overview
title: Flashcards
description: A learning and memorisation PWA where signed-in users build flashcard sets, study them and track which cards they have learned.
status: draft
generated: { by: claude-code/claude-opus-5-5, at: 2026-11-02T19:12:23Z }
---

# Flashcards

## Purpose

Flashcards is a progressive web app for learning and memorising. A person signs in (email and password, or Google),
builds sets of two-sided cards, studies a set card by card, and marks cards learned. Sets can be coloured, labelled,
favourited, searched and sorted, and moved to a bin before being deleted. The interface is in English and Hindi.
Each person sees only their own data. It is live at `https://flashcards.spanion.in`, as the README says.

## Applications

- [flash-cards](../apps/flash-cards.md): the Vue 3 + Vuetify single-page app at the repository root, served by
  Firebase Hosting and talking straight to Firebase Auth and Firestore. There is no API server of its own.
- [functions](../apps/functions.md): one Cloud Function, `billingKillSwitch`, that turns billing off for the
  Firebase project when the monthly budget is spent. See [budget kill switch](../decisions/budget-kill-switch.md).

How they fit together is in [architecture](architecture.md); how code is written here is in
[conventions](conventions.md).

## Open

- [Label deletion](../questions/label-deletion.md): the rules allow deleting a label, but no screen offers it.
- Nine usability features are specified and planned in `docs/specs/2026-11-02-usability-features.md` and
  `docs/plans/`, approved and not yet learned into this knowledge base.

## Sources

- `README.md`
- `package.json`
- `src/router/index.ts`
- `functions/src/index.ts`
- `docs/specs/2026-11-02-usability-features.md`
