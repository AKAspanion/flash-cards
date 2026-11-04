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
so the router guard lets everyone in ([auth](../security/auth.md)). Both are info-style cards of icon rows. The login screen links only to the privacy policy; the info screen links to both,
and Google Play's listing points at them ([Play compliance](../decisions/play-compliance-in-twa-work.md)).

## Rules

- Who to contact is `CONTACT_EMAIL` in `src/utils/contact.ts` ([privacy contact](../decisions/privacy-contact.md)).
- Emailed deletions are done by hand within 30 days ([decision](../decisions/deletion-is-permanent.md)); signed-in
  users delete themselves with [Delete account](account-deletion.md).
- The policy has an Ads section (`privacy.ads` in `src/locales`) saying Google shows ads and linking Google's ad settings
  and partners; it no longer says the app shows no ads ([decision](../decisions/adsense-banner-ads.md)).
- The pages are translated like the rest of the app (`src/locales`).

## History

- 2026-11-04: the policy said the app shows no ads; now it has an Ads section about Google AdSense, because the app shows a banner. See [one AdSense banner](../decisions/adsense-banner-ads.md).
- 2026-11-04: plain text pages; now info-style cards of icon rows, and login no longer links the deletion page, because the pages looked unlike the rest of the app.

## Sources

- `src/views/Privacy.vue`
- `src/views/Deletion.vue`
- `src/utils/contact.ts`
- `src/router/index.ts`
- `src/views/Login.vue`
- `src/views/Info.vue`
- `tests/e2e/public-pages.spec.ts`
