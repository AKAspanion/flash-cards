---
type: Decision
title: Deleted data is gone at once, and emailed requests are done within 30 days
description: The Firebase project keeps no Firestore backups or point-in-time recovery, so a deleted account's data is gone immediately; people who can't sign in can email for deletion, done by hand within 30 days.
generated: { by: claude-code/claude-opus-5-5, at: 2026-11-04T07:43:18Z }
verified: human:panditankit1995@gmail.com
---

# Deleted data is gone at once, and emailed requests are done within 30 days

## Context

Google Play's deletion rules ask the privacy policy and the account-deletion page to say what is deleted, what (if
anything) is kept, and how long a request takes. Some people can no longer sign in to delete their account
themselves.

## Decision

- The Firebase project has no Firestore backups and no point-in-time recovery, as the developer confirmed on
  2026-11-04. So the policy says deletion is immediate and permanent.
- Anyone who can't sign in can email the [privacy contact](privacy-contact.md) from the address on their account.
  The account and its data are deleted by hand within `30 days`, with a reply to confirm. The developer chose 30
  days on 2026-11-04.

## Consequences

- Turning on backups or point-in-time recovery later means updating the privacy policy and the Play Data safety form
  to say how long copies are kept.
