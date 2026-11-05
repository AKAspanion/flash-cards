import { afterEach, describe, expect, it } from 'vitest';
import {
  cardMatchCount,
  filterAndSortSets,
  isSetOrder,
  learnedCount,
  learnedPercent,
  randomId,
  titleMatches,
  uid,
} from '@/utils/cardSets';
import type { CardSet } from '@/types';

describe('randomId', () => {
  // Outside a secure context (the app on an http LAN address), crypto.randomUUID is missing.
  function withoutRandomUuid() {
    Object.defineProperty(crypto, 'randomUUID', { value: undefined, configurable: true });
  }
  afterEach(() => {
    delete (crypto as { randomUUID?: unknown }).randomUUID;
  });

  it('makes distinct UUID-shaped ids, with or without crypto.randomUUID', () => {
    const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
    expect(randomId()).toMatch(uuid);
    withoutRandomUuid();
    expect(() => randomId()).not.toThrow();
    const a = randomId();
    expect(a).toMatch(uuid);
    expect(randomId()).not.toBe(a);
    expect(uid()).toMatch(/^_/);
  });
});

function makeSet(partial: Partial<CardSet>): CardSet {
  return {
    id: partial.title ?? 'x',
    title: '',
    color: '#E91E63',
    date: new Date('2020-01-01'),
    trashed: false,
    fav: false,
    labels: [],
    cards: [],
    ...partial,
  };
}

const sets = [
  makeSet({ title: 'banana', date: new Date('2021-01-01'), labels: ['fruit'] }),
  makeSet({ title: 'Apple', date: new Date('2022-01-01'), fav: true, labels: ['fruit'] }),
  makeSet({ title: 'carrot', date: new Date('2020-01-01') }),
  makeSet({ title: 'deleted', trashed: true }),
];
const titles = (list: CardSet[]) => list.map((s) => s.title);

describe('filterAndSortSets', () => {
  it('hides trashed sets and sorts alphabetically by default, ignoring case', () => {
    expect(titles(filterAndSortSets(sets, {}))).toEqual(['Apple', 'banana', 'carrot']);
  });

  it('sorts by date both ways', () => {
    expect(titles(filterAndSortSets(sets, { order: 'New first' }))).toEqual(['Apple', 'banana', 'carrot']);
    expect(titles(filterAndSortSets(sets, { order: 'Old first' }))).toEqual(['carrot', 'banana', 'Apple']);
  });

  it('puts favourites first when asked, keeping the chosen order otherwise', () => {
    expect(titles(filterAndSortSets(sets, { order: 'Old first', favOnTop: true }))).toEqual(['Apple', 'carrot', 'banana']);
  });

  it('filters by search text, label and favourite', () => {
    expect(titles(filterAndSortSets(sets, { search: '  AN ' }))).toEqual(['banana']);
    expect(titles(filterAndSortSets(sets, { labelId: 'fruit' }))).toEqual(['Apple', 'banana']);
    expect(titles(filterAndSortSets(sets, { favOnly: true }))).toEqual(['Apple']);
  });

  it('does not mutate the input array', () => {
    const copy = [...sets];
    filterAndSortSets(sets, { order: 'Old first' });
    expect(sets).toEqual(copy);
  });
});

describe('helpers', () => {
  it('counts learned cards', () => {
    const set = makeSet({
      cards: [
        { id: '1', front: '', back: '', learned: true, date: '' },
        { id: '2', front: '', back: '', learned: false, date: '' },
      ],
    });
    expect(learnedCount(set)).toBe(1);
  });

  it('validates stored order values', () => {
    expect(isSetOrder('New first')).toBe(true);
    expect(isSetOrder('Random')).toBe(false);
    expect(isSetOrder(null)).toBe(false);
  });
});

const card = (front: string, back: string, learned = false) => ({ id: front + back, front, back, learned, date: '' });

