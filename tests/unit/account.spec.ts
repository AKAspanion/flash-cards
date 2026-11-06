import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';

const api = vi.hoisted(() => ({
  deleteAccount: vi.fn(),
  signOutAndClear: vi.fn(),
  getAuthUser: vi.fn(),
  reauthenticateWithPassword: vi.fn(),
  reauthenticateWithGoogle: vi.fn(),
  getRedirectOutcome: vi.fn(),
  sendVerificationEmail: vi.fn(),
  reloadEmailVerified: vi.fn(),
}));
vi.mock('@/services/firebase', () => api);

const fresh = vi.hoisted(() => ({ loadFresh: vi.fn(), takePendingSnack: vi.fn(() => null) }));
vi.mock('@/utils/freshLoad', () => fresh);

const { useAccountStore } = await import('@/stores/account');
const { useSessionStore } = await import('@/stores/session');

const OFFLINE_SAVE = "You're offline. Connect to the internet to save.";

beforeEach(() => {
  setActivePinia(createPinia());
  vi.clearAllMocks();
  sessionStorage.clear();
});

describe('account store offline', () => {
  beforeEach(() => {
    const session = useSessionStore();
    session.online = false;
    session.user = {
      uid: 'u1',
      email: 'a@example.test',
      displayName: '',
      photoURL: '',
      creationTime: '',
      lastSignInTime: '',
      emailVerified: false,
    };
  });

  it('deletes nothing and says why', async () => {
    expect(await useAccountStore().deleteAccount()).toBe(false);
    expect(api.deleteAccount).not.toHaveBeenCalled();
    expect(fresh.loadFresh).not.toHaveBeenCalled();
    expect(useSessionStore().snack.text).toBe(OFFLINE_SAVE);
  });

  it('does not ask for the password', async () => {
    expect(await useAccountStore().confirmWithPassword('secret')).toBe(false);
    expect(api.reauthenticateWithPassword).not.toHaveBeenCalled();
    expect(useSessionStore().snack.text).toBe(OFFLINE_SAVE);
  });

  it('does not leave for Google', async () => {
    await useAccountStore().confirmWithGoogle();
    expect(api.reauthenticateWithGoogle).not.toHaveBeenCalled();
    expect(useSessionStore().snack.text).toBe(OFFLINE_SAVE);
  });

  it('does not resend the verification email', async () => {
    expect(await useAccountStore().resendVerification()).toBe(false);
    expect(api.sendVerificationEmail).not.toHaveBeenCalled();
    expect(useSessionStore().snack.text).toBe(OFFLINE_SAVE);
  });

  it('does not check whether the email is verified', async () => {
    expect(await useAccountStore().checkVerified()).toBe(false);
    expect(api.reloadEmailVerified).not.toHaveBeenCalled();
    expect(useSessionStore().snack.text).toBe(OFFLINE_SAVE);
  });
});

