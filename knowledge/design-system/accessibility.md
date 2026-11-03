---
type: Convention
title: Accessibility
description: Screens must pass axe WCAG 2.1 AA scans on desktop and mobile, text on set colours must meet AA contrast, and the OS reduce-motion setting is respected.
generated: { by: claude-code/claude-opus-5-5, at: 2026-11-02T19:12:23Z }
verified: human:panditankit1995@gmail.com
---

# Accessibility

## Rules

- Every screen (the editor through `/add`) passes an axe scan with the `wcag2a`, `wcag2aa`, `wcag21a` and `wcag21aa` tags, on the desktop and
  mobile Playwright projects (`tests/e2e/a11y.spec.ts`). A new screen gets added to that test.
- White text on a set colour uses `shade()` so it meets 4.5:1 ([tokens](tokens.md)).
- Icon-only buttons carry an `aria-label` from i18n (for example the learned toggle in `CardFlash.vue`).
- With `prefers-reduced-motion: reduce`, animations and transitions are cut to near zero (`src/assets/style.css`);
  the e2e suite runs with reduced motion (`playwright.config.ts`).
- `<html lang>` follows the chosen language (`App.vue`).

## Sources

- `tests/e2e/a11y.spec.ts`
- `src/utils/color.ts`
- `src/components/CardFlash.vue`
- `src/assets/style.css`
- `playwright.config.ts`
- `src/App.vue`
