---
type: Finding
title: The DELETE word is spelled out in the locale strings as well as in the code
description: CONFIRM_WORD in DialogDeleteAccount.vue is the checked word, but the en and hi strings account.delete.type and typeHint repeat it, so changing one without the others would tell users to type a word that is refused.
generated: { by: agent:after-finish/claude-sonnet-5-5, at: 2026-11-06T12:00:00Z }
---

# The DELETE word is spelled out in the locale strings as well as in the code

## Finding

The dialog accepts only `CONFIRM_WORD` (`DELETE`), but `account.delete.type` and `account.delete.typeHint` in the en and
hi locales write the word out again. Changing the constant alone makes the prompt ask for a word the dialog refuses.
Nothing wrong today; it is a drift risk for the next change.

## Evidence

- Final review of `2026-11-06-bug-batch`, ledger line: `Final review: minor (deferred): CONFIRM_WORD is also spelled
  out in account.delete.type/typeHint strings in en and hi`. Its subject is `src/components/DialogDeleteAccount.vue`
  (`CONFIRM_WORD`) and the locale files.

## Status

Open. One way: pass `CONFIRM_WORD` into the strings as a parameter.

## Sources

- `src/components/DialogDeleteAccount.vue`
- `src/locales/en.json`
- `src/locales/hi.json`
