import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';

const api = vi.hoisted(() => ({
  deleteAccount: vi.fn(),
  signOutAndClear: vi.fn(),
  getAuthUser: vi.fn(),
  reauthenticateWithPassword: vi.fn(),
  reauthenticateWithGoogle: vi.fn(),
  getRedirectOutcome: vi.fn(),
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
    session.user = { uid: 'u1', email: 'a@example.test', displayName: '', photoURL: '', creationTime: '', lastSignInTime: '' };
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

  it('on any other failure while still signed in, shows the error and stays', async () => {
    api.signOutAndClear.mockRejectedValue(new Error('user changed'));
    api.getAuthUser.mockResolvedValue(signedIn);
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(await useAccountStore().signOut()).toBe(false);
    log.mockRestore();
    expect(fresh.loadFresh).not.toHaveBeenCalled();
    expect(useSessionStore().snack.text).toBe('user changed');
    expect(useSessionStore().signingOut).toBe(false);
  });

  it('signed out but with the cache left, loads /login afresh and says why there', async () => {
    api.signOutAndClear.mockRejectedValue(new Error('cache in use'));
    api.getAuthUser.mockResolvedValue(null);
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(await useAccountStore().signOut()).toBe(true);
    log.mockRestore();
    expect(fresh.loadFresh).toHaveBeenCalledWith('/login', 'cache in use');
  });
});
