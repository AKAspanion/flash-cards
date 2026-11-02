---
type: Component Inventory
title: Components
description: The app's own Vue components in src/components, what each is for, and which screens use them.
status: draft
generated: { by: claude-code/claude-opus-5-5, at: 2026-11-02T19:12:23Z }
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
- `CardFlash`: one two-sided card that flips; edits its text in the editor, or toggles learned in browse mode.
- `GroupCardFlash`: the scroll-snapping row of `CardFlash` cards, with `scrollToCard` exposed; turns mouse-wheel
  movement into one card step on desktop.
- `OptionPanel`: a draggable bottom panel for options, with `toggle` exposed; closes on an outside tap.
- `ColorPalette`: the set colour picker (`v-model`).
- `ContainerEmpty`: the empty-state block (icon, title, subtitle).

## Sources

- `src/components/BarTop.vue`
- `src/components/BarNav.vue`
- `src/components/BtnAction.vue`
- `src/components/CardFlashSet.vue`
- `src/components/ShimmerCardFlashSet.vue`
- `src/components/CardFlash.vue`
- `src/components/GroupCardFlash.vue`
- `src/components/OptionPanel.vue`
- `src/components/ColorPalette.vue`
- `src/components/ContainerEmpty.vue`
- `src/App.vue`
