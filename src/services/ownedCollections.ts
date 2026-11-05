/** A Firestore collection whose documents belong to one user, and the field that names the owner. */
export interface OwnedCollection {
  name: string;
  ownerField: string;
}

// Account deletion removes every document these hold for the user, in this order. No Firebase
// imports, so a unit test can read it; tests/unit/ownedCollections.spec.ts keeps it in step with
// firestore.rules. The public copies go first and the sets last: a deletion that fails part-way
// leaves no public copy readable with no set left to stop sharing it, and a retry removes the rest.
export const OWNED_COLLECTIONS: readonly OwnedCollection[] = [
  // Public copies of shared sets: anyone may read one, but they belong to the user who shared them.
  { name: 'shared-sets', ownerField: 'ownerUid' },
  { name: 'user-stats', ownerField: 'uid' },
  { name: 'labels', ownerField: 'uid' },
  { name: 'flash-card-sets', ownerField: 'uid' },
];
