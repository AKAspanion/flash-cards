---
type: Decision
title: What the terms of service say
description: The public terms page puts the app under Indian law, leaves users owning their sets, lets anyone with a share link view and copy a shared set, bans unlawful, abusive or infringing content, lets the maker remove content or close accounts, and is agreed to by a line under sign-up, with no checkbox.
generated: { by: claude-code/claude-opus-5-5, at: 2026-11-17T13:11:08Z }
verified: human:ankitp@geekyants.com
stated: 'Terms: 1) laws of India, no city; 2) people own their sets, a share link lets anyone view and copy until unshared, they must have rights to card content, nothing unlawful, abusive or infringing; 3) you may remove shared content or close accounts that break the terms, free and as is, liability limited as far as law allows, changes update the date; 4) a line under sign-up saying signing up means agreeing to the Terms and Privacy policy, both linked, no checkbox. Go with the recommended answers? — Yes, as recommended'
stated_via: chat
---

# What the terms of service say

## Context

The app had a public [privacy policy](../features/privacy-and-deletion-pages.md) but no terms of service. Terms are
legal text, so what they promise is the developer's call, not the code's. Who makes the app and how to reach them is
already the [privacy contact](privacy-contact.md); who it is for is [13 and over](audience-13-and-over.md); that it
shows ads is [one AdSense banner](adsense-banner-ads.md); that deletion is final is
[deletion is permanent](deletion-is-permanent.md); public links are [sharing](../features/sharing.md). The terms point
at those rather than deciding them again.

## Decision

Decided by the developer on 2026-11-17:

- **Governing law:** the laws of India. No city's courts are named.
- **Ownership:** people own the sets they make.
- **Sharing:** sharing a set lets anyone with its link view it and add a copy to their own library, until the owner
  stops sharing.
- **Acceptable use:** people must have the right to whatever they put on a card, and nothing unlawful, abusive or
  infringing is allowed.
- **Enforcement:** the maker may remove shared content or close an account that breaks the terms.
- **No warranty:** the app is free and provided "as is", without warranty, and liability is limited as far as the law
  allows.
- **Changes:** the terms may change; the date at the top changes with them, as the privacy policy's does.
- **Agreement:** a line under the sign-up button says signing up means agreeing to the Terms and the Privacy policy,
  both linked. There is no checkbox, so sign-up stays one step.

## Consequences

- The terms page is public, like the privacy policy, and is linked from login, Info and the privacy policy.
- Changing who makes the app, the audience, the ads or deletion means checking the terms' wording too.

## Sources

- `src/views/Privacy.vue`
- `src/utils/contact.ts`
