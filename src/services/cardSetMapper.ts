import { serverTimestamp, Timestamp, type DocumentData } from 'firebase/firestore';
import type { CardSet, FlashCard, Label, SharedSet } from '@/types';
import { toSpeechLanguages } from '@/utils/speech';

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
  const speech = toSpeechLanguages(data.speech);
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
    ...(speech ? { speech } : {}),
    ...(typeof data.shareId === 'string' ? { shareId: data.shareId } : {}),
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
    // Never an undefined value inside speech either.
    ...(set.speech
      ? {
          speech: {
            ...(set.speech.front !== undefined ? { front: set.speech.front } : {}),
            ...(set.speech.back !== undefined ? { back: set.speech.back } : {}),
          },
        }
      : {}),
    ...(set.shareId !== undefined ? { shareId: set.shareId } : {}),
  };
}

// ---- Shared sets (spec 11) ----
//
// A shared copy is public: anyone with the link reads it. It carries only what 11.3 lists, so
// no progress (`learned`, `srs`), labels, favourites or any field a newer version adds.

/** The rules refuse a longer title (spec 11.8). */
export const SHARED_TITLE_MAX = 200;
const DEFAULT_COLOR = '#E91E63';
const HEX_COLOR = /^#[0-9A-Fa-f]{6}$/;
const SHARE_ID = /^[A-Za-z0-9]{20}$/;

function toSharedColor(value: unknown): string {
  return typeof value === 'string' && HEX_COLOR.test(value) ? value : DEFAULT_COLOR;
}

/**
 * The rules refuse a public copy whose `cards` string is longer (firestore.rules `validShare`). Every
 * card is written unlearned, and `false` is longer than `true`, so a set within the save limit
 * (`MAX_CARDS_BYTES` in src/utils/setSize.ts) can still make a copy over this one.
 */
export const SHARED_CARDS_MAX = 900_000;

/** The public copy's cards: no progress and no other field (spec 11.3). */
function toSharedCards(cards: FlashCard[]): string {
  return JSON.stringify(cards.map(({ id, front, back, date }) => ({ id, front, back, date, learned: false })));
}

/**
 * True when the public copy of these cards is within what the rules accept. A JavaScript length
 * counts UTF-16 units, never fewer than the characters the rules count, so this errs on the safe side.
 */
export function fitsSharedLimit(cards: FlashCard[]): boolean {
  return toSharedCards(cards).length <= SHARED_CARDS_MAX;
}

/** The public copy of a set: exactly `ownerUid`, `title`, `color`, `cards` and `updatedAt`. */
export function toSharedDoc(set: CardSet, uid: string): DocumentData {
  return {
    ownerUid: uid,
    title: set.title.slice(0, SHARED_TITLE_MAX),
    color: toSharedColor(set.color),
    cards: toSharedCards(set.cards),
    updatedAt: serverTimestamp(),
  };
}

/** Reads a stored shared copy, which anyone could have written: every field is checked. */
export function sharedSetFromDoc(shareId: string, data: DocumentData): SharedSet {
  return {
    shareId,
    title: typeof data.title === 'string' ? data.title : '',
    color: toSharedColor(data.color),
    cards: parseCards(data.cards),
  };
}

/** A Firestore auto-id: 20 letters and digits. Anything else never reaches a document path. */
export function isShareId(value: unknown): value is string {
  return typeof value === 'string' && SHARE_ID.test(value);
}

export function labelFromDoc(docId: string, data: DocumentData): Label {
  return {
    docId,
    label: typeof data.label === 'string' ? data.label : '',
  };
}
