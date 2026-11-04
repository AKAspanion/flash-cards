import { defineStore } from 'pinia';
import i18n from '@/plugins/i18n';
import * as api from '@/services/firebase';
import { authErrorMessage, isAuthCancel } from '@/services/authErrors';
import { clearPendingDelete, writePendingDelete } from '@/utils/pendingDelete';
import { useLibraryStore } from './library';
import { useSessionStore } from './session';

/**
 * Deleting the signed-in user's account. Actions show their own error and resolve to false,
 * so the dialog only moves on once a step has really succeeded.
 */
export const useAccountStore = defineStore('account', () => {
  const session = useSessionStore();
  const library = useLibraryStore();

  function showAuthError(err: unknown) {
    console.error(err);
    session.showSnack(authErrorMessage(err, i18n.global.t));
  }

  async function confirmWithPassword(password: string): Promise<boolean> {
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
    if (!uid) {
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
    try {
      await session.track(api.deleteAccount());
      library.reset();
      session.showSnack(i18n.global.t('account.delete.done'));
      return true;
    } catch (err) {
      session.showError(err, 'account.delete.error');
      return false;
    }
  }

  return { confirmWithPassword, confirmWithGoogle, deleteAccount };
});
