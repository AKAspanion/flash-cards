import type { FlashCard } from '@/types';
import { uid } from '@/utils/cardSets';

/** Copies each card whole, unknown fields and `date` included, with a new id, not learned and no `srs`. */
export function duplicateCards(cards: FlashCard[]): FlashCard[] {
  return cards.map((card) => {
    const copy: FlashCard = { ...card, id: uid(), learned: false };
    delete (copy as { srs?: unknown }).srs;
    return copy;
  });
}
