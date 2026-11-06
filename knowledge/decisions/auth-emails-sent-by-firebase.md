---
type: Decision
title: Auth emails are sent by Firebase, not by our own backend
description: Verification and password-reset emails stay with Firebase's built-in sender; sending them from a Cloud Function through an email provider, to put the links on flashcards.spanion.in, was declined as too much overhead.
generated: { by: claude-code/claude-opus-5-5, at: 2026-11-06T05:55:00Z }
---

# Auth emails are sent by Firebase, not by our own backend

## Context

Firebase refuses this project's email template updates, so the action URL can't be moved from
`spanion-flash-cards.firebaseapp.com` to `flashcards.spanion.in` ([the open question](../questions/email-action-url-refused.md)).
The way around it is to send the emails ourselves: a Cloud Function makes the action link with the Admin SDK,
rebuilds it on `https://flashcards.spanion.in/__/auth/action`, and sends it through an email provider.

## Decision

Keep Firebase's built-in sending for verification and password-reset emails. The developer declined the backend
route on 2026-11-06 as more work and overhead than the link's domain is worth.

## Consequences

- The links in auth emails open on `spanion-flash-cards.firebaseapp.com` until Firebase allows the action URL to
  change; the sender is already `noreply@flashcards.spanion.in`.
- No email provider account, API key, DNS records for a provider, or rate limits of our own to keep.
- Sending keeps working on the free plan: a function-based sender would have stopped whenever the
  [budget kill switch](budget-kill-switch.md) unlinks billing.

## Sources

- `src/services/firebase.ts`
