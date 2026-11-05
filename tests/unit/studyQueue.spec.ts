import { describe, expect, it } from 'vitest';
import { buildQueue, summarize } from '@/utils/studyQueue';
import type { FlashCard } from '@/types';

const card = (id: string, learned: boolean): FlashCard => ({
  id,
  front: id,
  back: id,
  learned,
  date: '2026-01-01',
});
const cards = [card('a', true), card('b', false), card('c', true), card('d', false)];

describe('buildQueue', () => {
  it('keeps set order by default', () => {
    expect(buildQueue(cards, { shuffle: false, unlearnedOnly: false })).toEqual(['a', 'b', 'c', 'd']);
  });

  it('drops learned cards when unlearnedOnly', () => {
    expect(buildQueue(cards, { shuffle: false, unlearnedOnly: true })).toEqual(['b', 'd']);
  });

  it('shuffles deterministically for a fixed random', () => {
    const opts = { shuffle: true, unlearnedOnly: false };
    const first = buildQueue(cards, opts, () => 0);
    expect([...first].sort()).toEqual(['a', 'b', 'c', 'd']);
    expect(first).not.toEqual(['a', 'b', 'c', 'd']);
    expect(buildQueue(cards, opts, () => 0)).toEqual(first);
  });

  it('does not mutate the input', () => {
    const copy = [...cards];
    buildQueue(cards, { shuffle: true, unlearnedOnly: false }, () => 0);
    expect(cards).toEqual(copy);
  });

  it('returns [] when every card is learned and unlearnedOnly', () => {
    const all = [card('a', true), card('b', true)];
    expect(buildQueue(all, { shuffle: false, unlearnedOnly: true })).toEqual([]);
  });

  it('returns [] for no cards', () => {
    expect(buildQueue([], { shuffle: true, unlearnedOnly: true })).toEqual([]);
    expect(summarize([], [])).toEqual({ known: 0, total: 0, missed: [] });
  });
});

describe('summarize', () => {
  it('counts known and missed in queue order', () => {
    const three = [card('a', true), card('b', false), card('c', false)];
    expect(summarize(three, ['c', 'a', 'b'])).toEqual({ known: 1, total: 3, missed: ['c', 'b'] });
  });

  it('ignores ids with no card', () => {
    const r = summarize([card('a', true)], ['a', 'zzz']);
    expect(r.total).toBe(1);
    expect(r.known).toBe(1);
  });
});
