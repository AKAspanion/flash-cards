---
type: Feature
title: Privacy policy and delete-account pages
description: Two public pages, /privacy and /delete-account, that Google Play's listing points at; anyone can open them without signing in.
status: draft
generated: { by: claude-code/claude-sonnet-5-5, at: 2026-11-04T12:00:00Z }
---

# Privacy policy and delete-account pages

## What it does

`/privacy` (`src/views/Privacy.vue`) is the privacy policy and `/delete-account` (`src/views/Deletion.vue`) explains
how to delete an account, including by email for people who can no longer sign in. Both are routes with `meta.public`,
so the router guard lets everyone in ([auth](../security/auth.md)). They are linked from the login and info screens,
and Google Play's listing points at them ([Play compliance](../decisions/play-compliance-in-twa-work.md)).

## Rules

- Who to contact is `CONTACT_EMAIL` in `src/utils/contact.ts` ([privacy contact](../decisions/privacy-contact.md)).
- Emailed deletions are done by hand within 30 days ([decision](../decisions/deletion-is-permanent.md)); signed-in
  users delete themselves with [Delete account](account-deletion.md).
- The pages are translated like the rest of the app (`src/locales`).

## Sources

- `src/views/Privacy.vue`
- `src/views/Deletion.vue`
- `src/utils/contact.ts`
- `src/router/index.ts`
- `src/views/Login.vue`
- `src/views/Info.vue`
- `tests/e2e/public-pages.spec.ts`
