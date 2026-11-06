import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Each mocked Firebase call records its name, so the tests can check what ran and in what order.
const calls = vi.hoisted(() => [] as string[]);
const fb = vi.hoisted(() => {
  const auth: { currentUser: unknown; languageCode: string | null } = { currentUser: null, languageCode: null };
  return {
    auth,
    createUserWithEmailAndPassword: vi.fn(),
    sendEmailVerification: vi.fn(),
  };
});

vi.mock('firebase/app', () => ({ initializeApp: vi.fn(() => ({})) }));
vi.mock('firebase/auth', () => ({
  getAuth: vi.fn(() => fb.auth),
  connectAuthEmulator: vi.fn(),
  createUserWithEmailAndPassword: fb.createUserWithEmailAndPassword,
  sendEmailVerification: fb.sendEmailVerification,
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

const { signUpWithEmail, sendVerificationEmail, reloadEmailVerified, setAuthLanguage, FirebaseConfigError } = await import(
  '@/services/firebase'
);

/** Firebase's page continues to the home screen on the page's own origin, an authorised domain. */
const CONTINUE = { url: `${window.location.origin}/home` };

/** A signed-in Firebase user whose reload() comes back with `verifiedAfterReload`. */
function fakeUser(verifiedAfterReload: boolean) {
  const user = {
    uid: 'u1',
    emailVerified: false,
    reload: vi.fn(async () => {
      calls.push('reload');
      user.emailVerified = verifiedAfterReload;
    }),
    getIdToken: vi.fn(async (force?: boolean) => {
      calls.push(`getIdToken(${force})`);
      return 'token';
    }),
  };
  return user;
}

function authError(code: string) {
  return Object.assign(new Error(`Firebase: Error (${code}).`), { code });
}

beforeEach(() => {
  calls.length = 0;
  fb.auth.currentUser = null;
  fb.auth.languageCode = null;
  fb.createUserWithEmailAndPassword.mockReset();
  fb.sendEmailVerification.mockReset();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('signUpWithEmail', () => {
  it('creates the account with the trimmed email, sends the verification email to the new user, and says it was sent', async () => {
    const user = fakeUser(false);
    fb.createUserWithEmailAndPassword.mockResolvedValue({ user });
    fb.sendEmailVerification.mockResolvedValue(undefined);

    await expect(signUpWithEmail(' a@b.test ', 'secret1')).resolves.toEqual({ verificationSent: true });

    expect(fb.createUserWithEmailAndPassword).toHaveBeenCalledWith(fb.auth, 'a@b.test', 'secret1');
    expect(fb.sendEmailVerification).toHaveBeenCalledOnce();
    expect(fb.sendEmailVerification).toHaveBeenCalledWith(user, CONTINUE);
  });

  it('still resolves when the email fails to send, says it was not sent, and logs the cause', async () => {
    const user = fakeUser(false);
    fb.createUserWithEmailAndPassword.mockResolvedValue({ user });
    fb.sendEmailVerification.mockRejectedValue(authError('auth/too-many-requests'));
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});

    await expect(signUpWithEmail('a@b.test', 'secret1')).resolves.toEqual({ verificationSent: false });

    expect(fb.sendEmailVerification).toHaveBeenCalledWith(user, CONTINUE);

    expect(log).toHaveBeenCalledOnce();
    expect(log.mock.calls[0].join(' ')).toContain('auth/too-many-requests');
    // The log carries the cause, never the address.
    expect(log.mock.calls[0].join(' ')).not.toContain('a@b.test');
  });

  it('says it was not sent when the send, retried without the continue URL, is rejected again', async () => {
    const user = fakeUser(false);
    fb.createUserWithEmailAndPassword.mockResolvedValue({ user });
    fb.sendEmailVerification.mockRejectedValue(authError('auth/unauthorized-continue-uri'));
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});

    await expect(signUpWithEmail('a@b.test', 'secret1')).resolves.toEqual({ verificationSent: false });

    expect(fb.sendEmailVerification).toHaveBeenCalledTimes(2);
    expect(fb.sendEmailVerification.mock.calls[1]).toEqual([user]);
    expect(log).toHaveBeenCalledOnce();
    expect(log.mock.calls[0].join(' ')).toContain('auth/unauthorized-continue-uri');
  });

  it.each(['auth/unauthorized-continue-uri', 'auth/invalid-continue-uri'])(
    'says it was sent when the continue URL is refused (%s) and the send without it goes through',
    async (code) => {
      const user = fakeUser(false);
      fb.createUserWithEmailAndPassword.mockResolvedValue({ user });
      fb.sendEmailVerification.mockRejectedValueOnce(authError(code)).mockResolvedValueOnce(undefined);

      await expect(signUpWithEmail('a@b.test', 'secret1')).resolves.toEqual({ verificationSent: true });

      expect(fb.sendEmailVerification).toHaveBeenCalledTimes(2);
      expect(fb.sendEmailVerification.mock.calls[0]).toEqual([user, CONTINUE]);
      expect(fb.sendEmailVerification.mock.calls[1]).toEqual([user]);
    },
  );

  it('rejects with the error when the account cannot be created, and sends no email', async () => {
    const error = authError('auth/email-already-in-use');
    fb.createUserWithEmailAndPassword.mockRejectedValue(error);

    await expect(signUpWithEmail('a@b.test', 'secret1')).rejects.toBe(error);

    expect(fb.sendEmailVerification).not.toHaveBeenCalled();
  });
});

describe('sendVerificationEmail', () => {
  it('rejects, calling nothing, when nobody is signed in', async () => {
    await expect(sendVerificationEmail()).rejects.toThrow();
    expect(fb.sendEmailVerification).not.toHaveBeenCalled();
  });

  it('sends the email to the signed-in user', async () => {
    const user = fakeUser(false);
    fb.auth.currentUser = user;
    fb.sendEmailVerification.mockResolvedValue(undefined);

    await sendVerificationEmail();

    expect(fb.sendEmailVerification).toHaveBeenCalledWith(user, CONTINUE);
  });

  it('rejects with the send error, without retrying it', async () => {
    fb.auth.currentUser = fakeUser(false);
    const error = authError('auth/too-many-requests');
    fb.sendEmailVerification.mockRejectedValue(error);

    await expect(sendVerificationEmail()).rejects.toBe(error);
    expect(fb.sendEmailVerification).toHaveBeenCalledOnce();
  });

  it.each(['auth/unauthorized-continue-uri', 'auth/invalid-continue-uri'])(
    'sends it again without the continue URL when Firebase refuses that URL (%s)',
    async (code) => {
      const user = fakeUser(false);
      fb.auth.currentUser = user;
      fb.sendEmailVerification.mockRejectedValueOnce(authError(code)).mockResolvedValueOnce(undefined);

      await expect(sendVerificationEmail()).resolves.toBeUndefined();

      expect(fb.sendEmailVerification).toHaveBeenCalledTimes(2);
      expect(fb.sendEmailVerification.mock.calls[0]).toEqual([user, CONTINUE]);
      expect(fb.sendEmailVerification.mock.calls[1]).toEqual([user]);
    },
  );

  it('rejects with the retry error when the send without the continue URL fails too, retrying only once', async () => {
    const user = fakeUser(false);
    fb.auth.currentUser = user;
    const retryError = authError('auth/invalid-continue-uri');
    fb.sendEmailVerification.mockRejectedValueOnce(authError('auth/invalid-continue-uri')).mockRejectedValueOnce(retryError);

    await expect(sendVerificationEmail()).rejects.toBe(retryError);
    expect(fb.sendEmailVerification).toHaveBeenCalledTimes(2);
  });
});

describe('setAuthLanguage', () => {
  it("sets the auth instance's language code to the app's language", () => {
    setAuthLanguage('hi');
    expect(fb.auth.languageCode).toBe('hi');

    setAuthLanguage('en');
    expect(fb.auth.languageCode).toBe('en');
  });
});

describe('FirebaseConfigError', () => {
  it('is named, so a log line can carry its cause class', () => {
    expect(new FirebaseConfigError('missing apiKey').name).toBe('FirebaseConfigError');
  });
});

describe('reloadEmailVerified', () => {
  it('reloads the user, then refreshes the ID token, and resolves true once verified', async () => {
    const user = fakeUser(true);
    fb.auth.currentUser = user;

    await expect(reloadEmailVerified()).resolves.toBe(true);

    expect(calls).toEqual(['reload', 'getIdToken(true)']);
  });

  it('resolves false, without refreshing the token, while still unverified', async () => {
    const user = fakeUser(false);
    fb.auth.currentUser = user;

    await expect(reloadEmailVerified()).resolves.toBe(false);

    expect(calls).toEqual(['reload']);
    expect(user.getIdToken).not.toHaveBeenCalled();
  });

  it('rejects when nobody is signed in', async () => {
    await expect(reloadEmailVerified()).rejects.toThrow();
    expect(calls).toEqual([]);
  });

  it('still resolves true once verified when the token refresh fails, logging only the cause', async () => {
    const user = fakeUser(true);
    const error = Object.assign(authError('auth/network-request-failed'), { customData: { email: 'a@b.test' } });
    user.getIdToken.mockRejectedValue(error);
    fb.auth.currentUser = user;
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});

    await expect(reloadEmailVerified()).resolves.toBe(true);

    expect(user.getIdToken).toHaveBeenCalledWith(true);
    expect(log).toHaveBeenCalledOnce();
    expect(log.mock.calls[0].join(' ')).toContain('auth/network-request-failed');
    // The code only: the error object can carry the address.
    expect(log.mock.calls[0]).not.toContain(error);
    expect(log.mock.calls[0].join(' ')).not.toContain('a@b.test');
  });

  it('rejects with the reload error', async () => {
    const user = fakeUser(true);
    const error = authError('auth/network-request-failed');
    user.reload.mockRejectedValue(error);
    fb.auth.currentUser = user;

    await expect(reloadEmailVerified()).rejects.toBe(error);
    expect(user.getIdToken).not.toHaveBeenCalled();
  });
});
