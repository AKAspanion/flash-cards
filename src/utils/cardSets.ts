import type { CardSet, SetOrder } from '@/types';

export const SET_ORDERS: SetOrder[] = ['Alphabetically', 'New first', 'Old first', 'Progress', 'Recently studied'];

export function isSetOrder(value: unknown): value is SetOrder {
  return SET_ORDERS.includes(value as SetOrder);
}

export interface SetFilter {
  search?: string;
  labelId?: string | null;
  favOnly?: boolean;
  order?: SetOrder;
  favOnTop?: boolean;
}

/** Visible (non-trashed) sets after search, label and favourite filters, sorted. */
export function filterAndSortSets(sets: CardSet[], filter: SetFilter): CardSet[] {
  const search = filter.search ?? '';
  const result = sets.filter(
    (set) =>
      !set.trashed &&
      (!filter.labelId || set.labels.includes(filter.labelId)) &&
      (!filter.favOnly || set.fav) &&
      (titleMatches(set, search) || cardMatchCount(set, search) > 0),
  );

  const order = filter.order ?? 'Alphabetically';
  result.sort((a, b) => {
    if (filter.favOnTop && a.fav !== b.fav) {
      return a.fav ? -1 : 1;
    }
    switch (order) {
      case 'New first':
        return b.date.getTime() - a.date.getTime();
      case 'Old first':
        return a.date.getTime() - b.date.getTime();
      case 'Progress':
        return learnedPercent(a) - learnedPercent(b) || a.title.localeCompare(b.title);
      case 'Recently studied': {
        const at = a.studiedAt?.getTime();
        const bt = b.studiedAt?.getTime();
        if (at !== undefined && bt !== undefined) return bt - at || a.title.localeCompare(b.title);
        if (at !== undefined) return -1;
        if (bt !== undefined) return 1;
        return a.title.localeCompare(b.title);
      }
      default:
        return a.title.localeCompare(b.title);
    }
  });
  return result;
}

function normalise(text: string): string {
  return text.trim().toLocaleLowerCase();
}

/** True when the set's title contains the search text; an empty search matches every set. */
export function titleMatches(set: CardSet, search: string): boolean {
  return set.title.toLocaleLowerCase().includes(normalise(search));
}

/** How many cards have the search text in their front or back; 0 for an empty search. */
export function cardMatchCount(set: CardSet, search: string): number {
  const needle = normalise(search);
  if (!needle) return 0;
  return set.cards.filter(
    (card) => card.front.toLocaleLowerCase().includes(needle) || card.back.toLocaleLowerCase().includes(needle),
  ).length;
}

export function learnedPercent(set: CardSet): number {
  return set.cards.length ? (learnedCount(set) / set.cards.length) * 100 : 0;
}

export function learnedCount(set: CardSet): number {
  return set.cards.filter((card) => card.learned).length;
}

export function uid(): string {
  return `_${crypto.randomUUID()}`;
}
