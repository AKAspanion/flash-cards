export const PENDING_SNACK_KEY = 'flashcards.pendingSnack';

/**
 * Loads `path` as a new page, so the app starts over with a fresh Firestore (a terminated one can't
 * be used again). `snack`, when given, is shown once the new page is up.
 */
export function loadFresh(
  path: string,
  snack?: string,
  storage: Storage = sessionStorage,
  location: Pick<Location, 'assign'> = window.location,
): void {
  try {
    if (snack) {
      storage.setItem(PENDING_SNACK_KEY, snack);
    } else {
      storage.removeItem(PENDING_SNACK_KEY);
    }
  } catch {
    // Storage blocked: the new page just shows no snack.
    console.warn('Could not keep the snack for the next page: storage is blocked');
  }
  location.assign(path);
}

/** Reads the snack a fresh load left behind, once: it is removed as it is read. */
export function takePendingSnack(storage: Storage): string | null {
  try {
    const text = storage.getItem(PENDING_SNACK_KEY);
    if (text !== null) {
      storage.removeItem(PENDING_SNACK_KEY);
    }
    return text || null;
  } catch {
    // Storage blocked: there is nothing to show.
    return null;
  }
}
