import { Timestamp, type DocumentData } from 'firebase/firestore';
import type { CardSet, FlashCard, Label } from '@/types';

// Firestore schema is unchanged from the original app so existing data keeps
// working: `cards` is stored as a JSON string and `date` as a Timestamp.

function toDate(value: unknown): Date {
  if (value instanceof Timestamp) {
    return value.toDate();
  }
  if (value && typeof value === 'object' && 'seconds' in value) {
    return new Date((value as { seconds: number }).seconds * 1000);
  }
  if (typeof value === 'string' || typeof value === 'number' || value instanceof Date) {
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) {
      return date;
    }
  }
  return new Date(0);
}

function parseCards(raw: unknown): FlashCard[] {
  let list: unknown = raw;
  if (typeof raw === 'string') {
    try {
      list = JSON.parse(raw);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(list)) {
    return [];
  }
  return list
    .filter((card): card is Record<string, unknown> => !!card && typeof card === 'object')
    .map((card, index) => ({
      // Keep every stored key, including ones a newer version wrote.
      ...card,
      id: typeof card.id === 'string' ? card.id : `card-${index}`,
      front: typeof card.front === 'string' ? card.front : '',
      back: typeof card.back === 'string' ? card.back : '',
      learned: card.learned === true,
      date: typeof card.date === 'string' ? card.date : new Date(0).toISOString(),
    }));
}

function toOptionalDate(value: unknown): Date | undefined {
  const isTimestamp = value instanceof Timestamp;
  const hasSeconds = !!value && typeof value === 'object' && typeof (value as { seconds?: unknown }).seconds === 'number';
  return isTimestamp || hasSeconds ? toDate(value) : undefined;
}

export function cardSetFromDoc(docId: string, data: DocumentData): CardSet {
  const studiedAt = toOptionalDate(data.studiedAt);
  return {
    docId,
    id: typeof data.id === 'string' && data.id ? data.id : docId,
    title: typeof data.title === 'string' ? data.title : '',
    color: typeof data.color === 'string' && data.color ? data.color : '#E91E63',
    date: toDate(data.date),
    trashed: data.trashed === true,
    fav: data.fav === true,
    labels: Array.isArray(data.labels) ? data.labels.filter((l: unknown) => typeof l === 'string') : [],
    cards: parseCards(data.cards),
    ...(studiedAt ? { studiedAt } : {}),
  };
}

export function cardSetToDoc(set: CardSet, uid: string): DocumentData {
  return {
    id: set.id,
    uid,
    title: set.title,
    color: set.color,
    date: Timestamp.fromDate(set.date),
    trashed: set.trashed,
    fav: set.fav,
    labels: set.labels,
    cards: JSON.stringify(set.cards),
    // Firestore rejects undefined values, so the key is written only when set.
    ...(set.studiedAt ? { studiedAt: Timestamp.fromDate(set.studiedAt) } : {}),
  };
}

export function labelFromDoc(docId: string, data: DocumentData): Label {
  return {
    docId,
    label: typeof data.label === 'string' ? data.label : '',
  };
}
