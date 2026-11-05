import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import type { CardSet } from '@/types';

const api = vi.hoisted(() => ({
  fetchCardSets: vi.fn(),
  fetchLabels: vi.fn(),
  addCardSet: vi.fn(),
  updateCardSet: vi.fn(),
}));
vi.mock('@/services/firebase', () => api);

const { useLibraryStore } = await import('@/stores/library');
const { useSessionStore } = await import('@/stores/session');

function deferred<T>() {
  let resolve!: (v: T) => void;
  let reject!: (e: unknown) => void;
  const promise = new Promise<T>((res, rej) => ((resolve = res), (reject = rej)));
  return { promise, resolve, reject };
}

const set = (title: string): CardSet => ({
  id: title,
  title,
  color: '#000',
  date: new Date(0),
  trashed: false,
  fav: false,
  labels: [],
  cards: [],
});

describe('library store', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.resetAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  function signIn(uid: string) {
    useSessionStore().user = { uid, email: '', displayName: '', photoURL: '', creationTime: '', lastSignInTime: '' };
  }

  it("ignores a previous user's load that finishes after a user switch", async () => {
    const aliceSets = deferred<CardSet[]>();
    api.fetchCardSets.mockReturnValueOnce(aliceSets.promise).mockResolvedValueOnce([set('bob')]);
    api.fetchLabels.mockResolvedValue([]);
    const library = useLibraryStore();

    signIn('alice');
    const aliceLoad = library.load();
    library.reset();
    signIn('bob');
    await library.load();
    expect(library.sets.map((s) => s.title)).toEqual(['bob']);

    aliceSets.reject(new Error('permission-denied'));
    await aliceLoad;
    expect(library.status).toBe('ready');
    expect(library.sets.map((s) => s.title)).toEqual(['bob']);
    expect(useSessionStore().snack.show).toBe(false);
  });

  it('does not refetch while a load for the same user is in flight', async () => {
    api.fetchCardSets.mockResolvedValue([]);
    api.fetchLabels.mockResolvedValue([]);
    const library = useLibraryStore();
    signIn('alice');
    await Promise.all([library.load(), library.load()]);
    expect(api.fetchCardSets).toHaveBeenCalledTimes(1);
  });

  it('does not list a new set twice when a load returns it first', async () => {
    const pendingLoad = deferred<CardSet[]>();
    const created = deferred<string>();
    api.fetchCardSets.mockReturnValueOnce(pendingLoad.promise);
    api.fetchLabels.mockResolvedValue([]);
    api.addCardSet.mockReturnValueOnce(created.promise);
    const library = useLibraryStore();
    signIn('alice');

    const load = library.load();
    const create = library.createSet(set('new'));
    // The load reads the new document before addDoc's promise settles.
    pendingLoad.resolve([{ ...set('new'), docId: 'd-new' }]);
    await load;
    created.resolve('d-new');
    await create;

    expect(library.sets.map((s) => s.docId)).toEqual(['d-new']);
  });

  it('reports a failed save and keeps local data unchanged', async () => {
    api.fetchCardSets.mockResolvedValue([{ ...set('a'), docId: 'd1' }]);
    api.fetchLabels.mockResolvedValue([]);
    api.updateCardSet.mockRejectedValue(new Error('offline'));
    const library = useLibraryStore();
    signIn('alice');
    await library.load();

    const ok = await library.saveSet({ ...library.sets[0], title: 'renamed' });
    expect(ok).toBe(false);
    expect(library.sets[0].title).toBe('a');
    expect(useSessionStore().snack.text).toBe('offline');
  });

  const TOO_BIG = 'This set is too big to save. Split it into smaller sets.';
  const bigCards = [{ id: 'c', front: 'x'.repeat(900_001), back: 'b', learned: false, date: 'd' }];

  it('refuses to save a set over the size limit without calling the api', async () => {
    api.fetchCardSets.mockResolvedValue([{ ...set('a'), docId: 'd1' }]);
    api.fetchLabels.mockResolvedValue([]);
    const library = useLibraryStore();
    signIn('alice');
    await library.load();

    const ok = await library.saveSet({ ...library.sets[0], cards: bigCards });
    expect(ok).toBe(false);
    expect(api.updateCardSet).not.toHaveBeenCalled();
    expect(useSessionStore().snack.text).toBe(TOO_BIG);
  });

  it('refuses to create a set over the size limit', async () => {
    const library = useLibraryStore();
    signIn('alice');
    expect(await library.createSet({ ...set('big'), cards: bigCards })).toBeNull();
    expect(api.addCardSet).not.toHaveBeenCalled();
    expect(useSessionStore().snack.text).toBe(TOO_BIG);
  });
});
