import { describe, expect, it } from 'vitest';
import { filterAndSortSets, isSetOrder, learnedCount } from '@/utils/cardSets';
import type { CardSet } from '@/types';

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
