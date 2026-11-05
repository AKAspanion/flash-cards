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

export type SetOrder = 'Alphabetically' | 'New first' | 'Old first';
