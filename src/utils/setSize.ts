import type { FlashCard } from '@/types';

/** Firestore documents max out at 1 MiB; this leaves room for the rest of the set document. */
export const MAX_CARDS_BYTES = 900_000;

/** UTF-8 bytes of the cards as they are stored. */
export function cardsByteSize(cards: FlashCard[]): number {
  return new TextEncoder().encode(JSON.stringify(cards)).length;
}

export function fitsSizeLimit(cards: FlashCard[]): boolean {
  return cardsByteSize(cards) <= MAX_CARDS_BYTES;
}
