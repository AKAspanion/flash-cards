---
type: Requirement
title: Limit the size of a set
description: A set must be capped at a size that always saves and stays fast, instead of failing at Firestore's document size limit.
generated: { by: claude-code/claude-opus-5-5, at: 2026-11-02T19:30:00Z }
verified: human:panditankit1995@gmail.com
---

# Limit the size of a set

## Requirement

Cap how much a set can hold, at a number that never makes the app fail. Today the only limit is Firestore's
per-document size: all of a set's cards live in one document as a JSON string, so a large enough set stops saving
([technical debt](../risks/debt.md)). Asked for by the developer on 2026-11-03.

## Acceptance

- The editor stops the user before they reach the limit and says why, in English and Hindi.
- A set at the limit saves and opens without failing, on a phone.
- The limits themselves (cards per set, and possibly characters per card side) are chosen when this is designed,
  with the reason for each number recorded beside it.
- If the limit is enforced in `firestore.rules` as well, it is deployed by hand
  ([manual deploys](../decisions/manual-rules-and-functions-deploy.md)).

## Sources

- `src/views/Add.vue`
- `src/services/cardSetMapper.ts`
- `firestore.rules`
