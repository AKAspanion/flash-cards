// @vitest-environment node
// Runs only against the Firestore emulator: `npm run test:rules`.
import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { addDoc, collection, deleteDoc, doc, getDoc, getDocs, query, setDoc, updateDoc, where } from 'firebase/firestore';

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

  it('other collections are closed', async () => {
    await assertFails(setDoc(doc(alice(), 'anything/else'), { uid: 'alice' }));
  });
});
