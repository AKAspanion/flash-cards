import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { defineComponent, nextTick } from 'vue';
import { mount } from '@vue/test-utils';
import type { CardSet, FlashCard } from '@/types';
import { updateAppBadge } from '@/services/appBadge';
import { useAppBadge } from '@/composables/useAppBadge';
import { useLibraryStore } from '@/stores/library';
import { useSessionStore } from '@/stores/session';
import { NEW_CARDS_PER_REVIEW } from '@/utils/srs';

const TODAY = '2026-11-05';

function target() {
  return {
    setAppBadge: vi.fn().mockResolvedValue(undefined),
    clearAppBadge: vi.fn().mockResolvedValue(undefined),
  };
}

describe('updateAppBadge', () => {
  it('sets the badge to a positive count', async () => {
    const t = target();
    await updateAppBadge(5, t);
    expect(t.setAppBadge).toHaveBeenCalledTimes(1);
    expect(t.setAppBadge).toHaveBeenCalledWith(5);
    expect(t.clearAppBadge).not.toHaveBeenCalled();
  });

  it('clears the badge at 0', async () => {
    const t = target();
    await updateAppBadge(0, t);
    expect(t.clearAppBadge).toHaveBeenCalledTimes(1);
    expect(t.setAppBadge).not.toHaveBeenCalled();
  });

  it('does nothing where the Badging API is missing', async () => {
    await expect(updateAppBadge(3, {})).resolves.toBeUndefined();
    await expect(updateAppBadge(0, {})).resolves.toBeUndefined();
  });

  it('swallows a refused badge without logging or showing a snack', async () => {
    setActivePinia(createPinia());
    const session = useSessionStore();
    const showError = vi.spyOn(session, 'showError');
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    const t = target();
    t.setAppBadge.mockRejectedValue(new DOMException('no', 'NotAllowedError'));
    t.clearAppBadge.mockRejectedValue(new DOMException('no', 'NotAllowedError'));
    await expect(updateAppBadge(3, t)).resolves.toBeUndefined();
    await expect(updateAppBadge(0, t)).resolves.toBeUndefined();
    expect(consoleError).not.toHaveBeenCalled();
    expect(showError).not.toHaveBeenCalled();
    expect(session.snack.show).toBe(false);
    consoleError.mockRestore();
  });
});

const card = (id: string, due?: string): FlashCard => ({
  id,
  front: id,
  back: id,
  learned: false,
  date: '',
  srs: due ? { due, interval: 1, ease: 2.5, reps: 1, lapses: 0 } : undefined,
});

const set = (title: string, cards: FlashCard[], trashed = false): CardSet => ({
  id: title,
  docId: title,
  title,
  color: '#000',
  date: new Date(0),
  trashed,
  fav: false,
  labels: [],
  cards,
});

describe('useAppBadge', () => {
  let t: ReturnType<typeof target>;

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 10, 5, 12, 0, 0));
    setActivePinia(createPinia());
    t = target();
    Object.defineProperty(navigator, 'setAppBadge', { value: t.setAppBadge, configurable: true });
    Object.defineProperty(navigator, 'clearAppBadge', {
      value: t.clearAppBadge,
      configurable: true,
    });
    mount(defineComponent({ setup: () => useAppBadge(), template: '<div />' }));
    // Mounting while signed out clears any stale badge; start each test from a clean record.
    expect(t.clearAppBadge).toHaveBeenCalledTimes(1);
    t.clearAppBadge.mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
    Reflect.deleteProperty(navigator, 'setAppBadge');
    Reflect.deleteProperty(navigator, 'clearAppBadge');
  });

  async function load(sets: CardSet[]) {
    const library = useLibraryStore();
    library.sets = sets;
    library.status = 'ready';
    await nextTick();
    return library;
  }

  it('sets the badge to the number of due cards when the library is ready', async () => {
    await load([
      set('a', [card('1', TODAY), card('2', '2026-11-01'), card('3', '2026-12-01')]),
      set('b', [card('4', '2026-10-30'), card('5', '2026-11-04')]),
    ]);
    expect(t.setAppBadge).toHaveBeenLastCalledWith(4);
  });

  it('counts at most one review queue of new cards', async () => {
    const cards = Array.from({ length: 30 }, (_, i) => card(`n${i}`));
    await load([set('a', cards)]);
    expect(t.setAppBadge).toHaveBeenLastCalledWith(NEW_CARDS_PER_REVIEW);
    expect(NEW_CARDS_PER_REVIEW).toBe(20);
  });

  it('follows a replaced set, and clears the badge when none are due', async () => {
    const cards = Array.from({ length: 30 }, (_, i) => card(`n${i}`));
    const library = await load([set('a', cards)]);
    library.sets = [set('a', [card('1', TODAY), card('2', '2026-12-01')])];
    await nextTick();
    expect(t.setAppBadge).toHaveBeenLastCalledWith(1);
    t.clearAppBadge.mockClear();
    library.sets = [set('a', [card('1', '2026-12-01')])];
    await nextTick();
    expect(t.clearAppBadge).toHaveBeenCalledTimes(1);
  });

  it('clears the badge when the library resets on sign-out', async () => {
    const library = await load([set('a', [card('1', TODAY)])]);
    expect(t.setAppBadge).toHaveBeenLastCalledWith(1);
    t.clearAppBadge.mockClear();
    library.sets = [];
    library.status = 'idle';
    await nextTick();
    expect(t.clearAppBadge).toHaveBeenCalledTimes(1);
  });

  it('does not count sets in the bin', async () => {
    await load([set('a', Array.from({ length: 10 }, (_, i) => card(`c${i}`, TODAY)), true)]);
    expect(t.clearAppBadge).toHaveBeenCalledTimes(1);
    expect(t.setAppBadge).not.toHaveBeenCalled();
  });

  it('leaves the badge alone while the library is loading', async () => {
    const library = useLibraryStore();
    library.status = 'loading';
    await nextTick();
    expect(t.setAppBadge).not.toHaveBeenCalled();
    expect(t.clearAppBadge).not.toHaveBeenCalled();
  });
});
