import { describe, expect, it } from 'vitest';
import type { FlashCard } from '@/types';
import { MAX_CARDS_BYTES, cardsByteSize, fitsSizeLimit } from '@/utils/setSize';

const card = (front: string, back = 'b'): FlashCard => ({ id: 'x', front, back, learned: false, date: 'd' });

/** One card whose JSON is exactly `bytes` long (ASCII filler). */
function cardsOfSize(bytes: number): FlashCard[] {
  const base = cardsByteSize([card('')]);
  const cards = [card('a'.repeat(bytes - base))];
  expect(cardsByteSize(cards)).toBe(bytes);
  return cards;
}

describe('set size limit', () => {
  it('accepts exactly 900,000 bytes and refuses one more', () => {
    expect(fitsSizeLimit(cardsOfSize(MAX_CARDS_BYTES))).toBe(true);
    expect(fitsSizeLimit(cardsOfSize(MAX_CARDS_BYTES + 1))).toBe(false);
  });

  it('counts each Devanagari code point as 3 bytes', () => {
    const ascii = cardsByteSize([card('abcdef')]);
    const hindi = cardsByteSize([card('नमस्ते')]);
    expect(hindi - ascii).toBe(12);
  });
});
