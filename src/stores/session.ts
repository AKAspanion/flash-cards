import { computed, ref, watch } from 'vue';
import { defineStore } from 'pinia';
import type { User } from 'firebase/auth';
import type { SessionUser } from '@/types';
import i18n from '@/plugins/i18n';
import { getRedirectOutcome, type RedirectOutcome } from '@/services/firebase';
import { takePendingSnack } from '@/utils/freshLoad';

const SLOW_NETWORK_MS = 8000;

export interface Snack {
  show: boolean;
  text: string;
  actionText: string;
  onAction: (() => void) | null;
}

export function toSessionUser(user: User): SessionUser {
  return {
    uid: user.uid,
    email: user.email ?? '',
    displayName: user.displayName ?? '',
    photoURL: user.photoURL ?? '',
    creationTime: user.metadata.creationTime ?? '',
    lastSignInTime: user.metadata.lastSignInTime ?? '',
    emailVerified: user.emailVerified,
  };
}

export const useSessionStore = defineStore('session', () => {
  const user = ref<SessionUser | null>(null);
  const authLoading = ref(false);
  const pending = ref(0);
  const online = ref(typeof navigator === 'undefined' ? true : navigator.onLine);
  // A fresh page load (after sign-out or account deletion) can leave a message for this page.
  const pendingSnack = typeof sessionStorage === 'undefined' ? null : takePendingSnack(sessionStorage);
  const snack = ref<Snack>({ show: !!pendingSnack, text: pendingSnack ?? '', actionText: '', onAction: null });
  /** True while a page holds edits that are not saved yet (blocks app-update reloads). */
  const unsavedChanges = ref(false);
  /**
   * True while this tab signs out or deletes the account. It loads /login afresh itself once its
   * cache is cleared, so the router's own reload on sign-out must not cut that short.
   */
  const signingOut = ref(false);

  /** What the Google redirect that brought the user back ended in, read once at start-up. */
  const redirectOutcome = ref<RedirectOutcome | null>(null);

  /** True once the redirect outcome has been read, even when there was none. */
  const redirectOutcomeLoaded = ref(false);

  const loading = computed(() => authLoading.value || pending.value > 0);

  async function loadRedirectOutcome() {
    try {
      redirectOutcome.value = await getRedirectOutcome();
    } catch (error) {
      redirectOutcome.value = { error };
    } finally {
      redirectOutcomeLoaded.value = true;
    }
  }

  function setUser(next: User | null) {
    user.value = next ? toSessionUser(next) : null;
  }

  function patchUser(patch: Partial<SessionUser>) {
    if (user.value) {
      user.value = { ...user.value, ...patch };
    }
  }

  function showSnack(text: string, action?: { text: string; onAction: () => void }) {
    snack.value = {
      show: true,
      text,
      actionText: action?.text ?? '',
      onAction: action?.onAction ?? null,
    };
  }

  /** Hides the snack if it is still the one carrying `onAction` (e.g. an Undo for a page being left). */
  function dismissSnack(onAction: () => void) {
    if (snack.value.onAction === onAction) {
      snack.value = { ...snack.value, show: false, onAction: null };
    }
  }

  function showError(err: unknown, fallbackKey = 'toast.error.generic') {
    console.error(err);
    const message = (err as Error)?.message;
    showSnack(message || i18n.global.t(fallbackKey));
  }

  /** True once this offline period has shown the offline-saved snack; going online clears it. */
  let offlineSaveNotified = false;
  watch(
    online,
    (isOnline) => {
      if (isOnline) {
        offlineSaveNotified = false;
      }
    },
    { flush: 'sync' },
  );

  /** Tells the user, once per offline period, that saves stay on the device until it reconnects. */
  function notifyOfflineSave() {
    if (offlineSaveNotified) {
      return;
    }
    offlineSaveNotified = true;
    showSnack(i18n.global.t('toast.offline-saved'));
  }

  /** Marks the app busy while `promise` runs and warns once if it is slow. */
  async function track<T>(promise: Promise<T>): Promise<T> {
    pending.value++;
    const slowTimer = setTimeout(() => showSnack(i18n.global.t('toast.slow-network')), SLOW_NETWORK_MS);
    try {
      return await promise;
    } finally {
      clearTimeout(slowTimer);
      pending.value--;
    }
  }

  /**
   * Waits, through `track`, for a write the local cache already holds to reach the server. Resolves
   * 'offline' instead, without waiting, when the device is offline or goes offline meanwhile: the
   * write then counts as done (spec 10.3), and the caller handles a later refusal itself.
   */
  async function settleWrite(committed: Promise<unknown>): Promise<'saved' | 'offline'> {
    if (!online.value) {
      return 'offline';
    }
    let stopWatching = () => {};
    const wentOffline = new Promise<'offline'>((resolve) => {
      stopWatching = watch(
        online,
        (isOnline) => {
          if (!isOnline) {
            resolve('offline');
          }
        },
        { flush: 'sync' },
      );
    });
    try {
      return await track(Promise.race([committed.then(() => 'saved' as const), wentOffline]));
    } finally {
      stopWatching();
    }
  }

  return {
    user,
    authLoading,
    pending,
    online,
    snack,
    unsavedChanges,
    signingOut,
    redirectOutcome,
    redirectOutcomeLoaded,
    loading,
    loadRedirectOutcome,
    setUser,
    patchUser,
    showSnack,
    dismissSnack,
    showError,
    notifyOfflineSave,
    track,
    settleWrite,
  };
});
