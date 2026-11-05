import { describe, expect, it } from 'vitest';
import {
  NEW_CARDS_PER_REVIEW,
  dueCount,
  dueQueue,
  isDue,
  schedule,
  setDueCounts,
  type SrsState,
} from '@/utils/srs';
import { filterAndSortSets } from '@/utils/cardSets';
import type { CardSet, FlashCard } from '@/types';

const TODAY = '2026-11-02';

const state = (interval: number, ease: number, reps: number, lapses = 0): SrsState => ({
  due: '2026-11-01',
  interval,
  ease,
  reps,
  lapses,
});

const card = (id: string, due?: string): FlashCard => ({
  id,
  front: id,
  back: id,
  learned: false,
  date: '',
  ...(due ? { srs: { due, interval: 1, ease: 2.5, reps: 1, lapses: 0 } } : {}),
});

const set = (id: string, title: string, cards: FlashCard[], trashed = false): CardSet => ({
  id,
  title,
  color: '',
  date: new Date(0),
  trashed,
  fav: false,
  labels: [],
  cards,
});

describe('schedule', () => {
  it('starts a new card rated good', () => {
    expect(schedule(undefined, 'good', TODAY)).toEqual({ due: '2026-11-03', interval: 1, ease: 2.5, reps: 1, lapses: 0 });
  });
  it('starts a new card rated again', () => {
    expect(schedule(undefined, 'again', TODAY)).toEqual({ due: '2026-11-02', interval: 0, ease: 2.3, reps: 0, lapses: 1 });
  });
  it('starts a new card rated hard', () => {
    expect(schedule(undefined, 'hard', TODAY)).toEqual({ due: '2026-11-03', interval: 1, ease: 2.35, reps: 1, lapses: 0 });
  });
  it('starts a new card rated easy', () => {
    expect(schedule(undefined, 'easy', TODAY)).toEqual({ due: '2026-11-06', interval: 4, ease: 2.65, reps: 1, lapses: 0 });
  });
  it('good at reps 1 gives 3 days', () => {
    expect(schedule(state(1, 2.5, 1), 'good', TODAY)).toMatchObject({ interval: 3, reps: 2, due: '2026-11-05' });
  });
  it('good and easy at reps 2 multiply by ease', () => {
    expect(schedule(state(3, 2.5, 2), 'good', TODAY)).toMatchObject({ interval: 8, due: '2026-11-10' });
    expect(schedule(state(3, 2.5, 2), 'easy', TODAY)).toMatchObject({ interval: 10, ease: 2.65 });
  });
  it('hard grows by 1.2', () => {
    expect(schedule(state(10, 2.5, 3), 'hard', TODAY)).toMatchObject({ interval: 12, ease: 2.35 });
  });
  it('never lets ease drop below 1.3', () => {
    expect(schedule(state(10, 1.4, 3, 2), 'again', TODAY)).toMatchObject({ ease: 1.3, interval: 0, reps: 0, lapses: 3 });
    expect(schedule(state(10, 1.35, 3), 'hard', TODAY).ease).toBe(1.3);
  });
});

describe('isDue', () => {
  it('treats new cards and cards due today or earlier as due', () => {
    expect(isDue(card('a'), TODAY)).toBe(true);
    expect(isDue(card('a', '2026-11-02'), TODAY)).toBe(true);
    expect(isDue(card('a', '2026-10-01'), TODAY)).toBe(true);
    expect(isDue(card('a', '2026-11-03'), TODAY)).toBe(false);
  });
});

describe('dueQueue', () => {
  it('lists due cards oldest first, then at most 20 new cards, skipping the bin', () => {
    const newCards = Array.from({ length: 25 }, (_, i) => card(`n${i}`));
    const sets = [
      set('b', 'B', [card('b1', '2026-11-01')]),
      set('a', 'A', [card('a2', '2026-11-01'), card('a1', '2026-10-30'), ...newCards]),
      set('t', 'Bin', [card('t1', '2026-10-01')], true),
    ];
    const queue = dueQueue(sets, TODAY);
    expect(queue).toHaveLength(23);
    expect(queue.slice(0, 3)).toEqual([
      { setId: 'a', cardId: 'a1' },
      { setId: 'a', cardId: 'a2' },
      { setId: 'b', cardId: 'b1' },
    ]);
    expect(queue.slice(3).map((e) => e.cardId)).toEqual(newCards.slice(0, NEW_CARDS_PER_REVIEW).map((c) => c.id));
    expect(dueCount(sets, TODAY)).toBe(23);
  });
  it('is empty when nothing is due or new', () => {
    const sets = [set('a', 'A', [card('a1', '2026-11-03')])];
    expect(dueQueue(sets, TODAY)).toEqual([]);
    expect(dueCount(sets, TODAY)).toBe(0);
  });
  it('orders sets like the Alphabetically sort', () => {
    const sets = [set('1', 'beta', [card('c1')]), set('2', 'Alpha', [card('c2')]), set('3', '', [card('c3')])];
    const expected = filterAndSortSets(sets, { order: 'Alphabetically' }).map((s) => s.id);
    expect(dueQueue(sets, TODAY).map((e) => e.setId)).toEqual(expected);
  });
});

describe('counts', () => {
  it('caps the queue but not the set counts', () => {
    const s = set('a', 'A', Array.from({ length: 100 }, (_, i) => card(`n${i}`)));
    expect(dueCount([s], TODAY)).toBe(20);
    expect(setDueCounts(s, TODAY)).toEqual({ due: 0, new: 100 });
  });
  it('counts due and new, in the bin too', () => {
    const cards = [card('a', '2026-11-01'), card('b', '2026-11-09'), card('c'), card('d')];
    expect(setDueCounts(set('a', 'A', cards), TODAY)).toEqual({ due: 1, new: 2 });
    expect(setDueCounts(set('a', 'A', cards, true), TODAY)).toEqual({ due: 1, new: 2 });
  });
});
