import type { CardSet, FlashCard } from '@/types';
import { addDays } from '@/utils/dates';

export type Rating = 'again' | 'hard' | 'good' | 'easy';
export interface SrsState {
  due: string;
  interval: number;
  ease: number;
  reps: number;
  lapses: number;
}
export const NEW_CARDS_PER_REVIEW = 20;
export interface DueEntry {
  setId: string;
  cardId: string;
}

const MIN_EASE = 1.3;
const START: SrsState = { due: '', interval: 0, ease: 2.5, reps: 0, lapses: 0 };

const roundEase = (ease: number): number => Math.max(MIN_EASE, Math.round(ease * 100) / 100);

/** The next state of a card after a rating (SM-2 variant). */
export function schedule(srs: SrsState | undefined, rating: Rating, today: string): SrsState {
  const { interval, ease, reps, lapses } = srs ?? START;
  const good = reps === 0 ? 1 : reps === 1 ? 3 : Math.round(interval * ease);
  let next: Omit<SrsState, 'due'>;
  switch (rating) {
    case 'again':
      next = { interval: 0, ease: roundEase(ease - 0.2), reps: 0, lapses: lapses + 1 };
      break;
    case 'hard':
      next = { interval: Math.max(1, Math.round(interval * 1.2)), ease: roundEase(ease - 0.15), reps: reps + 1, lapses };
      break;
    case 'good':
      next = { interval: good, ease: roundEase(ease), reps: reps + 1, lapses };
      break;
    case 'easy':
      next = { interval: Math.max(4, Math.round(good * 1.3)), ease: roundEase(ease + 0.15), reps: reps + 1, lapses };
      break;
  }
  return { due: addDays(today, next.interval), ...next };
}

/** A card is due when it is new or its due date is today or earlier. */
export function isDue(card: FlashCard, today: string): boolean {
  return !card.srs || card.srs.due <= today;
}

/** The review queue: due started cards (oldest first), then up to NEW_CARDS_PER_REVIEW new cards; bin sets skipped. */
export function dueQueue(sets: CardSet[], today: string): DueEntry[] {
  const ordered = sets.filter((s) => !s.trashed).sort((a, b) => a.title.localeCompare(b.title));
  const started: (DueEntry & { due: string })[] = [];
  const fresh: DueEntry[] = [];
  for (const set of ordered) {
    for (const card of set.cards) {
      if (!card.srs) {
        fresh.push({ setId: set.id, cardId: card.id });
      } else if (card.srs.due <= today) {
        started.push({ setId: set.id, cardId: card.id, due: card.srs.due });
      }
    }
  }
  // Array.prototype.sort is stable, so equal dates keep set and card order.
  started.sort((a, b) => (a.due < b.due ? -1 : a.due > b.due ? 1 : 0));
  return [
    ...started.map(({ setId, cardId }) => ({ setId, cardId })),
    ...fresh.slice(0, NEW_CARDS_PER_REVIEW),
  ];
}

export function dueCount(sets: CardSet[], today: string): number {
  return dueQueue(sets, today).length;
}

/** Whole-set counts for the Home card: started cards due, and cards never studied. */
export function setDueCounts(set: CardSet, today: string): { due: number; new: number } {
  let due = 0;
  let fresh = 0;
  for (const card of set.cards) {
    if (!card.srs) fresh++;
    else if (card.srs.due <= today) due++;
  }
  return { due, new: fresh };
}
