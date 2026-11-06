/**
 * When Home shows the verify-email banner again after Dismiss. The time is kept per user in the browser's
 * localStorage (decisions/email-verification-reminder-only): it only quiets a reminder, so a cleared or blocked
 * storage simply shows the banner again.
 */
export const VERIFY_BANNER_SNOOZE_DAYS = 7;

const DAY_MS = 86_400_000;
const SNOOZE_MS = VERIFY_BANNER_SNOOZE_DAYS * DAY_MS;
const KEY_PREFIX = 'flashcards.verifyBannerDismissedAt.';
// Whole milliseconds since the epoch, as Date.now() writes them; anything else is read as no dismissal.
const STORED_TIME = /^\d{1,15}$/;

/** The localStorage key for one user's dismissal: `flashcards.verifyBannerDismissedAt.<uid>`. */
export function dismissKey(uid: string): string {
  return KEY_PREFIX + uid;
}

/** The dismissal time stored for `uid`, or null when none, unreadable, or storage throws. */
export function readDismissedAt(storage: Storage, uid: string): number | null {
  let raw: string | null;
  try {
    raw = storage.getItem(dismissKey(uid));
  } catch (err) {
    console.warn('Verify banner: the dismissal could not be read', (err as Error)?.name);
    return null;
  }
  return raw !== null && STORED_TIME.test(raw) ? Number(raw) : null;
}

/** Stores `now` as `uid`'s dismissal time; a storage that throws is ignored. */
export function writeDismissedAt(storage: Storage, uid: string, now: number): void {
  try {
    storage.setItem(dismissKey(uid), String(Math.trunc(now)));
  } catch (err) {
    // Without storage the banner stays hidden for this visit only.
    console.warn('Verify banner: the dismissal could not be stored', (err as Error)?.name);
  }
}

/**
 * True while fewer than VERIFY_BANNER_SNOOZE_DAYS days have passed since `dismissedAt`. A time in the future (the
 * clock moved back) snoozes only until 7 days after it.
 */
export function isSnoozed(dismissedAt: number | null, now: number): boolean {
  return dismissedAt !== null && now < dismissedAt + SNOOZE_MS;
}
