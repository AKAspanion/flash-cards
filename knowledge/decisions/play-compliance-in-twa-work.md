---
type: Decision
title: Account deletion and a privacy page ship with the TWA
description: Google Play rejects an app that lets people create accounts unless they can delete them in the app and from the web, and needs a privacy policy URL, so both are built as part of the TWA work; data export stays a separate feature.
generated: { by: claude-code/claude-opus-5-5, at: 2026-11-04T07:24:21Z }
verified: human:panditankit1995@gmail.com
---

# Account deletion and a privacy page ship with the TWA

## Context

Google Play's User Data policy asks every app that lets users create an account to let them delete it from inside
the app and to request deletion through a web link, and every app that handles personal data to give a privacy
policy URL in its listing and in the app. Flashcards creates accounts (email and password, or Google) and stores each
user's email, name and sets ([data protection](../security/data-protection.md)). The
[account deletion and export](../requirements/account-deletion-and-export.md) requirement was not built, and the app
had no privacy policy, so the listing would be rejected.

## Decision

The TWA work also builds account deletion (from the requirement, without export) and a public privacy policy page.
Data export stays a separate feature. The developer chose this on 2026-11-04, over packaging the TWA alone and
building these separately before submission.

## Consequences

- The TWA isn't submitted for review until both are live on the production domain.
- Export is still required by [account deletion and export](../requirements/account-deletion-and-export.md); Play
  doesn't ask for it.

## Sources

- [requirements/account-deletion-and-export](../requirements/account-deletion-and-export.md)
- [requirements/android-twa](../requirements/android-twa.md)
