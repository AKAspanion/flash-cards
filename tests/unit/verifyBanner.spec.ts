import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  VERIFY_BANNER_SNOOZE_DAYS,
  dismissKey,
  isSnoozed,
  readDismissedAt,
  writeDismissedAt,
} from '@/utils/verifyBanner';

const DAY = 86_400_000;
const HOUR = 3_600_000;
const now = 1_800_000_000_000;

/** A Storage whose every call throws, as a browser with site data blocked does. */
function blockedStorage(): Storage {
  const fail = () => {
    throw new DOMException('blocked', 'SecurityError');
  };
  return { getItem: fail, setItem: fail, removeItem: fail, clear: fail, key: fail, length: 0 } as unknown as Storage;
}

describe('isSnoozed', () => {
  it('waits 7 days', () => {
    expect(VERIFY_BANNER_SNOOZE_DAYS).toBe(7);
  });

  it('is false with no dismissal', () => {
    expect(isSnoozed(null, now)).toBe(false);
  });

  it('is true 6 days 23 hours after the dismissal', () => {
    expect(isSnoozed(now - 6 * DAY - 23 * HOUR, now)).toBe(true);
  });

  it('is false exactly 7 days after the dismissal', () => {
    expect(isSnoozed(now - 7 * DAY, now)).toBe(false);
  });

  it('for a dismissal in the future (clock moved back), is true only until 7 days after it', () => {
    const later = now + DAY;
    expect(isSnoozed(later, now)).toBe(true);
    expect(isSnoozed(later, later + 7 * DAY - 1)).toBe(true);
    expect(isSnoozed(later, later + 7 * DAY)).toBe(false);
  });
});

describe('dismissal storage', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => vi.restoreAllMocks());

  it('keys each user separately', () => {
    expect(dismissKey('u1')).toBe('flashcards.verifyBannerDismissedAt.u1');
    expect(dismissKey('u2')).not.toBe(dismissKey('u1'));
  });

  it('round-trips a dismissal for one user only', () => {
    writeDismissedAt(localStorage, 'u1', now);
    expect(localStorage.getItem('flashcards.verifyBannerDismissedAt.u1')).toBe(String(now));
    expect(readDismissedAt(localStorage, 'u1')).toBe(now);
    expect(readDismissedAt(localStorage, 'u2')).toBeNull();
  });

  it('reads a missing key as no dismissal', () => {
    expect(readDismissedAt(localStorage, 'u1')).toBeNull();
  });

  it.each(['not a number', '', 'NaN', 'Infinity', '{"at":1}'])('reads %j as no dismissal', (raw) => {
    localStorage.setItem(dismissKey('u1'), raw);
    expect(readDismissedAt(localStorage, 'u1')).toBeNull();
  });

  it('reads a storage that throws as no dismissal, and logs it', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(readDismissedAt(blockedStorage(), 'u1')).toBeNull();
    expect(warn).toHaveBeenCalledOnce();
  });

  it('ignores a storage that throws on write, and logs it', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(() => writeDismissedAt(blockedStorage(), 'u1', now)).not.toThrow();
    expect(warn).toHaveBeenCalledOnce();
  });
});
