import { ref } from 'vue';
import { defineStore } from 'pinia';
import type { CardSet, Label } from '@/types';
import * as api from '@/services/firebase';
import { useSessionStore } from './session';

type Status = 'idle' | 'loading' | 'ready' | 'error';

/**
 * The signed-in user's card sets and labels. Write actions show an error
 * snack themselves and resolve to null/false on failure, so callers only
 * continue (e.g. navigate away) once the write has really succeeded.
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

  function replaceSet(updated: CardSet) {
    sets.value = sets.value.map((set) => (set.docId === updated.docId ? updated : set));
  }

  async function createSet(set: CardSet): Promise<CardSet | null> {
    try {
      const docId = await session.track(api.addCardSet(set));
      const saved = { ...set, docId };
      sets.value = [...sets.value, saved];
      return saved;
    } catch (err) {
      session.showError(err, 'toast.error.save');
      return null;
    }
  }

  async function saveSet(set: CardSet): Promise<boolean> {
    try {
      await session.track(api.updateCardSet(set));
      replaceSet(set);
      return true;
    } catch (err) {
      session.showError(err, 'toast.error.save');
      return false;
    }
  }

  async function deleteSet(set: CardSet): Promise<boolean> {
    try {
      await session.track(api.deleteCardSet(set));
      sets.value = sets.value.filter((s) => s.docId !== set.docId);
      return true;
    } catch (err) {
      session.showError(err, 'toast.error.delete');
      return false;
    }
  }

  async function createLabel(text: string): Promise<Label | null> {
    try {
      const docId = await session.track(api.addLabel(text));
      const label = { docId, label: text };
      labels.value = [...labels.value, label];
      return label;
    } catch (err) {
      session.showError(err, 'toast.error.save');
      return null;
    }
  }

  async function renameLabel(label: Label, text: string): Promise<boolean> {
    try {
      await session.track(api.renameLabel(label.docId, text));
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
    createLabel,
    renameLabel,
  };
});
