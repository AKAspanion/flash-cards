import type { RedirectOutcome } from '@/services/firebase';

export const PENDING_DELETE_KEY = 'flashcards.pendingDelete';
export const PENDING_DELETE_MAX_AGE_MS = 300000;

/** Written before the Google reconfirmation redirect, so /profile can tell it was started here. */
export interface PendingDelete {
  uid: string;
  at: number;
}

export function readPendingDelete(storage: Storage): PendingDelete | null {
  try {
    const raw = storage.getItem(PENDING_DELETE_KEY);
    if (!raw) {
      return null;
    }
    const value = JSON.parse(raw) as Partial<PendingDelete> | null;
    if (value && typeof value.uid === 'string' && typeof value.at === 'number' && Number.isFinite(value.at)) {
      return { uid: value.uid, at: value.at };
    }
  } catch {
    // Unreadable or storage blocked: treat as nothing pending.
  }
  return null;
}

export function writePendingDelete(storage: Storage, value: PendingDelete): void {
  try {
    storage.setItem(PENDING_DELETE_KEY, JSON.stringify(value));
  } catch {
    // Without storage the dialog just won't reopen after the redirect.
  }
}

export function clearPendingDelete(storage: Storage): void {
  try {
    storage.removeItem(PENDING_DELETE_KEY);
  } catch {
    // Nothing to clear.
  }
}

/** True only for a fresh reconfirmation, started here, by the same user who is signed in now. */
export function shouldResumeDeletion(
  pending: PendingDelete | null,
  outcome: RedirectOutcome | null,
  uid: string,
  now: number,
): boolean {
  if (!pending || !outcome || 'error' in outcome) {
    return false;
  }
  const age = now - pending.at;
  return (
    outcome.operationType === 'reauthenticate' &&
    outcome.uid === uid &&
    pending.uid === uid &&
    age >= 0 &&
    age <= PENDING_DELETE_MAX_AGE_MS
  );
}