describe('email verification', () => {
  function authError(code: string) {
    return Object.assign(new Error(`Firebase: Error (${code}).`), { code });
  }

  beforeEach(() => {
    useSessionStore().user = {
      uid: 'u1',
      email: 'a@example.test',
      displayName: '',
      photoURL: '',
      creationTime: '',
      lastSignInTime: '',
      emailVerified: false,
    };
  });

  it('resends the email and says it was sent', async () => {
    api.sendVerificationEmail.mockResolvedValue(undefined);
    expect(await useAccountStore().resendVerification()).toBe(true);
    expect(api.sendVerificationEmail).toHaveBeenCalledOnce();
    expect(useSessionStore().snack.text).toBe('Sent. Check your inbox.');
  });

  it('says to wait when Firebase refuses the resend as too many requests', async () => {
    api.sendVerificationEmail.mockRejectedValue(authError('auth/too-many-requests'));
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(await useAccountStore().resendVerification()).toBe(false);
    expect(log).toHaveBeenCalledOnce();
    log.mockRestore();
    expect(useSessionStore().snack.text).toBe('Too many attempts. Please wait a moment and try again.');
  });

  it('marks the user verified once Firebase says so', async () => {
    api.reloadEmailVerified.mockResolvedValue(true);
    expect(await useAccountStore().checkVerified()).toBe(true);
    expect(useSessionStore().user?.emailVerified).toBe(true);
    expect(useSessionStore().snack.text).toBe('Email verified.');
  });

  it('leaves the user unverified, and says to open the link first, while Firebase says not yet', async () => {
    api.reloadEmailVerified.mockResolvedValue(false);
    expect(await useAccountStore().checkVerified()).toBe(false);
    expect(useSessionStore().user?.emailVerified).toBe(false);
    expect(useSessionStore().snack.text).toBe('Not verified yet. Open the link in the email first.');
  });

  it('shows the network error when the check cannot reach Firebase', async () => {
    api.reloadEmailVerified.mockRejectedValue(authError('auth/network-request-failed'));
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(await useAccountStore().checkVerified()).toBe(false);
    expect(log).toHaveBeenCalledOnce();
    log.mockRestore();
    expect(useSessionStore().user?.emailVerified).toBe(false);
    expect(useSessionStore().snack.text).toBe('Network error. Check your connection and try again.');
  });

  describe('the quiet check', () => {
    it('marks the user verified, with no snack and no loading bar, once Firebase says so', async () => {
      let loadingWhileCalled: boolean | null = null;
      api.reloadEmailVerified.mockImplementation(async () => {
        loadingWhileCalled = useSessionStore().loading;
        return true;
      });
      expect(await useAccountStore().checkVerifiedQuietly()).toBe(true);
      expect(api.reloadEmailVerified).toHaveBeenCalledOnce();
      expect(loadingWhileCalled).toBe(false);
      expect(useSessionStore().user?.emailVerified).toBe(true);
      expect(useSessionStore().snack.text).toBe('');
    });

    it('resolves false, with no snack, while Firebase says not yet', async () => {
      api.reloadEmailVerified.mockResolvedValue(false);
      expect(await useAccountStore().checkVerifiedQuietly()).toBe(false);
      expect(useSessionStore().user?.emailVerified).toBe(false);
      expect(useSessionStore().snack.text).toBe('');
    });

    it('resolves false, logs, and shows no snack when the check cannot reach Firebase', async () => {
      api.reloadEmailVerified.mockRejectedValue(authError('auth/network-request-failed'));
      const log = vi.spyOn(console, 'error').mockImplementation(() => {});
      expect(await useAccountStore().checkVerifiedQuietly()).toBe(false);
      expect(log).toHaveBeenCalledOnce();
      log.mockRestore();
      expect(useSessionStore().user?.emailVerified).toBe(false);
      expect(useSessionStore().snack.text).toBe('');
    });

    it('offline, resolves false without calling Firebase or showing a snack', async () => {
      useSessionStore().online = false;
      expect(await useAccountStore().checkVerifiedQuietly()).toBe(false);
      expect(api.reloadEmailVerified).not.toHaveBeenCalled();
      expect(useSessionStore().snack.text).toBe('');
    });

    it('with no signed-in user, resolves false without calling Firebase', async () => {
      useSessionStore().user = null;
      expect(await useAccountStore().checkVerifiedQuietly()).toBe(false);
      expect(api.reloadEmailVerified).not.toHaveBeenCalled();
    });

    it('does not mark a new user verified when the check for the old one says verified', async () => {
      let finish!: (verified: boolean) => void;
      api.reloadEmailVerified.mockReturnValue(new Promise<boolean>((r) => (finish = r)));
      const check = useAccountStore().checkVerifiedQuietly();
      const session = useSessionStore();
      session.user = { ...session.user!, uid: 'u2', email: 'b@example.test', emailVerified: false };
      finish(true);

      expect(await check).toBe(false);
      expect(session.user?.uid).toBe('u2');
      expect(session.user?.emailVerified).toBe(false);
      expect(session.snack.text).toBe('');
    });
  });

  describe('when another user signs in while the call runs', () => {
    function deferred<T>() {
      let resolve!: (value: T) => void;
      let reject!: (err: unknown) => void;
      const promise = new Promise<T>((res, rej) => {
        resolve = res;
        reject = rej;
      });
      return { promise, resolve, reject };
    }

    /** Replaces the signed-in user, as the auth watcher does on a direct A-to-B switch. */
    function switchUser() {
      const session = useSessionStore();
      session.user = { ...session.user!, uid: 'u2', email: 'b@example.test', emailVerified: false };
    }

    it('does not mark the new user verified, and says nothing, when the check for the old one says verified', async () => {
      const pending = deferred<boolean>();
      api.reloadEmailVerified.mockReturnValue(pending.promise);
      const check = useAccountStore().checkVerified();
      switchUser();
      pending.resolve(true);

      expect(await check).toBe(false);
      const session = useSessionStore();
      expect(session.user?.uid).toBe('u2');
      expect(session.user?.emailVerified).toBe(false);
      expect(session.snack.text).toBe('');
    });

    it('says nothing when the check for the old user fails', async () => {
      const pending = deferred<boolean>();
      api.reloadEmailVerified.mockReturnValue(pending.promise);
      const log = vi.spyOn(console, 'error').mockImplementation(() => {});
      const check = useAccountStore().checkVerified();
      switchUser();
      pending.reject(authError('auth/network-request-failed'));

      expect(await check).toBe(false);
      log.mockRestore();
      expect(useSessionStore().snack.text).toBe('');
    });

    it('does not tell the new user an email was sent to them when the resend was for the old one', async () => {
      const pending = deferred<void>();
      api.sendVerificationEmail.mockReturnValue(pending.promise);
      const resend = useAccountStore().resendVerification();
      switchUser();
      pending.resolve();

      expect(await resend).toBe(false);
      const session = useSessionStore();
      expect(session.user?.emailVerified).toBe(false);
      expect(session.snack.text).toBe('');
    });
  });
});

