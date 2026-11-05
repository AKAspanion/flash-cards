import type { DocumentData } from 'firebase/firestore';
import { DAILY_GOALS, DEFAULT_DAILY_GOAL, type UserStats } from '@/types';

const DAY_KEY = /^\d{4}-\d{2}-\d{2}$/;

/** Reads a stored `user-stats` document, keeping only values the app can trust. */
export function statsFromDoc(data: DocumentData | undefined): UserStats {
  const goal = DAILY_GOALS.find((g) => g === data?.goal) ?? DEFAULT_DAILY_GOAL;
  const stored: unknown = data && Object.hasOwn(data, 'days') ? data.days : undefined;
  const days: Record<string, number> = {};
  if (stored && typeof stored === 'object' && !Array.isArray(stored)) {
    for (const key of Object.keys(stored)) {
      const count = (stored as Record<string, unknown>)[key];
      if (DAY_KEY.test(key) && typeof count === 'number' && Number.isFinite(count) && count >= 0) {
        days[key] = count;
      }
    }
  }
  return { goal, days };
}
