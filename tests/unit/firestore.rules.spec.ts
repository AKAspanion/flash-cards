// @vitest-environment node
// Runs only against the Firestore emulator: `npm run test:rules`.
import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import {
  addDoc,
  collection,
  deleteDoc,
  deleteField,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';

const emulator = process.env.FIRESTORE_EMULATOR_HOST;

describe.skipIf(!emulator)('firestore.rules', () => {
  let env: RulesTestEnvironment;

  beforeAll(async () => {
    const [host, port] = (emulator ?? '').split(':');
    env = await initializeTestEnvironment({
      projectId: 'demo-flash-cards',
      firestore: { rules: readFileSync('firestore.rules', 'utf8'), host, port: Number(port) },
    });
  });
  afterAll(() => env?.cleanup());
  beforeEach(async () => {
    await env.clearFirestore();
    await env.withSecurityRulesDisabled(async (ctx) => {
      const db = ctx.firestore();
      await setDoc(doc(db, 'flash-card-sets/alice-set'), { uid: 'alice', title: 'A', cards: '[]', labels: [] });
      await setDoc(doc(db, 'labels/alice-label'), { uid: 'alice', label: 'L' });
    });
  });

  const alice = () => env.authenticatedContext('alice').firestore();
  const bob = () => env.authenticatedContext('bob').firestore();
  const anon = () => env.unauthenticatedContext().firestore();

  it('owners can read, list, update and delete their own sets', async () => {
    await assertSucceeds(getDoc(doc(alice(), 'flash-card-sets/alice-set')));
    await assertSucceeds(getDocs(query(collection(alice(), 'flash-card-sets'), where('uid', '==', 'alice'))));
    await assertSucceeds(updateDoc(doc(alice(), 'flash-card-sets/alice-set'), { title: 'B', uid: 'alice' }));
    await assertSucceeds(deleteDoc(doc(alice(), 'flash-card-sets/alice-set')));
  });

  it('owners can create and update a set that has a speech field', async () => {
    await assertSucceeds(addDoc(collection(alice(), 'flash-card-sets'), { uid: 'alice', cards: '[]', labels: [], speech: { front: 'es-ES' } }));
    await assertSucceeds(updateDoc(doc(alice(), 'flash-card-sets/alice-set'), { speech: { front: 'es-ES' }, uid: 'alice' }));
  });

  it('other users and signed-out visitors cannot touch them', async () => {
    await assertFails(getDoc(doc(bob(), 'flash-card-sets/alice-set')));
    await assertFails(getDocs(collection(bob(), 'flash-card-sets')));
    await assertFails(getDocs(query(collection(bob(), 'flash-card-sets'), where('uid', '==', 'alice'))));
    await assertFails(updateDoc(doc(bob(), 'flash-card-sets/alice-set'), { title: 'hacked' }));
    await assertFails(deleteDoc(doc(bob(), 'flash-card-sets/alice-set')));
    await assertFails(getDoc(doc(anon(), 'flash-card-sets/alice-set')));
  });

  it('a set can only be created for yourself, with the expected shape', async () => {
    await assertSucceeds(addDoc(collection(alice(), 'flash-card-sets'), { uid: 'alice', cards: '[]', labels: [] }));
    await assertFails(addDoc(collection(alice(), 'flash-card-sets'), { uid: 'bob', cards: '[]', labels: [] }));
    await assertFails(addDoc(collection(alice(), 'flash-card-sets'), { uid: 'alice', cards: [], labels: [] }));
    await assertFails(addDoc(collection(anon(), 'flash-card-sets'), { uid: 'alice', cards: '[]', labels: [] }));
  });

  it('ownership cannot be transferred on update', async () => {
    await assertFails(updateDoc(doc(alice(), 'flash-card-sets/alice-set'), { uid: 'bob' }));
  });

  it('updates must keep the stored shape and the set id', async () => {
    await env.withSecurityRulesDisabled((ctx) =>
      setDoc(doc(ctx.firestore(), 'flash-card-sets/with-id'), { uid: 'alice', id: '_x', cards: '[]', labels: [] }),
    );
    await assertSucceeds(updateDoc(doc(alice(), 'flash-card-sets/with-id'), { title: 'ok' }));
    await assertFails(updateDoc(doc(alice(), 'flash-card-sets/with-id'), { cards: [] }));
    await assertFails(updateDoc(doc(alice(), 'flash-card-sets/with-id'), { labels: 'x' }));
    await assertFails(updateDoc(doc(alice(), 'flash-card-sets/with-id'), { id: '_other' }));
    await assertFails(updateDoc(doc(alice(), 'labels/alice-label'), { label: 42 }));
  });

  it('labels follow the same ownership rules', async () => {
    await assertSucceeds(getDocs(query(collection(alice(), 'labels'), where('uid', '==', 'alice'))));
    await assertSucceeds(addDoc(collection(alice(), 'labels'), { uid: 'alice', label: 'New' }));
    await assertSucceeds(updateDoc(doc(alice(), 'labels/alice-label'), { uid: 'alice', label: 'Renamed' }));
    await assertFails(getDoc(doc(bob(), 'labels/alice-label')));
    await assertFails(updateDoc(doc(bob(), 'labels/alice-label'), { uid: 'bob', label: 'Mine' }));
    await assertFails(addDoc(collection(bob(), 'labels'), { uid: 'alice', label: 'Spoof' }));
  });

  describe('user-stats', () => {
    const seedAlice = () =>
      env.withSecurityRulesDisabled((ctx) =>
        setDoc(doc(ctx.firestore(), 'user-stats/alice'), { uid: 'alice', days: { '2026-11-02': 3 } }),
      );

    it('the owner can create, read, update and delete their document', async () => {
      await assertSucceeds(setDoc(doc(alice(), 'user-stats/alice'), { uid: 'alice', days: { '2026-11-02': 3 } }));
      await assertSucceeds(getDoc(doc(alice(), 'user-stats/alice')));
      await assertSucceeds(updateDoc(doc(alice(), 'user-stats/alice'), { goal: 50 }));
      await assertSucceeds(deleteDoc(doc(alice(), 'user-stats/alice')));
    });

    it('merged writes the app makes pass: a first write, an increment and a goal change', async () => {
      await assertSucceeds(setDoc(doc(alice(), 'user-stats/alice'), { uid: 'alice', days: { '2026-11-02': 1 } }, { merge: true }));
      await assertSucceeds(setDoc(doc(alice(), 'user-stats/alice'), { uid: 'alice', goal: 100 }, { merge: true }));
      await assertSucceeds(setDoc(doc(alice(), 'user-stats/alice'), { uid: 'alice', goal: 10 }, { merge: true }));
    });

    it('a first write that only sets the goal passes on a new document', async () => {
      await assertSucceeds(setDoc(doc(alice(), 'user-stats/alice'), { uid: 'alice', goal: 50 }, { merge: true }));
    });

    it('other users and signed-out visitors cannot read, change or delete it', async () => {
      await seedAlice();
      await assertFails(getDoc(doc(bob(), 'user-stats/alice')));
      await assertFails(updateDoc(doc(bob(), 'user-stats/alice'), { goal: 50 }));
      await assertFails(deleteDoc(doc(bob(), 'user-stats/alice')));
      await assertFails(getDoc(doc(anon(), 'user-stats/alice')));
    });

    it('the document id and the uid field must both be the signed-in uid', async () => {
      await assertFails(setDoc(doc(bob(), 'user-stats/alice'), { uid: 'bob', days: {} }));
      await assertFails(setDoc(doc(bob(), 'user-stats/alice'), { uid: 'alice', days: {} }));
      await assertFails(setDoc(doc(bob(), 'user-stats/bob'), { uid: 'alice', days: {} }));
      await assertSucceeds(setDoc(doc(bob(), 'user-stats/bob'), { uid: 'bob', days: {} }));
    });

    it('rejects a bad goal, a bad days value and an extra field', async () => {
      await assertFails(setDoc(doc(alice(), 'user-stats/alice'), { uid: 'alice', days: {}, goal: 25 }));
      await assertFails(setDoc(doc(alice(), 'user-stats/alice'), { uid: 'alice', days: {}, goal: '20' }));
      await assertFails(setDoc(doc(alice(), 'user-stats/alice'), { uid: 'alice', days: 'x' }));
      await assertFails(setDoc(doc(alice(), 'user-stats/alice'), { uid: 'alice', days: {}, admin: true }));
      await seedAlice();
      await assertFails(updateDoc(doc(alice(), 'user-stats/alice'), { goal: 25 }));
      await assertFails(updateDoc(doc(alice(), 'user-stats/alice'), { goal: '20' }));
      await assertFails(updateDoc(doc(alice(), 'user-stats/alice'), { days: 'x' }));
      await assertFails(updateDoc(doc(alice(), 'user-stats/alice'), { admin: true }));
    });

    it('lists only when the query is limited to the signed-in uid', async () => {
      await seedAlice();
      await env.withSecurityRulesDisabled((ctx) =>
        setDoc(doc(ctx.firestore(), 'user-stats/bob'), { uid: 'bob', days: {} }),
      );
      await assertFails(getDocs(collection(alice(), 'user-stats')));
      await assertFails(getDocs(query(collection(alice(), 'user-stats'), where('uid', '==', 'bob'))));
      await assertFails(getDocs(query(collection(anon(), 'user-stats'), where('uid', '==', 'alice'))));
      const snapshot = await assertSucceeds(
        getDocs(query(collection(alice(), 'user-stats'), where('uid', '==', 'alice'))),
      );
      expect(snapshot.docs.map((d) => d.id)).toEqual(['alice']);
    });
  });

  describe('shared-sets', () => {
    const seedAliceShare = () =>
      env.withSecurityRulesDisabled((ctx) =>
        setDoc(doc(ctx.firestore(), 'shared-sets/alice-share'), {
          ownerUid: 'alice',
          title: 'A',
          color: '#E91E63',
          cards: '[]',
          updatedAt: Timestamp.now(),
        }),
      );
    beforeEach(seedAliceShare);

    /** The five fields a public copy holds (spec 11.3), as the app writes them. */
    const share = (overrides: Record<string, unknown> = {}) => ({
      ownerUid: 'alice',
      title: 'Spanish verbs',
      color: '#E91E63',
      cards: '[]',
      updatedAt: serverTimestamp(),
      ...overrides,
    });

    it('anyone can get one by id, signed in or not', async () => {
      await assertSucceeds(getDoc(doc(anon(), 'shared-sets/alice-share')));
      await assertSucceeds(getDoc(doc(bob(), 'shared-sets/alice-share')));
    });

    it('lists only for the owner, with a query limited to their uid', async () => {
      await assertFails(getDocs(collection(anon(), 'shared-sets')));
      await assertFails(getDocs(collection(bob(), 'shared-sets')));
      await assertFails(getDocs(collection(alice(), 'shared-sets')));
      await assertFails(getDocs(query(collection(bob(), 'shared-sets'), where('ownerUid', '==', 'alice'))));
      await assertFails(getDocs(query(collection(anon(), 'shared-sets'), where('ownerUid', '==', 'alice'))));
      const snapshot = await assertSucceeds(
        getDocs(query(collection(alice(), 'shared-sets'), where('ownerUid', '==', 'alice'))),
      );
      expect(snapshot.docs.map((d) => d.id)).toEqual(['alice-share']);
    });

    it('a signed-in user can create one for themselves with the five fields', async () => {
      await assertSucceeds(setDoc(doc(alice(), 'shared-sets/new'), share()));
    });

    it('signed-out visitors cannot create one, and nobody can create one for someone else', async () => {
      await assertFails(setDoc(doc(anon(), 'shared-sets/new'), share()));
      await assertFails(setDoc(doc(bob(), 'shared-sets/new'), share({ ownerUid: 'alice' })));
    });

    it('holds exactly the five fields: no extra and none missing', async () => {
      await assertFails(setDoc(doc(alice(), 'shared-sets/new'), share({ email: 'a@example.test' })));
      await assertFails(setDoc(doc(alice(), 'shared-sets/new'), share({ labels: [] })));
      const noColor: Record<string, unknown> = share();
      delete noColor.color;
      await assertFails(setDoc(doc(alice(), 'shared-sets/new'), noColor));
    });

    it('caps the title at 200 characters', async () => {
      await assertSucceeds(setDoc(doc(alice(), 'shared-sets/title-200'), share({ title: 'x'.repeat(200) })));
      await assertFails(setDoc(doc(alice(), 'shared-sets/title-201'), share({ title: 'x'.repeat(201) })));
    });

    it('keeps the title and the color strings', async () => {
      await assertFails(setDoc(doc(alice(), 'shared-sets/new'), share({ title: ['x'] })));
      await assertFails(setDoc(doc(alice(), 'shared-sets/new'), share({ color: 42 })));
    });

    it('keeps cards a string of at most 900,000 characters', async () => {
      await assertSucceeds(setDoc(doc(alice(), 'shared-sets/cards-max'), share({ cards: 'x'.repeat(900_000) })));
      await assertFails(setDoc(doc(alice(), 'shared-sets/cards-over'), share({ cards: 'x'.repeat(900_001) })));
      await assertFails(setDoc(doc(alice(), 'shared-sets/cards-list'), share({ cards: [] })));
    });

    it('stamps updatedAt with the server time, not a client one', async () => {
      const anHourAgo = Timestamp.fromMillis(Date.now() - 60 * 60 * 1000);
      await assertFails(setDoc(doc(alice(), 'shared-sets/new'), share({ updatedAt: anHourAgo })));
    });

    it('the owner can update it, but cannot hand it to someone else', async () => {
      await assertSucceeds(
        updateDoc(doc(alice(), 'shared-sets/alice-share'), { title: 'B', updatedAt: serverTimestamp() }),
      );
      await assertFails(
        updateDoc(doc(alice(), 'shared-sets/alice-share'), { ownerUid: 'bob', updatedAt: serverTimestamp() }),
      );
    });

    it('other users cannot update or delete it', async () => {
      await assertFails(
        updateDoc(doc(bob(), 'shared-sets/alice-share'), { title: 'hacked', updatedAt: serverTimestamp() }),
      );
      await assertFails(deleteDoc(doc(bob(), 'shared-sets/alice-share')));
      await assertFails(deleteDoc(doc(anon(), 'shared-sets/alice-share')));
    });

    it('the owner can delete it', async () => {
      await assertSucceeds(deleteDoc(doc(alice(), 'shared-sets/alice-share')));
    });

    it('a set may carry its shareId as a string', async () => {
      await assertSucceeds(updateDoc(doc(alice(), 'flash-card-sets/alice-set'), { shareId: 'alice-share' }));
      await assertFails(updateDoc(doc(alice(), 'flash-card-sets/alice-set'), { shareId: 42 }));
    });

    // The app may touch a copy that is already gone: deleting the set or stopping sharing deletes
    // it in a batch, and a save updates it and clears shareId on not-found (spec 11.4).
    describe('a copy that no longer exists', () => {
      const gone = (db: ReturnType<typeof alice>) => doc(db, 'shared-sets/gone');
      const copyExists = async () => {
        let exists: boolean | undefined;
        await env.withSecurityRulesDisabled(async (ctx) => {
          exists = (await getDoc(gone(ctx.firestore()))).exists();
        });
        return exists;
      };

      it('a signed-in user deleting it deletes nothing, and succeeds', async () => {
        await assertSucceeds(deleteDoc(gone(alice())));
      });

      it('deleting a set together with its missing copy succeeds', async () => {
        const db = alice();
        const batch = writeBatch(db);
        batch.delete(doc(db, 'flash-card-sets/alice-set'));
        batch.delete(gone(db));
        await assertSucceeds(batch.commit());
      });

      it('stopping sharing when the copy is already gone clears shareId and succeeds', async () => {
        const db = alice();
        const batch = writeBatch(db);
        batch.delete(gone(db));
        batch.update(doc(db, 'flash-card-sets/alice-set'), { shareId: deleteField() });
        await assertSucceeds(batch.commit());
      });

      it('updating it rejects with not-found, not permission-denied, and creates nothing', async () => {
        const update = { title: 'T', color: '#000000', cards: '[]', updatedAt: serverTimestamp() };
        await expect(updateDoc(gone(alice()), update)).rejects.toMatchObject({ code: 'not-found' });
        await expect(updateDoc(gone(alice()), { ...update, ownerUid: 'alice' })).rejects.toMatchObject({
          code: 'not-found',
        });
        expect(await copyExists()).toBe(false);
      });

      it('a write without an exists check cannot use the gap to create a copy', async () => {
        await assertFails(setDoc(gone(alice()), { ownerUid: 'alice', admin: true }, { merge: true }));
        await assertFails(setDoc(gone(alice()), { ownerUid: 'alice', admin: true }));
        await assertFails(setDoc(gone(bob()), share(), { merge: true }));
        expect(await copyExists()).toBe(false);
      });

      it('signed-out visitors still cannot update or delete it', async () => {
        await assertFails(deleteDoc(gone(anon())));
        await assertFails(updateDoc(gone(anon()), { title: 'T' }));
      });
    });
  });

  it('other collections are closed', async () => {
    await assertFails(setDoc(doc(alice(), 'anything/else'), { uid: 'alice' }));
  });
});
