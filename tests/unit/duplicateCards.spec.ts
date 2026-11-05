import { describe, expect, it } from 'vitest';
import type { FlashCard } from '@/types';
import { duplicateCards } from '@/utils/duplicateCards';

describe('duplicateCards', () => {
  it('keeps every field and the date, with a new id, learned false and no srs', () => {
    const card = {
      id: 'a',
      front: 'f',
      back: 'b',
      learned: true,
      date: '2026-01-01T00:00:00.000Z',
      srs: { due: 1 },
      note: 'x',
    } as unknown as FlashCard;
    const [copy] = duplicateCards([card]);
    expect(copy).toMatchObject({ front: 'f', back: 'b', date: card.date, note: 'x', learned: false });
    expect(copy.id).not.toBe('a');
    expect('srs' in copy).toBe(false);
    expect(card.learned).toBe(true);
  });
});
