import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Each mocked Firebase call records its name, so the tests can check the order they ran in.
const calls = vi.hoisted(() => [] as string[]);
const fb = vi.hoisted(() => {
  const record = (name: string) =>
    vi.fn(async () => {
      calls.push(name);
    });
  return {
    waitForPendingWrites: record('waitForPendingWrites'),
    terminate: record('terminate'),
    clearIndexedDbPersistence: record('clearIndexedDbPersistence'),
    signOut: record('signOut'),
    deleteUser: record('deleteUser'),
    getDocs: vi.fn(async () => ({ docs: [] })),
    user: { uid: 'u1', providerData: [] },
  };
});

vi.mock('firebase/app', () => ({ initializeApp: vi.fn(() => ({})) }));
vi.mock('firebase/auth', () => ({
  getAuth: vi.fn(() => ({ currentUser: fb.user })),
  connectAuthEmulator: vi.fn(),
  signOut: fb.signOut,
  deleteUser: fb.deleteUser,
}));
vi.mock('firebase/firestore', () => ({
  initializeFirestore: vi.fn(() => ({ name: 'db' })),
  connectFirestoreEmulator: vi.fn(),
  memoryLocalCache: vi.fn(),
  persistentLocalCache: vi.fn(),
  persistentMultipleTabManager: vi.fn(),
  collection: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  writeBatch: vi.fn(),
  getDocs: fb.getDocs,
  waitForPendingWrites: fb.waitForPendingWrites,
  terminate: fb.terminate,
  clearIndexedDbPersistence: fb.clearIndexedDbPersistence,
}));

vi.stubEnv('VUE_APP_USE_EMULATORS', 'false');
vi.stubEnv('VUE_APP_API_KEY', 'test-key');
vi.stubEnv('VUE_APP_AUTH_DOMAIN', 'test.firebaseapp.com');
vi.stubEnv('VUE_APP_PROJECT_ID', 'test-project');
vi.stubEnv('VUE_APP_APP_ID', 'test-app');

const firebaseService = await import('@/services/firebase');
const { signOutAndClear, deleteAccount, SIGN_OUT_DEADLINE_MS } = firebaseService;

describe('the firebase service', () => {
  it('offers no way to sign out that leaves the cache behind', () => {
    expect(firebaseService).not.toHaveProperty('signOut');
  });
});

function failing(name: string, error: Error) {
  return async () => {
    calls.push(name);
    throw error;
  };
}

beforeEach(() => {
  calls.length = 0;
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  for (const name of ['waitForPendingWrites', 'terminate', 'clearIndexedDbPersistence', 'signOut', 'deleteUser'] as const) {
    fb[name].mockImplementation(async () => {
      calls.push(name);
    });
  }
});

describe('signOutAndClear', () => {
  it('waits for pending writes, terminates Firestore, clears its cache, then signs out', async () => {
    await signOutAndClear();
    expect(calls).toEqual(['waitForPendingWrites', 'terminate', 'clearIndexedDbPersistence', 'signOut']);
  });

  it('still signs out when clearing the cache fails, and rejects with that error', async () => {
    const error = new Error('cache in use');
    fb.clearIndexedDbPersistence.mockImplementation(failing('clearIndexedDbPersistence', error));

    await expect(signOutAndClear()).rejects.toBe(error);
    expect(calls).toEqual(['waitForPendingWrites', 'terminate', 'clearIndexedDbPersistence', 'signOut']);
  });

  it('still signs out when terminating fails, and rejects with that error', async () => {
    const error = new Error('terminate failed');
    fb.terminate.mockImplementation(failing('terminate', error));

    await expect(signOutAndClear()).rejects.toBe(error);
    expect(calls).toContain('signOut');
  });

  it('gives up at the deadline when pending writes never settle: nothing is cleared and the user stays signed in', async () => {
    vi.useFakeTimers();
    let settle!: () => void;
    fb.waitForPendingWrites.mockImplementation(() => {
      calls.push('waitForPendingWrites');
      return new Promise<void>((resolve) => (settle = resolve));
    });

    let outcome: unknown = 'still waiting';
    signOutAndClear().then(
      () => (outcome = 'signed out'),
      (err) => (outcome = err),
    );
    await vi.advanceTimersByTimeAsync(SIGN_OUT_DEADLINE_MS);
    expect(outcome).toMatchObject({ code: 'deadline-exceeded' });
    settle();
    await vi.advanceTimersByTimeAsync(0);
    expect(calls).toEqual(['waitForPendingWrites']);
  });

  it('waits for pending writes up to the deadline', async () => {
    vi.useFakeTimers();
    let settle!: () => void;
    fb.waitForPendingWrites.mockImplementation(() => {
      calls.push('waitForPendingWrites');
      return new Promise<void>((resolve) => (settle = resolve));
    });

    const signingOut = signOutAndClear();
    await vi.advanceTimersByTimeAsync(SIGN_OUT_DEADLINE_MS - 1);
    settle();
    await signingOut;
    expect(calls).toEqual(['waitForPendingWrites', 'terminate', 'clearIndexedDbPersistence', 'signOut']);
  });

  it('terminates, clears and signs out nothing when pending writes fail, and rejects', async () => {
    const error = new Error('user changed');
    fb.waitForPendingWrites.mockImplementation(failing('waitForPendingWrites', error));

    await expect(signOutAndClear()).rejects.toBe(error);
    expect(calls).toEqual(['waitForPendingWrites']);
  });
});

describe('deleteAccount', () => {
  it('clears the cache once the account is gone', async () => {
    await deleteAccount();
    expect(calls).toEqual(['deleteUser', 'terminate', 'clearIndexedDbPersistence']);
  });

  it('leaves the cache alone when the account could not be deleted', async () => {
    const error = new Error('requires-recent-login');
    fb.deleteUser.mockImplementation(failing('deleteUser', error));

    await expect(deleteAccount()).rejects.toBe(error);
    expect(calls).toEqual(['deleteUser']);
  });

  it('resolves when clearing the cache fails after the account is gone, and logs it', async () => {
    const error = new Error('cache in use');
    fb.clearIndexedDbPersistence.mockImplementation(failing('clearIndexedDbPersistence', error));
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});

    await expect(deleteAccount()).resolves.toBeUndefined();
    expect(calls).toEqual(['deleteUser', 'terminate', 'clearIndexedDbPersistence']);
    expect(log).toHaveBeenCalledOnce();
  });
});
