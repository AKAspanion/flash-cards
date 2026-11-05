import { defineStore } from 'pinia';
import i18n from '@/plugins/i18n';
import * as api from '@/services/firebase';
import { authErrorMessage, isAuthCancel } from '@/services/authErrors';
import { loadFresh } from '@/utils/freshLoad';
import { clearPendingDelete, writePendingDelete } from '@/utils/pendingDelete';
import { useLibraryStore } from './library';
import { useSessionStore } from './session';

/**
 * Signing out and deleting the signed-in user's account. Actions show their own error and resolve to false,
 * so the dialog only moves on once a step has really succeeded. Every step needs the server,
 * so offline each one is refused with the offline-save message (spec 10.5).
 */
export const useAccountStore = defineStore('account', () => {
  const session = useSessionStore();
  const library = useLibraryStore();

  function showAuthError(err: unknown) {
    console.error(err);
    session.showSnack(authErrorMessage(err, i18n.global.t));
  }

  /** True, after telling the user, when the device is offline. */
  function refuseOffline(): boolean {
    if (session.online) {
      return false;
    }
    session.showSnack(i18n.global.t('toast.offline-save'));
    return true;
  }

  async function confirmWithPassword(password: string): Promise<boolean> {
    if (refuseOffline()) {
      return false;
    }
    try {
      await session.track(api.reauthenticateWithPassword(password));
      return true;
    } catch (err) {
      showAuthError(err);
      return false;
    }
  }

  /** Leaves the page for Google; it comes back to /profile with the outcome in the session store. */
  async function confirmWithGoogle(): Promise<void> {
    const uid = session.user?.uid;
    if (!uid || refuseOffline()) {
      return;
    }
    writePendingDelete(sessionStorage, { uid, at: Date.now() });
    try {
      await api.reauthenticateWithGoogle();
    } catch (err) {
      clearPendingDelete(sessionStorage);
      if (!isAuthCancel(err)) {
        showAuthError(err);
      }
    }
  }

  async function deleteAccount(): Promise<boolean> {
    if (refuseOffline()) {
      return false;
    }
    session.signingOut = true;
    try {
      await session.track(api.deleteAccount());
    } catch (err) {
      session.signingOut = false;
      session.showError(err, 'account.delete.error');
      return false;
    }
    library.reset();
    // Deleting the account cleared the local cache and stopped Firestore, so start a new page.
    loadFresh('/login', i18n.global.t('account.delete.done'));
    return true;
  }

  /**
   * Signs out and clears the device's cache (spec 10.6), then loads /login afresh, since Firestore is
   * stopped. Resolves false, after saying why, when the user is still signed in: offline, or when
   * unsynced changes didn't reach the server before the deadline (nothing is cleared then).
   */
  async function signOut(): Promise<boolean> {
    // Offline, changes not yet synced would be cleared with the cache.
    if (!session.online) {
      session.showSnack(i18n.global.t('toast.offline-signout'));
      return false;
    }
    session.signingOut = true;
    try {
      await session.track(api.signOutAndClear());
    } catch (err) {
      if (await api.getAuthUser()) {
        // Nothing was cleared and the user is still signed in.
        session.signingOut = false;
        if ((err as { code?: string })?.code === 'deadline-exceeded') {
          console.error(err);
          session.showSnack(i18n.global.t('toast.offline-signout'));
        } else {
          session.showError(err);
        }
        return false;
      }
      // Signed out, but the cache may be left: say so on the new page.
      session.showError(err);
      loadFresh('/login', session.snack.text);
      return true;
    }
    loadFresh('/login');
    return true;
  }

  return { confirmWithPassword, confirmWithGoogle, deleteAccount, signOut };
});
