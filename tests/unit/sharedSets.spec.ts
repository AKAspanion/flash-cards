import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { CardSet } from '@/types';

// The Firestore calls the sharing api makes, recorded so the tests can check what each one wrote.
const fb = vi.hoisted(() => {
  const ops: [string, string, unknown?][] = [];
  const batch = {
    set: vi.fn((ref: { path: string }, data: unknown) => void ops.push(['set', ref.path, data])),
    update: vi.fn((ref: { path: string }, data: unknown) => void ops.push(['update', ref.path, data])),
    delete: vi.fn((ref: { path: string }) => void ops.push(['delete', ref.path])),
    commit: vi.fn(async () => {}),
  };
  return {
    ops,
    batch,
    newId: 'NewShareId0123456789',
    user: { uid: 'alice' } as { uid: string } | null,
    getDoc: vi.fn(),
    updateDoc: vi.fn(async () => {}),
  };
});

vi.mock('firebase/app', () => ({ initializeApp: vi.fn(() => ({})) }));
vi.mock('firebase/auth', () => ({
  getAuth: vi.fn(() => ({
    get currentUser() {
      return fb.user;
    },
  })),
  connectAuthEmulator: vi.fn(),
}));
vi.mock('firebase/firestore', async (importOriginal) => ({
  ...(await importOriginal<typeof import('firebase/firestore')>()),
  initializeFirestore: vi.fn(() => ({ name: 'db' })),
  connectFirestoreEmulator: vi.fn(),
  memoryLocalCache: vi.fn(),
  persistentLocalCache: vi.fn(),
  persistentMultipleTabManager: vi.fn(),
  collection: vi.fn((_db: unknown, name: string) => ({ name })),
  doc: vi.fn((parent: { name?: string }, name?: string, id?: string) =>
    name === undefined ? { id: fb.newId, path: `${parent.name}/${fb.newId}` } : { id, path: `${name}/${id}` },
  ),
  writeBatch: vi.fn(() => fb.batch),
  deleteField: vi.fn(() => 'DELETE_FIELD'),
  getDoc: fb.getDoc,
  updateDoc: fb.updateDoc,
}));

vi.stubEnv('VUE_APP_USE_EMULATORS', 'false');
vi.stubEnv('VUE_APP_API_KEY', 'test-key');
vi.stubEnv('VUE_APP_AUTH_DOMAIN', 'test.firebaseapp.com');
vi.stubEnv('VUE_APP_PROJECT_ID', 'test-project');
vi.stubEnv('VUE_APP_APP_ID', 'test-app');

const { shareCardSet, unshareCardSet, syncSharedCopy, clearShareId, fetchSharedSet, deleteCardSet } = await import(
  '@/services/firebase'
);

const set: CardSet = {
  docId: 'set1',
  id: '_abc',
  title: 'Spanish verbs',
  color: '#43A047',
  date: new Date('2021-01-01T00:00:00Z'),
  trashed: false,
  fav: true,
  labels: ['l1'],
  cards: [{ id: 'c1', front: 'Q', back: 'A', learned: true, date: '2020-01-01T00:00:00.000Z' }],
};
const shared: CardSet = { ...set, shareId: 'AbCdEfGhIjKlMnOpQrSt' };

beforeEach(() => {
  fb.ops.length = 0;
  fb.user = { uid: 'alice' };
  vi.clearAllMocks();
});

describe('shareCardSet', () => {
  it('creates the public copy and records its id on the set in one batch', async () => {
    await expect(shareCardSet(set)).resolves.toBe(fb.newId);
    expect(fb.batch.commit).toHaveBeenCalledOnce();
    expect(fb.ops.map(([op, path]) => [op, path])).toEqual([
      ['set', `shared-sets/${fb.newId}`],
      ['update', 'flash-card-sets/set1'],
    ]);
    const copy = fb.ops[0][2] as Record<string, unknown>;
    expect(Object.keys(copy).sort()).toEqual(['cards', 'color', 'ownerUid', 'title', 'updatedAt']);
    expect(copy.ownerUid).toBe('alice');
    expect(JSON.parse(copy.cards as string)[0].learned).toBe(false);
    expect(fb.ops[1][2]).toEqual({ shareId: fb.newId });
  });

  it('commits before its first await, so the write is in the local cache at once', () => {
    void shareCardSet(set);
    expect(fb.batch.commit).toHaveBeenCalledOnce();
  });

  it('refuses a set that was never saved, and when signed out, writing nothing', async () => {
    await expect(shareCardSet({ ...set, docId: undefined })).rejects.toThrow();
    fb.user = null;
    await expect(shareCardSet(set)).rejects.toThrow();
    expect(fb.batch.commit).not.toHaveBeenCalled();
  });
});

