import { beforeEach, describe, expect, it, vi } from 'vitest';

const fb = vi.hoisted(() => ({
  auth: { name: 'auth', currentUser: null },
  sendPasswordResetEmail: vi.fn(async () => {}),
}));

vi.mock('firebase/app', () => ({ initializeApp: vi.fn(() => ({})) }));
vi.mock('firebase/auth', () => ({
  getAuth: vi.fn(() => fb.auth),
  connectAuthEmulator: vi.fn(),
  sendPasswordResetEmail: fb.sendPasswordResetEmail,
}));
vi.mock('firebase/firestore', () => ({
  initializeFirestore: vi.fn(() => ({ name: 'db' })),
  connectFirestoreEmulator: vi.fn(),
  memoryLocalCache: vi.fn(),
  persistentLocalCache: vi.fn(),
  persistentMultipleTabManager: vi.fn(),
}));

vi.stubEnv('VUE_APP_USE_EMULATORS', 'false');
vi.stubEnv('VUE_APP_API_KEY', 'test-key');
vi.stubEnv('VUE_APP_AUTH_DOMAIN', 'test.firebaseapp.com');
vi.stubEnv('VUE_APP_PROJECT_ID', 'test-project');
vi.stubEnv('VUE_APP_APP_ID', 'test-app');

const { sendPasswordReset } = await import('@/services/firebase');

beforeEach(() => {
  fb.sendPasswordResetEmail.mockReset();
  fb.sendPasswordResetEmail.mockResolvedValue(undefined);
});

describe('sendPasswordReset', () => {
  it('sends the trimmed address, with the login page as the continue URL', async () => {
    await sendPasswordReset(' user@example.test ');

    expect(fb.sendPasswordResetEmail).toHaveBeenCalledTimes(1);
    expect(fb.sendPasswordResetEmail).toHaveBeenCalledWith(fb.auth, 'user@example.test', {
      url: `${window.location.origin}/login`,
    });
  });

  it('resolves to undefined when Firebase sends the email', async () => {
    await expect(sendPasswordReset('user@example.test')).resolves.toBeUndefined();
    expect(fb.sendPasswordResetEmail).toHaveBeenCalled();
  });

  it('resolves for an address with no account, exactly as for a registered one', async () => {
    fb.sendPasswordResetEmail.mockRejectedValue({ code: 'auth/user-not-found' });

    await expect(sendPasswordReset('nobody@example.test')).resolves.toBeUndefined();
    expect(fb.sendPasswordResetEmail).toHaveBeenCalled();
  });

  it('resolves for a disabled account, an answer only a registered address could produce', async () => {
    fb.sendPasswordResetEmail.mockRejectedValue({ code: 'auth/user-disabled' });

    await expect(sendPasswordReset('disabled@example.test')).resolves.toBeUndefined();
    expect(fb.sendPasswordResetEmail).toHaveBeenCalled();
  });

  it.each(['auth/invalid-email','auth/network-request-failed', 'auth/too-many-requests'])(
    'rejects with the same error for %s',
    async (code) => {
      const error = { code };
      fb.sendPasswordResetEmail.mockRejectedValue(error);

      await expect(sendPasswordReset('user@example.test')).rejects.toBe(error);
    },
  );

  it.each(['auth/user-not-found', 'auth/user-disabled'])(
    'sends once, without retrying, when the first attempt is rejected with %s',
    async (code) => {
      fb.sendPasswordResetEmail.mockRejectedValue({ code });

      await expect(sendPasswordReset('a@b.test')).resolves.toBeUndefined();
      expect(fb.sendPasswordResetEmail).toHaveBeenCalledTimes(1);
    },
  );

  it('rejects with too-many-requests without retrying', async () => {
    const error = { code: 'auth/too-many-requests' };
    fb.sendPasswordResetEmail.mockRejectedValue(error);

    await expect(sendPasswordReset('a@b.test')).rejects.toBe(error);
    expect(fb.sendPasswordResetEmail).toHaveBeenCalledTimes(1);
  });
});

describe('sendPasswordReset when Firebase refuses the continue link', () => {
  it.each(['auth/unauthorized-continue-uri', 'auth/invalid-continue-uri'])(
    'retries once without the continue link after %s, and resolves when that send succeeds',
    async (code) => {
      fb.sendPasswordResetEmail.mockRejectedValueOnce({ code }).mockResolvedValueOnce(undefined);

      await expect(sendPasswordReset(' a@b.test ')).resolves.toBeUndefined();

      expect(fb.sendPasswordResetEmail).toHaveBeenCalledTimes(2);
      expect(fb.sendPasswordResetEmail).toHaveBeenNthCalledWith(1, fb.auth, 'a@b.test', {
        url: `${window.location.origin}/login`,
      });
      expect(fb.sendPasswordResetEmail.mock.calls[1]).toEqual([fb.auth, 'a@b.test']);
    },
  );

  it('rejects with the retry error when the send without the link is refused too, retrying only once', async () => {
    const retryError = { code: 'auth/unauthorized-continue-uri' };
    fb.sendPasswordResetEmail.mockRejectedValueOnce({ code: 'auth/unauthorized-continue-uri' }).mockRejectedValueOnce(retryError);

    await expect(sendPasswordReset('a@b.test')).rejects.toBe(retryError);
    expect(fb.sendPasswordResetEmail).toHaveBeenCalledTimes(2);
  });

  it.each(['auth/user-not-found', 'auth/user-disabled'])(
    'resolves and logs nothing when the retry is rejected with %s',
    async (code) => {
      fb.sendPasswordResetEmail
        .mockRejectedValueOnce({ code: 'auth/unauthorized-continue-uri' })
        .mockRejectedValueOnce({ code });
      const logs = (['error', 'warn', 'info', 'log', 'debug'] as const).map((level) =>
        vi.spyOn(console, level).mockImplementation(() => {}),
      );

      try {
        await expect(sendPasswordReset('a@b.test')).resolves.toBeUndefined();
        expect(fb.sendPasswordResetEmail).toHaveBeenCalledTimes(2);
        for (const log of logs) {
          expect(log).not.toHaveBeenCalled();
        }
      } finally {
        logs.forEach((log) => log.mockRestore());
      }
    },
  );
});