describe('account store online', () => {
  it('loads /login afresh after the account is deleted, with the done message', async () => {
    api.deleteAccount.mockResolvedValue(undefined);
    expect(await useAccountStore().deleteAccount()).toBe(true);
    expect(api.deleteAccount).toHaveBeenCalledOnce();
    expect(fresh.loadFresh).toHaveBeenCalledWith('/login', 'Your account has been deleted.');
  });

  it('stays put and shows the error when the deletion fails', async () => {
    api.deleteAccount.mockRejectedValue(new Error(''));
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(await useAccountStore().deleteAccount()).toBe(false);
    expect(log).toHaveBeenCalledOnce();
    log.mockRestore();
    expect(fresh.loadFresh).not.toHaveBeenCalled();
    expect(useSessionStore().snack.text).toBe("Couldn't delete your account. Please try again.");
    expect(useSessionStore().signingOut).toBe(false);
  });

  it('marks the tab as signing out while the account is deleted, so the router leaves the reload to it', async () => {
    let seen: boolean | null = null;
    api.deleteAccount.mockImplementation(async () => {
      seen = useSessionStore().signingOut;
    });
    await useAccountStore().deleteAccount();
    expect(seen).toBe(true);
  });
});

describe('signing out', () => {
  const OFFLINE_SIGNOUT = "You're offline. Connect to the internet to sign out, so your changes aren't lost.";
  const signedIn = { uid: 'u1' };

  afterEach(() => vi.useRealTimers());

  it('offline, signs nothing out and says why', async () => {
    useSessionStore().online = false;
    expect(await useAccountStore().signOut()).toBe(false);
    expect(api.signOutAndClear).not.toHaveBeenCalled();
    expect(useSessionStore().snack.text).toBe(OFFLINE_SIGNOUT);
  });

  it('clears the cache, signs out and loads /login afresh, marking the tab as signing out meanwhile', async () => {
    let seen: boolean | null = null;
    api.signOutAndClear.mockImplementation(async () => {
      seen = useSessionStore().signingOut;
    });
    expect(await useAccountStore().signOut()).toBe(true);
    expect(seen).toBe(true);
    expect(fresh.loadFresh).toHaveBeenCalledWith('/login');
  });

  it('shows the busy bar and warns after 8 seconds while unsynced changes are waiting', async () => {
    vi.useFakeTimers();
    api.signOutAndClear.mockReturnValue(new Promise(() => {}));
    void useAccountStore().signOut();
    await vi.advanceTimersByTimeAsync(0);
    expect(useSessionStore().loading).toBe(true);
    await vi.advanceTimersByTimeAsync(8000);
    expect(useSessionStore().snack.text).toBe('Experiencing network difficulty, please hold on!');
  });

  it('past the deadline, stays signed in and says to connect to sign out', async () => {
    api.signOutAndClear.mockRejectedValue(Object.assign(new Error('timed out'), { code: 'deadline-exceeded' }));
    api.getAuthUser.mockResolvedValue(signedIn);
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(await useAccountStore().signOut()).toBe(false);
    expect(log).toHaveBeenCalledOnce();
    log.mockRestore();
    expect(fresh.loadFresh).not.toHaveBeenCalled();
    expect(useSessionStore().snack.text).toBe(OFFLINE_SIGNOUT);
    expect(useSessionStore().signingOut).toBe(false);
  });

  it('on any other failure while still signed in, shows the generic error, logs the cause, and stays', async () => {
    const err = new Error('user changed');
    api.signOutAndClear.mockRejectedValue(err);
    api.getAuthUser.mockResolvedValue(signedIn);
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(await useAccountStore().signOut()).toBe(false);
    expect(log).toHaveBeenCalledWith(err);
    log.mockRestore();
    expect(fresh.loadFresh).not.toHaveBeenCalled();
    expect(useSessionStore().snack.text).toBe('Something went wrong. Please try again.');
    expect(useSessionStore().signingOut).toBe(false);
  });

  it('signed out but with the cache left, loads /login afresh and says the sets may still be on this device', async () => {
    const err = new Error('cache in use');
    api.signOutAndClear.mockRejectedValue(err);
    api.getAuthUser.mockResolvedValue(null);
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(await useAccountStore().signOut()).toBe(true);
    expect(log).toHaveBeenCalledWith(err);
    log.mockRestore();
    expect(fresh.loadFresh).toHaveBeenCalledWith('/login', "You're signed out, but your sets may still be stored on this device.");
  });
});
