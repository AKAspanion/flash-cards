import type { CardSet, SetOrder } from '@/types';

export const SET_ORDERS: SetOrder[] = ['Alphabetically', 'New first', 'Old first'];

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
  const search = (filter.search ?? '').trim().toLowerCase();
  const result = sets.filter(
    (set) =>
      !set.trashed &&
      (!filter.labelId || set.labels.includes(filter.labelId)) &&
      (!filter.favOnly || set.fav) &&
      set.title.toLowerCase().includes(search),
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
      default:
        return a.title.localeCompare(b.title);
    }
  });
  return result;
}

export function learnedCount(set: CardSet): number {
  return set.cards.filter((card) => card.learned).length;
}

export function uid(): string {
  return `_${crypto.randomUUID()}`;
}
