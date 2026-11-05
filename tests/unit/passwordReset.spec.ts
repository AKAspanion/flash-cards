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
});
