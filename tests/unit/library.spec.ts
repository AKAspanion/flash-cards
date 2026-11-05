import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import type { CardSet, FlashCard } from '@/types';
import { cardsByteSize, MAX_CARDS_BYTES } from '@/utils/setSize';

const api = vi.hoisted(() => ({
  fetchCardSets: vi.fn(),
  fetchLabels: vi.fn(),
  addCardSet: vi.fn(),
  updateCardSet: vi.fn(),
  deleteCardSet: vi.fn(),
  addLabel: vi.fn(),
  renameLabel: vi.fn(),
  shareCardSet: vi.fn(),
  unshareCardSet: vi.fn(),
  syncSharedCopy: vi.fn(),
  clearShareId: vi.fn(),
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
  afterEach(() => vi.useRealTimers());

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
    const created = deferred<void>();
    api.fetchCardSets.mockReturnValueOnce(pendingLoad.promise);
    api.fetchLabels.mockResolvedValue([]);
    api.addCardSet.mockReturnValueOnce({ docId: 'd-new', committed: created.promise });
    const library = useLibraryStore();
    signIn('alice');

    const load = library.load();
    const create = library.createSet(set('new'));
    // The load reads the new document before addDoc's promise settles.
    pendingLoad.resolve([{ ...set('new'), docId: 'd-new' }]);
    await load;
    created.resolve();
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

  describe('offline and online writes', () => {
    const OFFLINE_SAVED = "Saved on this device. It will sync when you're back online.";
    const SAVE_ERROR = 'Could not save. Please try again.';
    const never = <T>() => new Promise<T>(() => {});
    const flush = () => new Promise((resolve) => setTimeout(resolve));
    // A refusal whose message is empty, so the snack falls back to the save message.
    const refused = () => Object.assign(new Error(''), { code: 'permission-denied' });

    async function loadedLibrary() {
      api.fetchCardSets.mockResolvedValue([{ ...set('a'), docId: 'd1' }]);
      api.fetchLabels.mockResolvedValue([{ docId: 'l1', label: 'Old' }]);
      const library = useLibraryStore();
      signIn('alice');
      await library.load();
      return library;
    }

    function goOffline() {
      useSessionStore().online = false;
    }

    /** A connectivity change as App.vue reports it; the session store's sync watcher reacts to each one. */
    function setOnline(value: boolean) {
      useSessionStore().online = value;
    }

    it('offline, a save resolves once the write is queued and shows the offline snack', async () => {
      const library = await loadedLibrary();
      goOffline();
      api.updateCardSet.mockReturnValue(never());

      expect(await library.saveSet({ ...library.sets[0], title: 'renamed' })).toBe(true);
      expect(library.sets[0].title).toBe('renamed');
      expect(useSessionStore().snack.text).toBe(OFFLINE_SAVED);
    });

    it('offline, a second save shows no snack until the app has been back online', async () => {
      const library = await loadedLibrary();
      const session = useSessionStore();
      goOffline();
      api.updateCardSet.mockReturnValue(never());

      await library.saveSet({ ...library.sets[0], title: 'one' });
      session.snack.show = false;
      await library.saveSet({ ...library.sets[0], title: 'two' });
      expect(session.snack.show).toBe(false);

      // Back online, then offline again: going online ends the offline period.
      setOnline(true);
      setOnline(false);
      await library.saveSet({ ...library.sets[0], title: 'three' });
      expect(session.snack.show).toBe(true);
      expect(session.snack.text).toBe(OFFLINE_SAVED);
    });

    it('offline, a new set gets the id the api made and is listed at once', async () => {
      const library = await loadedLibrary();
      goOffline();
      api.addCardSet.mockReturnValue({ docId: 'client-made', committed: never() });

      const created = await library.createSet(set('new'));
      expect(created?.docId).toBe('client-made');
      expect(library.sets.find((s) => s.docId === 'client-made')).toEqual(created);
      expect(useSessionStore().snack.text).toBe(OFFLINE_SAVED);
    });

    it('offline, creating and renaming labels succeed at once', async () => {
      const library = await loadedLibrary();
      goOffline();
      api.addLabel.mockReturnValue({ docId: 'l2', committed: never() });
      api.renameLabel.mockReturnValue(never());

      expect(await library.createLabel('Verbs')).toEqual({ docId: 'l2', label: 'Verbs' });
      expect(await library.renameLabel(library.labels[0], 'Nouns')).toBe(true);
      expect(library.labels).toEqual([
        { docId: 'l1', label: 'Nouns' },
        { docId: 'l2', label: 'Verbs' },
      ]);
    });

    it('offline, a write the server later refuses shows the save error and reloads', async () => {
      const library = await loadedLibrary();
      goOffline();
      const write = deferred<void>();
      api.updateCardSet.mockReturnValue(write.promise);
      await library.saveSet({ ...library.sets[0], title: 'renamed' });
      expect(api.fetchCardSets).toHaveBeenCalledTimes(1);

      write.reject(refused());
      await flush();
      expect(useSessionStore().snack.text).toBe(SAVE_ERROR);
      expect(api.fetchCardSets).toHaveBeenCalledTimes(2);
      expect(library.sets[0].title).toBe('a');
    });

    it('offline, a refused new set is reported and the list reloads', async () => {
      const library = await loadedLibrary();
      goOffline();
      const write = deferred<void>();
      api.addCardSet.mockReturnValue({ docId: 'client-made', committed: write.promise });
      await library.createSet(set('new'));

      write.reject(refused());
      await flush();
      expect(useSessionStore().snack.text).toBe(SAVE_ERROR);
      expect(api.fetchCardSets).toHaveBeenCalledTimes(2);
      expect(library.sets.map((s) => s.docId)).toEqual(['d1']);
    });

    it('online, a failed save resolves false with the save error and keeps the list', async () => {
      const library = await loadedLibrary();
      api.updateCardSet.mockRejectedValue(new Error(''));

      expect(await library.saveSet({ ...library.sets[0], title: 'renamed' })).toBe(false);
      expect(useSessionStore().snack.text).toBe(SAVE_ERROR);
      expect(library.sets[0].title).toBe('a');
    });

    it('online, a save waits for the server', async () => {
      const library = await loadedLibrary();
      const write = deferred<void>();
      api.updateCardSet.mockReturnValue(write.promise);
      let settled = false;
      const saving = library.saveSet({ ...library.sets[0], title: 'renamed' }).then((ok) => {
        settled = true;
        return ok;
      });

      await flush();
      expect(settled).toBe(false);
      expect(library.sets[0].title).toBe('a');
      write.resolve();
      expect(await saving).toBe(true);
      expect(library.sets[0].title).toBe('renamed');
    });

    it('a save waiting for the server counts as done the moment the device goes offline', async () => {
      const library = await loadedLibrary();
      const session = useSessionStore();
      const write = deferred<void>();
      api.updateCardSet.mockReturnValue(write.promise);
      let settled = false;
      const saving = library.saveSet({ ...library.sets[0], title: 'renamed' }).then((ok) => {
        settled = true;
        return ok;
      });
      await flush();
      expect(settled).toBe(false);

      goOffline();
      await flush();
      expect(settled).toBe(true);
      expect(await saving).toBe(true);
      expect(library.sets[0].title).toBe('renamed');
      expect(session.snack.text).toBe(OFFLINE_SAVED);
      expect(session.pending).toBe(0);
    });

    it('a save that went offline while waiting still reports a later refusal and reloads', async () => {
      const library = await loadedLibrary();
      const write = deferred<void>();
      api.updateCardSet.mockReturnValue(write.promise);
      let settled = false;
      void library.saveSet({ ...library.sets[0], title: 'renamed' }).then(() => (settled = true));
      await flush();
      goOffline();
      await flush();
      expect(settled).toBe(true);

      write.reject(refused());
      await flush();
      expect(useSessionStore().snack.text).toBe(SAVE_ERROR);
      expect(api.fetchCardSets).toHaveBeenCalledTimes(2);
    });

    it('online, a slow save warns after 8 seconds and keeps waiting', async () => {
      const library = await loadedLibrary();
      vi.useFakeTimers();
      api.updateCardSet.mockReturnValue(never());
      let settled = false;
      void library.saveSet({ ...library.sets[0], title: 'renamed' }).then(() => (settled = true));

      await vi.advanceTimersByTimeAsync(8000);
      expect(useSessionStore().snack.text).toBe('Experiencing network difficulty, please hold on!');
      expect(settled).toBe(false);
    });

    it('offline, delete forever is refused without calling the api', async () => {
      const library = await loadedLibrary();
      goOffline();

      expect(await library.deleteSet(library.sets[0])).toBe(false);
      expect(api.deleteCardSet).not.toHaveBeenCalled();
      expect(library.sets.map((s) => s.docId)).toEqual(['d1']);
      expect(useSessionStore().snack.text).toBe("You're offline. Connect to the internet to delete this set.");
    });
  });
  describe('sharing', () => {
    const SAVE_ERROR = 'Could not save. Please try again.';
    const OFFLINE = "You're offline. Connect to the internet to save.";
    const SYNC_FAILED = "Couldn't update the shared link. Your set is saved.";
    const TOO_BIG = 'This set is too big to save. Split it into smaller sets.';

    /** Learned cards whose stored JSON is exactly the save limit; written unlearned, the public copy is longer. */
    function learnedCardsAtSaveLimit(): FlashCard[] {
      const cards = Array.from({ length: 1000 }, (_, i) => ({
        id: `c${i}`,
        front: '',
        back: '',
        learned: true,
        date: '2026-01-01T00:00:00.000Z',
      }));
      cards[0].front = 'x'.repeat(MAX_CARDS_BYTES - cardsByteSize(cards));
      return cards;
    }
    const flush = () => new Promise((resolve) => setTimeout(resolve));
    // Errors with empty messages, so the snack falls back to the save message.
    const firestoreError = (code: string) => Object.assign(new Error(''), { code });

    async function libraryWith(stored: CardSet) {
      api.fetchCardSets.mockResolvedValue([stored]);
      api.fetchLabels.mockResolvedValue([]);
      const library = useLibraryStore();
      signIn('alice');
      await library.load();
      return library;
    }

    it('shares a saved set once and stores the returned shareId', async () => {
      const library = await libraryWith({ ...set('a'), docId: 'd1' });
      api.shareCardSet.mockResolvedValue('S'.repeat(20));

      const shared = await library.shareSet(library.sets[0]);
      expect(api.shareCardSet).toHaveBeenCalledTimes(1);
      expect(shared).toEqual({ ...set('a'), docId: 'd1', shareId: 'S'.repeat(20) });
      expect(library.sets[0]).toEqual(shared);
    });

    it('reuses the shareId of a set that is already shared', async () => {
      const library = await libraryWith({ ...set('a'), docId: 'd1', shareId: 'x' });

      const shared = await library.shareSet(library.sets[0]);
      expect(api.shareCardSet).not.toHaveBeenCalled();
      expect(shared?.shareId).toBe('x');
    });

    it('shares anew when the stored set has lost the shareId an old copy of it still carries', async () => {
      const library = await libraryWith({ ...set('a'), docId: 'd1' });
      api.shareCardSet.mockResolvedValue('fresh');

      const shared = await library.shareSet({ ...library.sets[0], shareId: 'gone' });
      expect(api.shareCardSet).toHaveBeenCalledTimes(1);
      expect(shared?.shareId).toBe('fresh');
    });

    it('offline, share and stop sharing are refused without calling the api', async () => {
      const library = await libraryWith({ ...set('a'), docId: 'd1', shareId: 'x' });
      useSessionStore().online = false;

      expect(await library.shareSet({ ...library.sets[0], shareId: undefined })).toBeNull();
      expect(useSessionStore().snack.text).toBe(OFFLINE);
      useSessionStore().snack.text = '';
      expect(await library.unshareSet(library.sets[0])).toBe(false);
      expect(useSessionStore().snack.text).toBe(OFFLINE);
      expect(api.shareCardSet).not.toHaveBeenCalled();
      expect(api.unshareCardSet).not.toHaveBeenCalled();
      expect(library.sets[0].shareId).toBe('x');
    });

    it('a failed share resolves null with the save error and stores no shareId', async () => {
      const library = await libraryWith({ ...set('a'), docId: 'd1' });
      api.shareCardSet.mockRejectedValue(firestoreError('permission-denied'));

      expect(await library.shareSet(library.sets[0])).toBeNull();
      expect(useSessionStore().snack.text).toBe(SAVE_ERROR);
      expect(library.sets[0].shareId).toBeUndefined();
    });

    it('stopping sharing deletes the copy and drops the shareId', async () => {
      const library = await libraryWith({ ...set('a'), docId: 'd1', shareId: 'x' });
      api.unshareCardSet.mockResolvedValue(undefined);

      expect(await library.unshareSet(library.sets[0])).toBe(true);
      expect(api.unshareCardSet).toHaveBeenCalledWith(expect.objectContaining({ docId: 'd1', shareId: 'x' }));
      expect(library.sets[0]).not.toHaveProperty('shareId');
    });

    it('a failed stop sharing resolves false with the save error and keeps the shareId', async () => {
      const library = await libraryWith({ ...set('a'), docId: 'd1', shareId: 'x' });
      api.unshareCardSet.mockRejectedValue(firestoreError('unavailable'));

      expect(await library.unshareSet(library.sets[0])).toBe(false);
      expect(useSessionStore().snack.text).toBe(SAVE_ERROR);
      expect(library.sets[0].shareId).toBe('x');
    });

    it('saving a shared set updates its public copy without waiting for it', async () => {
      const library = await libraryWith({ ...set('a'), docId: 'd1', shareId: 'x' });
      api.updateCardSet.mockResolvedValue(undefined);
      api.syncSharedCopy.mockReturnValue(new Promise(() => {}));

      expect(await library.saveSet({ ...library.sets[0], title: 'renamed' })).toBe(true);
      expect(api.syncSharedCopy).toHaveBeenCalledWith(expect.objectContaining({ title: 'renamed', shareId: 'x' }));
    });

    it('saving a set that is not shared does not touch a public copy', async () => {
      const library = await libraryWith({ ...set('a'), docId: 'd1' });
      api.updateCardSet.mockResolvedValue(undefined);

      expect(await library.saveSet({ ...library.sets[0], title: 'renamed' })).toBe(true);
      expect(api.syncSharedCopy).not.toHaveBeenCalled();
    });

    it('a failed save does not update the public copy', async () => {
      const library = await libraryWith({ ...set('a'), docId: 'd1', shareId: 'x' });
      api.updateCardSet.mockRejectedValue(firestoreError('permission-denied'));

      expect(await library.saveSet({ ...library.sets[0], title: 'renamed' })).toBe(false);
      expect(api.syncSharedCopy).not.toHaveBeenCalled();
    });

    it('when the public copy is gone, a save clears the shareId and does not recreate the copy', async () => {
      const library = await libraryWith({ ...set('a'), docId: 'd1', shareId: 'x' });
      api.updateCardSet.mockResolvedValue(undefined);
      api.syncSharedCopy.mockRejectedValue(firestoreError('not-found'));
      api.clearShareId.mockResolvedValue(undefined);
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

      expect(await library.saveSet({ ...library.sets[0], title: 'renamed' })).toBe(true);
      await flush();
      expect(warn).toHaveBeenCalledTimes(1);
      expect(api.clearShareId).toHaveBeenCalledWith(expect.objectContaining({ docId: 'd1' }));
      expect(api.shareCardSet).not.toHaveBeenCalled();
      expect(library.sets[0]).not.toHaveProperty('shareId');
      expect(library.sets[0].title).toBe('renamed');
      expect(useSessionStore().snack.show).toBe(false);
    });

    it('a gone copy does not clear a shareId the set has been given since', async () => {
      const library = await libraryWith({ ...set('a'), docId: 'd1', shareId: 'old' });
      api.updateCardSet.mockResolvedValue(undefined);
      let rejectSync!: (err: unknown) => void;
      api.syncSharedCopy.mockReturnValue(new Promise((_, reject) => (rejectSync = reject)));
      await library.saveSet({ ...library.sets[0], title: 'renamed' });
      api.unshareCardSet.mockResolvedValue(undefined);
      api.shareCardSet.mockResolvedValue('new');
      await library.unshareSet(library.sets[0]);
      await library.shareSet(library.sets[0]);

      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      rejectSync(firestoreError('not-found'));
      await flush();
      expect(warn).toHaveBeenCalledTimes(1);
      expect(api.clearShareId).not.toHaveBeenCalled();
      expect(library.sets[0].shareId).toBe('new');
    });

    it('any other failure to update the copy still saves the set and says only the link failed', async () => {
      const library = await libraryWith({ ...set('a'), docId: 'd1', shareId: 'x' });
      api.updateCardSet.mockResolvedValue(undefined);
      api.syncSharedCopy.mockRejectedValue(Object.assign(new Error('Missing or insufficient permissions.'), { code: 'permission-denied' }));

      expect(await library.saveSet({ ...library.sets[0], title: 'renamed' })).toBe(true);
      await flush();
      expect(useSessionStore().snack.text).toBe(SYNC_FAILED);
      expect(console.error).toHaveBeenCalled();
      expect(api.clearShareId).not.toHaveBeenCalled();
      expect(library.sets[0].shareId).toBe('x');
    });

    it('refuses to share a set whose public copy would be over the cap, writing nothing', async () => {
      const big = { ...set('a'), docId: 'd1', cards: learnedCardsAtSaveLimit() };
      const library = await libraryWith(big);

      expect(await library.shareSet(library.sets[0])).toBeNull();
      expect(api.shareCardSet).not.toHaveBeenCalled();
      expect(useSessionStore().snack.text).toBe(TOO_BIG);
      expect(library.sets[0].shareId).toBeUndefined();
    });

    it('saves a shared set whose public copy would be over the cap, skips the copy and says the link failed', async () => {
      const library = await libraryWith({ ...set('a'), docId: 'd1', shareId: 'x' });
      api.updateCardSet.mockResolvedValue(undefined);

      expect(await library.saveSet({ ...library.sets[0], cards: learnedCardsAtSaveLimit() })).toBe(true);
      await flush();
      expect(api.updateCardSet).toHaveBeenCalledTimes(1);
      expect(api.syncSharedCopy).not.toHaveBeenCalled();
      expect(useSessionStore().snack.text).toBe(SYNC_FAILED);
      expect(library.sets[0].shareId).toBe('x');
    });

    it('moving a shared set to the bin keeps it shared and updates its copy', async () => {
      const library = await libraryWith({ ...set('a'), docId: 'd1', shareId: 'x' });
      api.updateCardSet.mockResolvedValue(undefined);
      api.syncSharedCopy.mockResolvedValue(undefined);

      expect(await library.saveSet({ ...library.sets[0], trashed: true })).toBe(true);
      await flush();
      expect(api.syncSharedCopy).toHaveBeenCalledTimes(1);
      expect(api.unshareCardSet).not.toHaveBeenCalled();
      expect(library.sets[0]).toMatchObject({ trashed: true, shareId: 'x' });
    });

    it('a new set is never shared, even when the set it came from was', async () => {
      const library = await libraryWith({ ...set('a'), docId: 'd1' });
      api.addCardSet.mockReturnValue({ docId: 'd2', committed: Promise.resolve() });

      const created = await library.createSet({ ...set('copy'), shareId: 'x' });
      expect(api.addCardSet.mock.calls[0][0]).not.toHaveProperty('shareId');
      expect(created).not.toHaveProperty('shareId');
      expect(library.sets.find((s) => s.docId === 'd2')).not.toHaveProperty('shareId');
    });
  });
});
