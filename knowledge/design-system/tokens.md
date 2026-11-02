---
type: Design Tokens
title: Design tokens
description: Brand colours and light/dark surfaces are defined once in the Vuetify theme; set colours are darkened by TEXT_SAFE_FACTOR so white text on them meets WCAG AA.
status: draft
generated: { by: claude-code/claude-opus-5-5, at: 2026-11-02T19:12:23Z }
---

# Design tokens

## Colours

- The brand palette (`primary`, `secondary`, `accent` and the status colours) and the light and dark surfaces are
  the `brand` object and `themes` in `src/plugins/vuetify.ts`. Use theme colour names, not hex values, in
  components.
- The default theme is `light`; the user's dark setting switches it in `App.vue`, rather than following the system
  (comment in `src/plugins/vuetify.ts`).
- Set colours come from the palette in `src/components/ColorPalette.vue`. Where white text sits on a set colour, it
  is darkened with `shade()` by `TEXT_SAFE_FACTOR = 0.82`, the smallest factor that clears AA for every palette
  colour (`src/utils/color.ts`). Tested in `tests/unit/color.spec.ts`.
- The PWA's theme and background colours are in the manifest in `vite.config.ts`.

## Spacing and radius

Vuetify's defaults; app-wide overrides are in `src/assets/style.css`.

## Typography

Vuetify's defaults, with Material Design Icons (`@mdi/font`) imported in `src/plugins/vuetify.ts`.

## Sources

- `src/plugins/vuetify.ts`
- `src/utils/color.ts`
- `src/components/ColorPalette.vue`
- `src/App.vue`
- `src/assets/style.css`
- `vite.config.ts`
- `tests/unit/color.spec.ts`
