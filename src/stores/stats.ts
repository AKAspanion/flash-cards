import { computed, ref } from 'vue';
import { defineStore } from 'pinia';
import { DAILY_GOALS, DEFAULT_DAILY_GOAL } from '@/types';
import * as api from '@/services/firebase';
import i18n from '@/plugins/i18n';
import { localDate } from '@/utils/dates';
import { currentStreak, longestStreak as longestStreakOf } from '@/utils/streaks';
import { useSessionStore } from './session';

type Status = 'idle' | 'loading' | 'ready' | 'error';

/**
 * The signed-in user's daily goal and review history (`user-stats/{uid}`).
 * It resets on sign-out or a user switch, so the next account on the device
 * never sees the last one's counts. Writes follow the library store's rule:
 * awaited online, counted as done offline once they are in the local cache.
 */
export const useStatsStore = defineStore('stats', () => {
  const session = useSessionStore();

  const goal = ref<number>(DEFAULT_DAILY_GOAL);
  const days = ref<Record<string, number>>({});
  const status = ref<Status>('idle');
  let loadedFor: string | null = null;
  let loading: Promise<void> | null = null;
  let loadGeneration = 0;

  const todayCount = computed(() => days.value[localDate()] ?? 0);
  const streak = computed(() => currentStreak(days.value, localDate()));
  const longestStreak = computed(() => longestStreakOf(days.value));

  function load(force = false): Promise<void> {
    const uid = session.user?.uid ?? null;
    if (!uid) {
      reset();
      return Promise.resolve();
    }
    if (!force && loadedFor === uid && (status.value === 'ready' || loading)) {
      return loading ?? Promise.resolve();
    }
    loadedFor = uid;
    status.value = 'loading';
    const generation = ++loadGeneration;
    // A newer load (or reset, e.g. after a user switch) makes this one stale: ignore its result.
    const isCurrent = () => generation === loadGeneration;
    const request: Promise<void> = session
      .track(api.fetchUserStats())
      .then((stats) => {
        if (isCurrent()) {
          goal.value = stats.goal;
          days.value = stats.days;
          status.value = 'ready';
        }
      })
      .catch((err) => {
        if (isCurrent()) {
          status.value = 'error';
          session.showError(err, 'toast.error.load');
        }
      })
      .finally(() => {
        if (loading === request) {
          loading = null;
        }
      });
    loading = request;
    return request;
  }

  async function recordReviews(count: number): Promise<boolean> {
    if (count <= 0) {
      return true;
    }
    const day = localDate();
    const uid = session.user?.uid ?? null;
    try {
      const committed = api.addReviews(day, count);
      if ((await session.settleWrite(committed)) === 'offline') {
        // Offline, the write is in the local cache: count it now, reload if the server refuses it (spec 10.3, 10.4).
        committed.catch((err) => {
          console.error(err);
          session.showSnack(i18n.global.t('toast.error.stats'));
          void load(true);
        });
        days.value = { ...days.value, [day]: (days.value[day] ?? 0) + count };
        session.notifyOfflineSave();
        return true;
      }
    } catch (err) {
      console.error(err);
      session.showSnack(i18n.global.t('toast.error.stats'));
      return false;
    }
    // Skip the local update when the user changed while the write was in flight.
    if ((session.user?.uid ?? null) === uid) {
      days.value = { ...days.value, [day]: (days.value[day] ?? 0) + count };
    }
    return true;
  }

  async function setGoal(next: number): Promise<boolean> {
    if (!(DAILY_GOALS as readonly number[]).includes(next)) {
      return false;
    }
    const uid = session.user?.uid ?? null;
    try {
      const committed = api.saveDailyGoal(next);
      if ((await session.settleWrite(committed)) === 'offline') {
        committed.catch((err) => {
          session.showError(err, 'toast.error.save');
          void load(true);
        });
        goal.value = next;
        session.notifyOfflineSave();
        return true;
      }
    } catch (err) {
      session.showError(err, 'toast.error.save');
      return false;
    }
    if ((session.user?.uid ?? null) === uid) {
      goal.value = next;
    }
    return true;
  }

  function reset() {
    goal.value = DEFAULT_DAILY_GOAL;
    days.value = {};
    status.value = 'idle';
    loadedFor = null;
    loading = null;
    loadGeneration++;
  }

  return { goal, todayCount, streak, longestStreak, days, status, load, recordReviews, setGoal, reset };
});
