---
type: Component Inventory
title: Components
description: The app's own Vue components in src/components, what each is for, and which screens use them.
generated: { by: claude-code/claude-opus-5-5, at: 2026-11-02T19:12:23Z }
verified: human:panditankit1995@gmail.com
---

# Components

## Components

All in `src/components/`, built on Vuetify components:

- `BarTop`: the top bar, with left and right button slots (`click:left`, `click:right`). Used on every screen.
- `BarNav`: the bottom navigation, mounted once in `App.vue`.
- `BtnAction`: an action button used in the editor and on the profile screen.
- `CardFlashSet`: one set in the library or bin — colour, labels, learned progress, actions, and swipe right to
  favourite or left to bin on touch.
- `ShimmerCardFlashSet`: the loading placeholder for `CardFlashSet`.
- `CardFlash`: one two-sided card that flips; edits its text in the editor, or toggles learned in browse mode. A `reverse` prop starts it on its back face, and `flip()`, `edit(side)` and `rate(rating)` are exposed; a `rating` prop shows the Again, Hard, Good and Easy buttons once the card has been flipped, and a press emits `rate`; its text dialog has "Next: back side" and "Save and add next", and emits `add-after`.
- `GroupCardFlash`: the scroll-snapping row of `CardFlash` cards, with `scrollToCard` exposed, plus `next`, `prev`, `goTo`, `flipFocused` and `rateFocused` for the review screen's shortcuts (the focused index moves at once, not on scroll); inserts the next card on `add-after`; takes `rating`, emits `rate` with the card and rating, and keys each slide uniquely per occurrence, since a card can be queued twice; turns mouse-wheel
  movement into one card step on desktop.
- `OptionPanel`: a draggable bottom panel for options, with `toggle` exposed; closes on an outside tap. It stops below
  the top bar and its body scrolls when the content doesn't fit, so a long list of options can't cover the top bar's
  Options button.
- `BannerVerifyEmail`: the verify-email reminder shown on Profile and Home only, mounted once in `App.vue`
  ([email verification](../features/email-verification.md)). Its buttons are uncoloured on purpose: brand-pink text
  on the surface misses AA contrast, so only its icon takes the brand colour.
- `DialogShare`: the editor's Share set dialog, showing the public link to copy and a Stop sharing action
  ([sharing](../features/sharing.md)).
- `CardFlash` shows card text through `renderCardText` (Markdown), its text dialog has Insert image, and a read aloud
  button speaks the visible side ([rich cards](../features/rich-cards.md)).
- `ColorPalette`: the set colour picker (`v-model`).
- `ContainerEmpty`: the empty-state block (icon, title, subtitle).

## History

- 2026-11-05: no verify-email reminder existed; now `BannerVerifyEmail` is mounted in `App.vue`, because of the email-verification plan.
- 2026-11-05: OptionPanel had a fixed height and no sharing dialog existed; now its body scrolls and `DialogShare` exists, and CardFlash renders Markdown with Insert image and read aloud, because of the sharing and rich-cards plans.
- 2026-11-05: CardFlash flipping un-learned a learned card and had no rating; now it has a `rating` prop, a `rate` emit and `rate()`, and GroupCardFlash has `rating`, `rate`, `rateFocused()` and a unique list key per occurrence (an Again card is queued twice), for [spaced repetition](../features/spaced-repetition.md).
- 2026-11-05: CardFlash and GroupCardFlash were driven only by touch and scroll; now CardFlash takes `reverse` and exposes `flip()`, and GroupCardFlash exposes `next`, `prev`, `goTo`, `flipFocused`, because study-mode shortcuts need them.

- 2026-11-05: CardFlash emitted nothing for adding a card; now it emits `add-after` and exposes `edit(side)`, and GroupCardFlash inserts the next card, for quicker card entry. See [the editor](../features/edit-set.md).

## Sources

- `src/components/BarTop.vue`
- `src/components/BarNav.vue`
- `src/components/BannerVerifyEmail.vue`
- `src/components/BtnAction.vue`
- `src/components/CardFlashSet.vue`
- `src/components/ShimmerCardFlashSet.vue`
- `src/components/CardFlash.vue`
- `src/components/GroupCardFlash.vue`
- `src/components/OptionPanel.vue`
- `src/components/DialogShare.vue`
- `src/components/ColorPalette.vue`
- `src/components/ContainerEmpty.vue`
- `src/App.vue`
