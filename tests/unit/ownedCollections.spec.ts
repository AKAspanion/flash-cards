import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { OWNED_COLLECTIONS } from '@/services/ownedCollections';

// Collections in firestore.rules that a user does not own. Today there are none.
const NOT_USER_OWNED: string[] = [];

/** Every collection name that a `match /<collection>/{…}` in the rules text names. */
function rulesCollections(rules: string): string[] {
  return [...rules.matchAll(/match\s+\/([A-Za-z0-9_-]+)\/\{[^}]+\}(?!\/documents)/g)].map((m) => m[1]);
}

/** Names the rules mention that neither OWNED_COLLECTIONS nor the exception list covers. */
function uncovered(rules: string): string[] {
  const covered = new Set([...OWNED_COLLECTIONS.map((c) => c.name), ...NOT_USER_OWNED]);
  return rulesCollections(rules).filter((name) => !covered.has(name));
}

describe('OWNED_COLLECTIONS', () => {
  const rules = readFileSync('firestore.rules', 'utf8');

  it('covers every collection in firestore.rules', () => {
    expect(rulesCollections(rules).length).toBeGreaterThan(0);
    expect(uncovered(rules)).toEqual([]);
  });

  it('fails when the rules gain a collection it does not list', () => {
    expect(uncovered(`${rules}\nmatch /other/{id} { allow read: if false; }`)).toEqual(['other']);
  });

  it('lists the public shared sets, owned through ownerUid, so Delete account removes them', () => {
    expect(OWNED_COLLECTIONS).toContainEqual({ name: 'shared-sets', ownerField: 'ownerUid' });
  });

  it('removes the public copies and the stats before the sets, so a part-way failure leaves nothing public', () => {
    const order = OWNED_COLLECTIONS.map((c) => c.name);
    expect(order.indexOf('shared-sets')).toBe(0);
    expect(order.indexOf('user-stats')).toBeLessThan(order.indexOf('flash-card-sets'));
    expect(order.at(-1)).toBe('flash-card-sets');
  });

  it('names an owner field for each collection', () => {
    expect(OWNED_COLLECTIONS.length).toBeGreaterThan(0);
    for (const c of OWNED_COLLECTIONS) {
      expect(c.ownerField).toBeTruthy();
    }
  });
});
