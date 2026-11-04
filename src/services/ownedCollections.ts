/** A Firestore collection whose documents belong to one user, and the field that names the owner. */
export interface OwnedCollection {
  name: string;
  ownerField: string;
}

// Account deletion removes every document these hold for the user. No Firebase imports, so a unit
// test can read it; tests/unit/ownedCollections.spec.ts keeps it in step with firestore.rules.
export const OWNED_COLLECTIONS: readonly OwnedCollection[] = [
  { name: 'flash-card-sets', ownerField: 'uid' },
  { name: 'labels', ownerField: 'uid' },
];
