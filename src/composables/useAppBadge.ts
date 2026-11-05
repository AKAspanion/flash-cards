import { watch } from 'vue';
import { updateAppBadge } from '@/services/appBadge';
import { useLibraryStore } from '@/stores/library';
import { localDate } from '@/utils/dates';
import { dueCount } from '@/utils/srs';

/** Keeps the app icon badge showing the due-card count; call once from App.vue's setup. */
export function useAppBadge(): void {
  const library = useLibraryStore();
  watch(
    () => [library.status, library.sets] as const,
    ([status, sets]) => {
      if (status === 'ready') {
        void updateAppBadge(dueCount(sets, localDate()));
      } else if (status === 'idle') {
        // Signed out: leave no one's count on the device.
        void updateAppBadge(0);
      }
    },
    { immediate: true },
  );
}
