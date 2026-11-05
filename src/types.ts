import type { SrsState } from '@/utils/srs';

export interface FlashCard {
  id: string;
  front: string;
  back: string;
  learned: boolean;
  date: string;
  /** Spaced-repetition state; absent until the card is first rated. */
  srs?: SrsState;
}

/** BCP 47 language tags for reading each side of a card aloud. */
export interface SpeechLanguages {
  front?: string;
  back?: string;
}

export interface CardSet {
  /** Firestore document id; absent until the set has been saved once. */
  docId?: string;
  /** App-level id used in URLs (/:id/edit, /:id/view). */
  id: string;
  title: string;
  color: string;
  date: Date;
  trashed: boolean;
  fav: boolean;
  /** Label docIds. */
  labels: string[];
  cards: FlashCard[];
  /** When a review of this set last saved. */
  studiedAt?: Date;
  /** Read-aloud language per side; a missing side uses the browser default. */
  speech?: SpeechLanguages;
  /** Id of this set's public copy in `shared-sets`; absent when the set isn't shared. */
  shareId?: string;
}

/** A public, read-only copy of a set, as `/s/:shareId` shows it. Carries no progress, labels or profile. */
export interface SharedSet {
  shareId: string;
  title: string;
  color: string;
  cards: FlashCard[];
}

export interface Label {
  docId: string;
  label: string;
}

export interface SessionUser {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
  creationTime: string;
  lastSignInTime: string;
}

export type SetOrder = 'Alphabetically' | 'New first' | 'Old first' | 'Progress' | 'Recently studied';

/** The daily goals a user can pick, in cards reviewed per day. */
export const DAILY_GOALS = [10, 20, 50, 100] as const;
export const DEFAULT_DAILY_GOAL = 20;

/** One user's review history, kept in `user-stats/{uid}`. */
export interface UserStats {
  /** One of DAILY_GOALS; the default when the stored document has none. */
  goal: number;
  /** YYYY-MM-DD (the device local date) to cards reviewed that day. */
  days: Record<string, number>;
}
