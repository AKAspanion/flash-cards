// Runs in a daylight-saving time zone so the addDays DST case is meaningful.
process.env.TZ = 'Europe/London';

import { describe, expect, it } from 'vitest';
import { addDays, localDate } from '@/utils/dates';

describe('localDate', () => {
  it('uses the device time zone, not UTC', () => {
    expect(localDate(new Date(2026, 10, 2, 23, 30))).toBe('2026-11-02');
    // 00:30 local on 2026-06-01 (BST) is still 2026-05-31 in UTC.
    expect(localDate(new Date(2026, 5, 1, 0, 30))).toBe('2026-06-01');
  });

  it('defaults to now', () => {
    expect(localDate()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe('addDays', () => {
  it('crosses month and year ends', () => {
    expect(addDays('2026-02-28', 1)).toBe('2026-03-01');
    expect(addDays('2026-01-01', -1)).toBe('2025-12-31');
  });

  it('crosses a daylight-saving change', () => {
    expect(addDays('2026-03-28', 2)).toBe('2026-03-30');
    expect(addDays('2026-10-24', 2)).toBe('2026-10-26');
  });
});
