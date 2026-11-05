import { describe, expect, it } from 'vitest';
import { currentStreak, lastDays, longestStreak, totalReviewed } from '@/utils/streaks';

describe('currentStreak', () => {
  it('counts consecutive days ending today', () => {
    const days = { '2026-10-31': 2, '2026-11-01': 1, '2026-11-02': 5 };
    expect(currentStreak(days, '2026-11-02')).toBe(3);
  });
  it('ends yesterday when nothing is reviewed today', () => {
    expect(currentStreak({ '2026-10-31': 2, '2026-11-01': 1 }, '2026-11-02')).toBe(2);
  });
  it('is 0 when the last review is older than yesterday', () => {
    expect(currentStreak({ '2026-10-31': 2 }, '2026-11-02')).toBe(0);
  });
  it('does not count a day with 0 reviews', () => {
    expect(currentStreak({ '2026-11-01': 0, '2026-11-02': 3 }, '2026-11-02')).toBe(1);
  });
  it('is 0 for no days', () => {
    expect(currentStreak({}, '2026-11-02')).toBe(0);
  });
});

describe('longestStreak', () => {
  const run = (skip?: string) => {
    const days: Record<string, number> = {};
    for (const d of ['2026-02-27', '2026-02-28', '2026-03-01', '2026-03-02']) {
      if (d !== skip) days[d] = 1;
    }
    return days;
  };
  it('is 0 for no days', () => {
    expect(longestStreak({})).toBe(0);
  });
  it('crosses the month end', () => {
    expect(longestStreak(run())).toBe(4);
  });
  it('splits at a gap', () => {
    expect(longestStreak(run('2026-02-28'))).toBe(2);
  });
  it('finds the longest of several runs', () => {
    const days = { '2026-10-01': 1, '2026-10-02': 1, '2026-10-03': 1, '2026-11-02': 1 };
    expect(longestStreak(days)).toBe(3);
  });
});

describe('lastDays and totalReviewed', () => {
  const days = { '2026-11-02': 5, '2026-10-04': 2, '2026-10-03': 9 };
  it('returns count days oldest first, ending today, 0 for missing', () => {
    const out = lastDays(days, '2026-11-02', 30);
    expect(out).toHaveLength(30);
    expect(out[0]).toEqual({ day: '2026-10-04', count: 2 });
    expect(out[29]).toEqual({ day: '2026-11-02', count: 5 });
    expect(out[1]).toEqual({ day: '2026-10-05', count: 0 });
    expect(out.some((e) => e.day === '2026-10-03')).toBe(false);
  });
  it('sums every day', () => {
    expect(totalReviewed(days)).toBe(16);
    expect(totalReviewed({})).toBe(0);
  });
});
