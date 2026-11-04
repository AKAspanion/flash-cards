---
type: Log Entry
date: 2026-11-04
at: '2026-11-04T14:02:59.548+05:30'
kind: Fix
by: human:ankitp@geekyants.com
agent: claude-code
---
Fix: the Bubblewrap config used appVersionName (ignored) and left splashScreenFadeOutDuration and minSdkVersion at values that broke the Gradle build; now appVersion, 300 and 24. Updated apps/android, decisions/twa-built-with-bubblewrap, operations/android-release (test-build steps) and the spec.