describe('card search', () => {
  const spanish = makeSet({ title: 'Spanish', cards: [card('hablar', 'to speak')] });
  const chem = makeSet({ title: 'Chemistry', cards: [card('Fe', 'Iron')] });
  const both = [spanish, chem];

  it('matches titles and card text ignoring case', () => {
    expect(titles(filterAndSortSets(both, { search: 'SPEAK' }))).toEqual(['Spanish']);
    expect(titles(filterAndSortSets(both, { search: 'iron' }))).toEqual(['Chemistry']);
    expect(titles(filterAndSortSets(both, { search: 'chem' }))).toEqual(['Chemistry']);
    expect(titles(filterAndSortSets(both, { search: '  speak  ' }))).toEqual(['Spanish']);
  });

  it('keeps every live set for an empty search and never a binned one', () => {
    const binned = makeSet({ title: 'Binned', trashed: true, cards: [card('speak', 'x')] });
    expect(titles(filterAndSortSets([...both, binned], { search: '' }))).toEqual(['Chemistry', 'Spanish']);
    expect(titles(filterAndSortSets([...both, binned], { search: 'speak' }))).toEqual(['Spanish']);
  });

  it('exposes titleMatches and cardMatchCount', () => {
    expect(titleMatches(spanish, ' SPAN ')).toBe(true);
    expect(titleMatches(spanish, 'speak')).toBe(false);
    expect(titleMatches(spanish, '')).toBe(true);
    const set = makeSet({ cards: [card('a', 'b'), card('x', 'A'), card('x', 'y'), card('a', 'a')] });
    expect(cardMatchCount(set, 'a')).toBe(3);
    expect(cardMatchCount(makeSet({ cards: [card('a', 'b'), card('x', 'A'), card('x', 'y')] }), 'a')).toBe(2);
    expect(cardMatchCount(set, '  ')).toBe(0);
  });
});

describe('new orders', () => {
  const half = makeSet({ title: 'Aaa', cards: [card('a', 'b', true), card('c', 'd')] });
  const beta = makeSet({ title: 'Beta', cards: [card('a', 'b')] });
  const alpha = makeSet({ title: 'Alpha', cards: [card('a', 'b')] });
  const empty = makeSet({ title: 'Empty' });

  it('computes learned percent, 0 for no cards', () => {
    expect(learnedPercent(half)).toBe(50);
    expect(learnedPercent(empty)).toBe(0);
  });

  it('orders by least learned, ties by title', () => {
    expect(titles(filterAndSortSets([half, beta, alpha, empty], { order: 'Progress' }))).toEqual(['Alpha', 'Beta', 'Empty', 'Aaa']);
  });

  const nov = makeSet({ title: 'Nov', studiedAt: new Date('2026-11-01') });
  const oct = makeSet({ title: 'Oct', studiedAt: new Date('2026-10-01') });
  const zed = makeSet({ title: 'Zed' });
  const abc = makeSet({ title: 'Abc' });

  it('orders by recent study, never-studied last by title', () => {
    expect(titles(filterAndSortSets([oct, zed, nov, abc], { order: 'Recently studied' }))).toEqual(['Nov', 'Oct', 'Abc', 'Zed']);
  });

  it('keeps favourites first with the new orders', () => {
    const favZed = { ...zed, fav: true };
    expect(titles(filterAndSortSets([oct, favZed, nov, abc], { order: 'Recently studied', favOnTop: true }))).toEqual(['Zed', 'Nov', 'Oct', 'Abc']);
    const favHalf = { ...half, fav: true };
    expect(titles(filterAndSortSets([favHalf, beta, alpha], { order: 'Progress', favOnTop: true }))).toEqual(['Aaa', 'Alpha', 'Beta']);
  });

  it('recognises the new stored values', () => {
    expect(isSetOrder('Progress')).toBe(true);
    expect(isSetOrder('Recently studied')).toBe(true);
    expect(isSetOrder('Newest')).toBe(false);
  });
});
