import type { FlashCard } from '@/types';

export interface StudyOptions {
  shuffle: boolean;
  unlearnedOnly: boolean;
}

/** Ids of the cards to study, in order: set order, or a Fisher-Yates shuffle driven by `random`. */
export function buildQueue(
  cards: FlashCard[],
  options: StudyOptions,
  random: () => number = Math.random,
): string[] {
  const ids = cards.filter((c) => !(options.unlearnedOnly && c.learned)).map((c) => c.id);
  if (options.shuffle) {
    for (let i = ids.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [ids[i], ids[j]] = [ids[j], ids[i]];
    }
  }
  return ids;
}

/** Counts over the queued cards only; ids with no matching card are ignored. */
export function summarize(
  cards: FlashCard[],
  queue: string[],
): { known: number; total: number; missed: string[] } {
  const byId = new Map(cards.map((c) => [c.id, c]));
  let known = 0;
  const missed: string[] = [];
  for (const id of queue) {
    const card = byId.get(id);
    if (!card) continue;
    if (card.learned) known++;
    else missed.push(id);
  }
  return { known, total: known + missed.length, missed };
}
