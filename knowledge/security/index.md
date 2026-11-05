# Security

<!-- GA-GENERATED:index -->

- [Authentication](auth.md) - Firebase Auth (email/password and Google) holds the session; a router guard sends signed-out users to /login, and a watcher follows sign-in changes from other tabs.
- [Data protection](data-protection.md) - What personal data the app holds and where, and the protections around it — owner-only rules, hosting security headers, local env files out of git, and a pinned, audited CI.
- [Roles and access](roles.md) - There is one role, the signed-in owner; firestore.rules lets each user read and write only their own documents and checks the stored shape; the one public read is a shared set's copy, by its id.

<!-- GA-GENERATED:END -->
