import { addDays } from '@/utils/dates';

type Days = Record<string, number>;

const reviewed = (days: Days, day: string): boolean => (days[day] ?? 0) >= 1;

/** Consecutive reviewed days ending today, or ending yesterday when today has none yet. */
export function currentStreak(days: Days, today: string): number {
  let day = reviewed(days, today) ? today : addDays(today, -1);
  let streak = 0;
  while (reviewed(days, day)) {
    streak++;
    day = addDays(day, -1);
  }
  return streak;
}

/** The longest run of consecutive reviewed days anywhere in the history. */
export function longestStreak(days: Days): number {
  const sorted = Object.keys(days)
    .filter((day) => reviewed(days, day))
    .sort();
  let longest = 0;
  let run = 0;
  let previous = '';
  for (const day of sorted) {
    run = previous && addDays(previous, 1) === day ? run + 1 : 1;
    longest = Math.max(longest, run);
    previous = day;
  }
  return longest;
}

/** The last `count` days, oldest first and ending today; days with no entry count 0. */
export function lastDays(days: Days, today: string, count: number): { day: string; count: number }[] {
  const out: { day: string; count: number }[] = [];
  for (let i = count - 1; i >= 0; i--) {
    const day = addDays(today, -i);
    out.push({ day, count: days[day] ?? 0 });
  }
  return out;
}

export function totalReviewed(days: Days): number {
  return Object.values(days).reduce((sum, n) => sum + n, 0);
}
