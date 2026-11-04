---
type: Decision
title: The app is for people aged 13 and over
description: The Play listing declares a target audience of 13 and over, and the privacy policy says the app isn't directed at children under 13, which keeps the app outside Google Play's Families policy.
status: draft
generated: { by: claude-code/claude-opus-5-5, at: 2026-11-04T07:33:32Z }
---

# The app is for people aged 13 and over

## Context

Google Play asks every app for its target age groups. Including children under 13 brings in the Families policy: a
stricter review of privacy and data handling, and only Families-approved SDKs. Who the app is for is in
[personas](../requirements/personas.md).

## Decision

The target audience is 13 and over. The developer chose this on 2026-11-04.

## Consequences

- The Play Console target audience is set to 13 and over.
- The privacy policy says the app isn't directed at children under 13.

## Sources

- [requirements/personas](../requirements/personas.md)
