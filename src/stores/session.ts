import { computed, ref } from 'vue';
import { defineStore } from 'pinia';
import type { User } from 'firebase/auth';
import type { SessionUser } from '@/types';
import i18n from '@/plugins/i18n';

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
  };
}

export const useSessionStore = defineStore('session', () => {
  const user = ref<SessionUser | null>(null);
  const authLoading = ref(false);
  const pending = ref(0);
  const online = ref(typeof navigator === 'undefined' ? true : navigator.onLine);
  const snack = ref<Snack>({ show: false, text: '', actionText: '', onAction: null });
  /** True while a page holds edits that are not saved yet (blocks app-update reloads). */
  const unsavedChanges = ref(false);

  const loading = computed(() => authLoading.value || pending.value > 0);

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

  return {
    user,
    authLoading,
    pending,
    online,
    snack,
    unsavedChanges,
    loading,
    setUser,
    patchUser,
    showSnack,
    dismissSnack,
    showError,
    track,
  };
});
