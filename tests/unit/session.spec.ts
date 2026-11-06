import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import type { User } from 'firebase/auth';

vi.mock('@/services/firebase', () => ({ getRedirectOutcome: vi.fn() }));

const { useSessionStore, toSessionUser } = await import('@/stores/session');
const { PENDING_SNACK_KEY } = await import('@/utils/freshLoad');

const OFFLINE_SAVED = "Saved on this device. It will sync when you're back online.";

/** A connectivity change as App.vue reports it; the session store's sync watcher reacts to each one. */
function setOnline(value: boolean) {
  useSessionStore().online = value;
}

describe('session store: notifyOfflineSave', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('shows the offline-saved snack on the first offline save', () => {
    const session = useSessionStore();
    session.online = false;
    session.notifyOfflineSave();
    expect(session.snack.show).toBe(true);
    expect(session.snack.text).toBe(OFFLINE_SAVED);
  });

  it('shows it once per offline period', () => {
    const session = useSessionStore();
    session.online = false;
    session.notifyOfflineSave();
    session.snack.show = false;
    session.notifyOfflineSave();
    expect(session.snack.show).toBe(false);
  });

  it('shows it again after the app has been back online', () => {
    const session = useSessionStore();
    session.online = false;
    session.notifyOfflineSave();
    session.snack.show = false;

    // Back online, then offline again: going online ends the offline period.
    setOnline(true);
    setOnline(false);
    session.notifyOfflineSave();
    expect(session.snack.show).toBe(true);
    expect(session.snack.text).toBe(OFFLINE_SAVED);
  });
});

describe('session store: a snack left by a fresh page load', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    sessionStorage.clear();
  });

  it('shows it when the store starts, once', () => {
    sessionStorage.setItem(PENDING_SNACK_KEY, 'Your account has been deleted.');
    const session = useSessionStore();
    expect(session.snack.show).toBe(true);
    expect(session.snack.text).toBe('Your account has been deleted.');

    setActivePinia(createPinia());
    expect(useSessionStore().snack.show).toBe(false);
  });

  it('shows nothing when none was left', () => {
    expect(useSessionStore().snack.show).toBe(false);
  });
});

describe('toSessionUser', () => {
  function firebaseUser(emailVerified: boolean) {
    return {
      uid: 'u1',
      email: 'a@b.test',
      displayName: null,
      photoURL: null,
      emailVerified,
      metadata: { creationTime: 'then', lastSignInTime: 'now' },
    } as unknown as User;
  }

  it('carries a verified email across', () => {
    expect(toSessionUser(firebaseUser(true)).emailVerified).toBe(true);
  });

  it('carries an unverified email across', () => {
    expect(toSessionUser(firebaseUser(false)).emailVerified).toBe(false);
  });
});
