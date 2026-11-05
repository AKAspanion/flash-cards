import { ref } from 'vue';
import { defineStore } from 'pinia';
import type { CardSet, Label } from '@/types';
import * as api from '@/services/firebase';
import i18n from '@/plugins/i18n';
import { fitsSharedLimit } from '@/services/cardSetMapper';
import { fitsSizeLimit } from '@/utils/setSize';
import { useSessionStore } from './session';

type Status = 'idle' | 'loading' | 'ready' | 'error';

function withoutShareId(set: CardSet): CardSet {
  const copy = { ...set };
  delete copy.shareId;
  return copy;
}

/**
 * The signed-in user's card sets and labels. Write actions show an error
 * snack themselves and resolve to null/false on failure, so callers only
 * continue (e.g. navigate away) once the write has really succeeded.
 *
 * Online, a write is awaited through `session.track`. Offline, or once the
 * device goes offline while it waits, it counts as done since it is already
 * in Firestore's local cache (spec 10.3): the store updates
 * at once, and a write the server later refuses shows the save error and
 * reloads what the server holds (spec 10.4). Delete forever, sharing and stopping
 * sharing are online-only (spec 10.5).
 *
 * While a set is shared, every save of it also updates its public copy (spec 11.4).
 */
export const useLibraryStore = defineStore('library', () => {
  const session = useSessionStore();

  const sets = ref<CardSet[]>([]);
  const labels = ref<Label[]>([]);
  const status = ref<Status>('idle');
  let loadedFor: string | null = null;
  let loading: Promise<void> | null = null;
  let loadGeneration = 0;

  function load(force = false): Promise<void> {
    const uid = session.user?.uid ?? null;
    if (!uid) {
      reset();
      return Promise.resolve();
    }
    if (!force && loadedFor === uid && (status.value === 'ready' || loading)) {
      return loading ?? Promise.resolve();
    }
    loadedFor = uid;
    status.value = 'loading';
    const generation = ++loadGeneration;
    // A newer load (or reset, e.g. after a user switch) makes this one stale: ignore its result.
    const isCurrent = () => generation === loadGeneration;
    const request: Promise<void> = session
      .track(Promise.all([api.fetchCardSets(), api.fetchLabels()]))
      .then(([fetchedSets, fetchedLabels]) => {
        if (isCurrent()) {
          sets.value = fetchedSets;
          labels.value = fetchedLabels;
          status.value = 'ready';
        }
      })
      .catch((err) => {
        if (isCurrent()) {
          status.value = 'error';
          session.showError(err, 'toast.error.load');
        }
      })
      .finally(() => {
        if (loading === request) {
          loading = null;
        }
      });
    loading = request;
    return request;
  }

  function reset() {
    sets.value = [];
    labels.value = [];
    status.value = 'idle';
    loadedFor = null;
    loading = null;
    loadGeneration++;
  }

  function findSet(id: string): CardSet | undefined {
    return sets.value.find((set) => set.id === id);
  }

  /**
   * Online, waits for the server. Offline, or once the device goes offline while waiting, the write
   * is already in the local cache: it counts as saved now, and a later refusal by the server shows
   * the save error and reloads.
   */
  async function settle(committed: Promise<unknown>): Promise<void> {
    if ((await session.settleWrite(committed)) === 'saved') {
      return;
    }
    committed.catch((err) => {
      session.showError(err, 'toast.error.save');
      void load(true);
    });
    session.notifyOfflineSave();
  }

  function replaceSet(updated: CardSet) {
    sets.value = sets.value.map((set) => (set.docId === updated.docId ? updated : set));
  }

  function storedSet(set: CardSet): CardSet | undefined {
    return set.docId ? sets.value.find((s) => s.docId === set.docId) : undefined;
  }

  /** Drops `shareId` from the stored set, but only while it still holds `shareId` (it may have been re-shared since). */
  function forgetShareId(set: CardSet, shareId: string): boolean {
    const stored = storedSet(set);
    if (stored?.shareId !== shareId) {
      return false;
    }
    replaceSet(withoutShareId(stored));
    return true;
  }

  /** The set itself saved, but its public copy didn't update: say so, without saying the save failed. */
  function reportSyncFailure(err: unknown) {
    console.error(err);
    session.showSnack(i18n.global.t('share.sync-failed'));
  }

  /**
   * Updates a shared set's public copy after the set's own write; the save doesn't wait for it.
   * A copy that has gone (deleted elsewhere) clears `shareId` and is not recreated (spec 11.4).
   * Any other failure, or a copy too big for the rules, keeps `shareId` and the link's old content.
   */
  function syncCopy(set: CardSet) {
    const shareId = set.shareId;
    if (!shareId) {
      return;
    }
    if (!fitsSharedLimit(set.cards)) {
      reportSyncFailure(new Error('The public copy of this set is over the size limit; it was not updated.'));
      return;
    }
    api.syncSharedCopy(set).catch(async (err) => {
      if ((err as { code?: string })?.code !== 'not-found') {
        reportSyncFailure(err);
        return;
      }
      console.warn('The shared copy of a set has gone; its shareId is cleared.');
      if (!forgetShareId(set, shareId)) {
        return;
      }
      try {
        await api.clearShareId(set);
      } catch (clearErr) {
        session.showError(clearErr, 'toast.error.save');
      }
    });
  }

  async function createSet(set: CardSet): Promise<CardSet | null> {
    if (!fitsSizeLimit(set.cards)) {
      session.showSnack(i18n.global.t('toast.error.too-big'));
      return null;
    }
    // A new set is never shared: copies, duplicates and restores start private (spec 11.4).
    const unshared = withoutShareId(set);
    try {
      const { docId, committed } = api.addCardSet(unshared);
      await settle(committed);
      const saved = { ...unshared, docId };
      // A load that finished meanwhile may already contain the new document.
      sets.value = [...sets.value.filter((s) => s.docId !== docId), saved];
      return saved;
    } catch (err) {
      session.showError(err, 'toast.error.save');
      return null;
    }
  }

  async function saveSet(set: CardSet): Promise<boolean> {
    if (!fitsSizeLimit(set.cards)) {
      session.showSnack(i18n.global.t('toast.error.too-big'));
      return false;
    }
    try {
      await settle(api.updateCardSet(set));
      replaceSet(set);
      syncCopy(set);
      return true;
    } catch (err) {
      session.showError(err, 'toast.error.save');
      return false;
    }
  }

  async function deleteSet(set: CardSet): Promise<boolean> {
    if (!session.online) {
      session.showSnack(i18n.global.t('toast.offline-delete'));
      return false;
    }
    try {
      await session.track(api.deleteCardSet(set));
      sets.value = sets.value.filter((s) => s.docId !== set.docId);
      return true;
    } catch (err) {
      session.showError(err, 'toast.error.delete');
      return false;
    }
  }

  /**
   * Shares a saved set (online only) and resolves with it carrying its `shareId`. A set the store
   * already holds as shared keeps its one public copy; no second copy is made.
   */
  async function shareSet(set: CardSet): Promise<CardSet | null> {
    if (!session.online) {
      session.showSnack(i18n.global.t('toast.offline-save'));
      return null;
    }
    // The stored set is the truth: an editor's copy may still carry a shareId that has since been cleared.
    const stored = storedSet(set);
    const existing = stored ? stored.shareId : set.shareId;
    if (existing) {
      return { ...set, shareId: existing };
    }
    if (!fitsSharedLimit(set.cards)) {
      session.showSnack(i18n.global.t('toast.error.too-big'));
      return null;
    }
    try {
      const shareId = await session.track(api.shareCardSet(set));
      const current = storedSet(set);
      if (current) {
        replaceSet({ ...current, shareId });
      }
      return { ...set, shareId };
    } catch (err) {
      session.showError(err, 'toast.error.save');
      return null;
    }
  }

  /** Deletes the set's public copy and clears its `shareId` (online only). */
  async function unshareSet(set: CardSet): Promise<boolean> {
    if (!session.online) {
      session.showSnack(i18n.global.t('toast.offline-save'));
      return false;
    }
    const shareId = storedSet(set)?.shareId ?? set.shareId;
    if (!shareId) {
      return true;
    }
    try {
      await session.track(api.unshareCardSet({ ...set, shareId }));
      forgetShareId(set, shareId);
      return true;
    } catch (err) {
      session.showError(err, 'toast.error.save');
      return false;
    }
  }

  async function createLabel(text: string): Promise<Label | null> {
    try {
      const { docId, committed } = api.addLabel(text);
      await settle(committed);
      const label = { docId, label: text };
      labels.value = [...labels.value.filter((l) => l.docId !== docId), label];
      return label;
    } catch (err) {
      session.showError(err, 'toast.error.save');
      return null;
    }
  }

  async function renameLabel(label: Label, text: string): Promise<boolean> {
    try {
      await settle(api.renameLabel(label.docId, text));
      labels.value = labels.value.map((l) => (l.docId === label.docId ? { ...l, label: text } : l));
      return true;
    } catch (err) {
      session.showError(err, 'toast.error.save');
      return false;
    }
  }

  return {
    sets,
    labels,
    status,
    load,
    reset,
    findSet,
    createSet,
    saveSet,
    deleteSet,
    shareSet,
    unshareSet,
    createLabel,
    renameLabel,
  };
});
