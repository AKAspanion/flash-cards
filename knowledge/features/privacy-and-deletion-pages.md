---
type: Feature
title: Privacy policy, terms and delete-account pages
description: Three public pages, /privacy, /terms and /delete-account, that anyone can open without signing in; Google Play's listing points at the privacy and deletion pages.
generated: { by: claude-code/claude-sonnet-5-5, at: 2026-11-04T12:00:00Z }
verified: human:panditankit1995@gmail.com
---

# Privacy policy, terms and delete-account pages

## What it does

`/privacy` (`src/views/Privacy.vue`) is the privacy policy, `/terms` (`src/views/Terms.vue`) the terms of service,
and `/delete-account` (`src/views/Deletion.vue`) explains how to delete an account, including by email for people who
can no longer sign in. All three are routes with `meta.public`, so the router guard lets everyone in
([auth](../security/auth.md)), and all three are info-style cards of icon rows. The login screen links to the privacy
policy and the terms, and its sign-up mode says signing up agrees to both ([sign-in](sign-in.md)); the info screen
links to all three; the privacy policy links to the terms, and the terms' Your sets row links to the privacy policy.
Google Play's listing points at the privacy and deletion pages
([Play compliance](../decisions/play-compliance-in-twa-work.md)).

## Rules

- Who to contact is `CONTACT_EMAIL` in `src/utils/contact.ts` ([privacy contact](../decisions/privacy-contact.md)).
- Emailed deletions are done by hand within 30 days ([decision](../decisions/deletion-is-permanent.md)); signed-in
  users delete themselves with [Delete account](account-deletion.md).
- The policy has an Ads section (`privacy.ads` in `src/locales`) saying Google shows ads, that third-party vendors use
  cookies to serve ads based on prior visits, that each ad request sends the IP address and browser and device data,
  and linking Google Ad Settings, aboutads.info and Google's partner-sites page; How it is used lists showing ads. It
  no longer says the app shows no ads ([decision](../decisions/adsense-banner-ads.md)). The policy is dated
  6 November 2026.
- `/delete-account` tells signed-in users to type `DELETE` and confirm with their password or Google
  (`deletion.app.body`), matching [Delete account](account-deletion.md).
- What the terms say is [the terms decision](../decisions/terms-of-service-content.md); its copy is the `terms` block
  in `src/locales`, dated 17 November 2026, with the same contact as the policy.
- The pages are translated like the rest of the app (`src/locales`).

## History

- 2026-11-18: two public pages, and login linked only the privacy policy; now `/terms` is a third, linked from login, sign-up, Info and the privacy policy, because the app needed terms of service. See [what the terms say](../decisions/terms-of-service-content.md).
- 2026-11-06: the Ads section named only Google's settings and partners; now it covers vendors' cookies, ads from prior visits, IP and device data, and the opt-out links, and the delete steps mention the typed `DELETE`, because of the bug batch.
- 2026-11-04: the policy said the app shows no ads; now it has an Ads section about Google AdSense, because the app shows a banner. See [one AdSense banner](../decisions/adsense-banner-ads.md).
- 2026-11-04: plain text pages; now info-style cards of icon rows, and login no longer links the deletion page, because the pages looked unlike the rest of the app.

## Sources

- `src/views/Privacy.vue`
- `src/views/Terms.vue`
- `src/views/Deletion.vue`
- `src/utils/contact.ts`
- `src/router/index.ts`
- `src/views/Login.vue`
- `src/views/Info.vue`
- `tests/e2e/public-pages.spec.ts`
- `tests/unit/terms.spec.ts`
- `src/locales/en.json`
