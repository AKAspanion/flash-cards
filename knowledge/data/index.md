# Data

<!-- GA-GENERATED:index -->

- [flash-card-sets collection](flash-card-sets.md) - Fields of a stored flashcard set, the defaults the mapper applies when reading, and the shape the security rules require.
- [labels collection](labels.md) - A user's labels — a name and an owner uid — referenced from sets by document id.
- [Data model](model.md) - Four Firestore collections (flash-card-sets, labels, user-stats, shared-sets), each document owned by one user; cards are embedded in their set as a JSON string.
- [shared-sets collection](shared-sets.md) - The public copy of a set that its owner shares, opened by anyone at /s/:shareId; exactly five fields, so no progress, labels or profile data leave the account.
- [user-stats collection](user-stats.md) - One document per user, with its id equal to the uid, holding the daily goal and a map of local date to cards reviewed that day.

<!-- GA-GENERATED:END -->