describe('unshareCardSet', () => {
  it('deletes the copy and clears shareId in one batch', async () => {
    await unshareCardSet(shared);
    expect(fb.batch.commit).toHaveBeenCalledOnce();
    expect(fb.ops).toEqual([
      ['delete', 'shared-sets/AbCdEfGhIjKlMnOpQrSt'],
      ['update', 'flash-card-sets/set1', { shareId: 'DELETE_FIELD' }],
    ]);
  });

  it('writes nothing for a set that is not shared', async () => {
    await unshareCardSet(set);
    expect(fb.batch.commit).not.toHaveBeenCalled();
  });
});

describe('syncSharedCopy', () => {
  it('updates the copy with the public fields only', async () => {
    await syncSharedCopy({ ...shared, title: 'Spanish verbs 2' });
    expect(fb.updateDoc).toHaveBeenCalledOnce();
    const [ref, data] = fb.updateDoc.mock.calls[0] as unknown as [{ path: string }, Record<string, unknown>];
    expect(ref.path).toBe('shared-sets/AbCdEfGhIjKlMnOpQrSt');
    expect(Object.keys(data).sort()).toEqual(['cards', 'color', 'ownerUid', 'title', 'updatedAt']);
    expect(data.title).toBe('Spanish verbs 2');
  });

  it('passes on a not-found rejection', async () => {
    const gone = Object.assign(new Error('No document to update'), { code: 'not-found' });
    fb.updateDoc.mockRejectedValueOnce(gone);
    await expect(syncSharedCopy(shared)).rejects.toBe(gone);
  });
});

describe('clearShareId', () => {
  it('deletes shareId from the set only', async () => {
    await clearShareId(shared);
    expect(fb.updateDoc).toHaveBeenCalledOnce();
    const [ref, data] = fb.updateDoc.mock.calls[0] as unknown as [{ path: string }, unknown];
    expect(ref.path).toBe('flash-card-sets/set1');
    expect(data).toEqual({ shareId: 'DELETE_FIELD' });
  });
});

describe('fetchSharedSet', () => {
  it('reads a shared copy', async () => {
    fb.getDoc.mockResolvedValueOnce({
      exists: () => true,
      data: () => ({ ownerUid: 'alice', title: 'Spanish verbs', color: '#43A047', cards: '[]' }),
    });
    await expect(fetchSharedSet('AbCdEfGhIjKlMnOpQrSt')).resolves.toEqual({
      shareId: 'AbCdEfGhIjKlMnOpQrSt',
      title: 'Spanish verbs',
      color: '#43A047',
      cards: [],
    });
  });

  it('works signed out', async () => {
    fb.user = null;
    fb.getDoc.mockResolvedValueOnce({ exists: () => true, data: () => ({ title: 'T', cards: '[]' }) });
    await expect(fetchSharedSet('AbCdEfGhIjKlMnOpQrSt')).resolves.toMatchObject({ title: 'T' });
  });

  it('gives null for a missing copy', async () => {
    fb.getDoc.mockResolvedValueOnce({ exists: () => false, data: () => undefined });
    await expect(fetchSharedSet('AbCdEfGhIjKlMnOpQrSt')).resolves.toBeNull();
  });

  it('gives null for an id that is not a share id, without reading anything', async () => {
    await expect(fetchSharedSet('../../flash-card-sets/x')).resolves.toBeNull();
    await expect(fetchSharedSet('flash-card-sets/set1')).resolves.toBeNull();
    expect(fb.getDoc).not.toHaveBeenCalled();
  });
});

describe('deleteCardSet', () => {
  it('deletes a shared set and its copy in one batch', async () => {
    await deleteCardSet(shared);
    expect(fb.batch.commit).toHaveBeenCalledOnce();
    expect(fb.ops).toEqual([
      ['delete', 'flash-card-sets/set1'],
      ['delete', 'shared-sets/AbCdEfGhIjKlMnOpQrSt'],
    ]);
  });

  it('deletes only the set when it is not shared', async () => {
    await deleteCardSet(set);
    expect(fb.ops).toEqual([['delete', 'flash-card-sets/set1']]);
  });
});
