import { watch } from 'vue';
import { registerSW } from 'virtual:pwa-register';
import { useSessionStore } from '@/stores/session';

/**
 * Applies a new deploy as soon as it is safe: immediately when nothing is
 * being edited, otherwise once the user has saved or left the editor.
 */
export function setupPwaUpdates() {
  const session = useSessionStore();
  let updateReady = false;

  const updateSW = registerSW({
    immediate: true,
    onNeedRefresh() {
      updateReady = true;
      applyIfSafe();
    },
  });

  function applyIfSafe() {
    if (updateReady && !session.unsavedChanges) {
      updateReady = false;
      void updateSW(true);
    }
  }

  watch(() => session.unsavedChanges, applyIfSafe);
}
